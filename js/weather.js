// weather.js — 天气系统（雨滴粒子、闪电效果）
import { WEATHER_TABLE } from './data.js';

export class WeatherSystem {
  constructor(weatherKey = 'sunny') {
    this.current = WEATHER_TABLE[weatherKey] || WEATHER_TABLE['sunny'];
    this.currentKey = weatherKey;
    this.rainDrops = [];
    this.flashCooldown = 5 + Math.random() * 10;
    this.flashTimer = 0;
  }

  setWeather(key) {
    this.current = WEATHER_TABLE[key] || WEATHER_TABLE['sunny'];
    this.currentKey = key;
    this.rainDrops = [];
  }

  update(dt, canvasW, canvasH) {
    // 雨滴生成
    if (this.currentKey === 'drizzle' || this.currentKey === 'storm') {
      const rate = this.currentKey === 'storm' ? 50 : 18;
      const toSpawn = Math.floor(rate * dt);
      for (let i = 0; i < toSpawn; i++) {
        this.rainDrops.push({
          x: Math.random() * canvasW,
          y: -5,
          speed: 180 + Math.random() * 120,
          length: this.currentKey === 'storm' ? 10 + Math.random() * 4 : 6 + Math.random() * 2,
          alpha: 0.15 + Math.random() * 0.15,
        });
      }
    }
    // 更新雨滴位置
    for (let i = this.rainDrops.length - 1; i >= 0; i--) {
      const d = this.rainDrops[i];
      d.y += d.speed * dt;
      d.x -= 30 * dt; // 斜风
      if (d.y > canvasH + 10) this.rainDrops.splice(i, 1);
    }
    // 暴雨闪电
    if (this.currentKey === 'storm') {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.flashTimer = this.flashCooldown;
        this.flashCooldown = 5 + Math.random() * 15;
        return true; // 触发闪电
      }
    }
    return false;
  }

  drawRain(ctx, scale = 2) {
    if (this.rainDrops.length === 0) return;
    for (const d of this.rainDrops) {
      ctx.strokeStyle = `rgba(200,220,255,${d.alpha})`;
      ctx.lineWidth = this.currentKey === 'storm' ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(d.x * scale, d.y * scale);
      ctx.lineTo((d.x + d.length * 0.5) * scale, (d.y + d.length) * scale);
      ctx.stroke();
    }
  }
}
