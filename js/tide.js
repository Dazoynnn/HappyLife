// tide.js — 潮汐系统

import { TIDE_PHASE } from './data.js';

export class TideSystem {
  constructor(totalDuration = 240) {
    // 一个完整潮汐周期：240 秒 = 4 分钟
    this.totalDuration = totalDuration;
    this.elapsed = 0;           // 从退潮开始经过的秒数
    this.level = 1.0;           // 0=完全退潮, 1=完全满潮
    this.phase = TIDE_PHASE.EBBING;
    this.isActive = false;      // 是否在出海状态
    this.paused = false;

    // 月相影响
    this.tideRange = 1.0;       // 1.0=正常, >1=大潮(退更远), <1=小潮

    // 安全返回线（已淹到哪一行 tile）
    this.waterLineTile = 20;    // 水位线 tile 行号
  }

  start() {
    // 从退潮中期开始（跳过满潮），让海滩可见
    this.elapsed = this.totalDuration * 0.03;
    this.isActive = true;
    this.paused = false;
    this.updateLevel();
  }

  stop() {
    this.isActive = false;
  }

  setMoonEffect(range) {
    this.tideRange = range;
  }

  update(dt) {
    if (!this.isActive || this.paused) return;
    this.elapsed += dt;
    this.updateLevel();
  }

  updateLevel() {
    // 模拟真实的潮汐曲线（不对称正弦波）
    const progress = Math.min(1, this.elapsed / this.totalDuration);

    // 使用修改后的正弦波：退潮快，低潮长，涨潮先慢后快
    // 前半周期（0-0.55）：退潮 + 低潮
    // 后半周期（0.55-1.0）：涨潮
    let normalizedLevel;

    if (progress < 0.15) {
      // 退潮中：从满潮快速退到低潮
      normalizedLevel = 1.0 - (progress / 0.15) * 0.95;
    } else if (progress < 0.55) {
      // 低潮期：几乎最低
      normalizedLevel = 0.05 + Math.sin((progress - 0.15) / 0.4 * Math.PI) * 0.05;
    } else if (progress < 0.75) {
      // 涨潮初期：缓慢上涨
      normalizedLevel = 0.05 + ((progress - 0.55) / 0.2) * 0.25;
    } else if (progress < 0.9) {
      // 涨潮加速
      normalizedLevel = 0.3 + ((progress - 0.75) / 0.15) * 0.5;
    } else {
      // 满潮
      normalizedLevel = 0.8 + ((progress - 0.9) / 0.1) * 0.2;
    }

    // 月相修正
    this.level = Math.max(0, Math.min(1, normalizedLevel * this.tideRange));

    // 更新水位线
    this.waterLineTile = Math.floor(3 + this.level * 17);

    // 更新阶段
    if (progress < 0.15) this.phase = TIDE_PHASE.EBBING;
    else if (progress < 0.55) this.phase = TIDE_PHASE.LOW;
    else if (progress < 0.75) this.phase = TIDE_PHASE.FLOODING;
    else if (progress < 0.9) this.phase = TIDE_PHASE.RUSHING;
    else this.phase = TIDE_PHASE.PEAK;
  }

  get progress() {
    return Math.min(1, this.elapsed / this.totalDuration);
  }

  get remainingSeconds() {
    return Math.max(0, this.totalDuration - this.elapsed);
  }

  get timeString() {
    const sec = Math.floor(this.remainingSeconds);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  get isDangerous() {
    return this.phase === TIDE_PHASE.RUSHING || this.phase === TIDE_PHASE.PEAK;
  }

  get dangerLevel() {
    // 0-1 危险程度
    const p = this.progress;
    if (p < 0.55) return 0;
    if (p < 0.75) return (p - 0.55) / 0.2 * 0.3;
    if (p < 0.9) return 0.3 + (p - 0.75) / 0.15 * 0.5;
    return 0.8 + (p - 0.9) / 0.1 * 0.2;
  }

  get phaseText() {
    switch (this.phase) {
      case TIDE_PHASE.EBBING: return '退潮中';
      case TIDE_PHASE.LOW: return '低潮';
      case TIDE_PHASE.FLOODING: return '涨潮中';
      case TIDE_PHASE.RUSHING: return '快速涨潮！';
      case TIDE_PHASE.PEAK: return '满潮！快返回！';
      default: return '';
    }
  }

  get phaseColor() {
    switch (this.phase) {
      case TIDE_PHASE.EBBING: return '#7ec8d8';
      case TIDE_PHASE.LOW: return '#4a9eb0';
      case TIDE_PHASE.FLOODING: return '#2d6e82';
      case TIDE_PHASE.RUSHING: return '#c08030';
      case TIDE_PHASE.PEAK: return '#c04030';
      default: return '#7ec8d8';
    }
  }
}
