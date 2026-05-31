// tutorial.js — 新手引导遮罩
import { CANVAS_W, CANVAS_H, SCALE } from './data.js';

const STORAGE_KEY = 'tideHunter_tutorial_seen';

export function hasSeenTutorial() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { return true; }
}

export function markTutorialSeen() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* ignore */ }
}

export function drawTutorial(ctx) {
  const s = SCALE;
  const W = CANVAS_W * s;
  const H = CANVAS_H * s;

  // 半透明遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);

  // 白色面板（加高到480避免底部重叠）
  const pw = 580;
  const ph = 480;
  const px = (W - pw) / 2;
  const py = (H - ph) / 2 - 20;
  ctx.fillStyle = '#f5f0e0';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#b8a090';
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);

  // 标题
  ctx.fillStyle = '#2d2010';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('🌊 潮汐猎人 — 操作指南', px + pw / 2, py + 36);

  // 内容（行距20px，16行=320px，给足空间）
  const lines = [
    { t: '海滩操作', c: '#c04030' },
    { t: 'WASD    移动          Shift   奔跑', c: '#2d2010' },
    { t: 'E       采集/互动     Tab/B   打开背包', c: '#2d2010' },
    { t: '鼠标点击 采集（需靠近目标）', c: '#2d2010' },
    { t: 'Esc     返回岸边安全区', c: '#2d2010' },
    { t: '', c: '#2d2010' },
    { t: '村庄操作', c: '#c04030' },
    { t: 'Q/W/E/R/T  切换建筑（鱼市/水族箱/博物馆/工坊/海图）', c: '#2d2010' },
    { t: 'S          出售选中    X          全部出售', c: '#2d2010' },
    { t: '方向键      选择      空格/回车   出海赶潮', c: '#2d2010' },
    { t: '', c: '#2d2010' },
    { t: '背包操作（海滩按Tab）', c: '#c04030' },
    { t: '方向键  选择物品    S  出售    A  水族箱    M  博物馆', c: '#2d2010' },
    { t: '', c: '#666' },
    { t: '收集物可出售赚钱、放入水族箱养殖、或捐给博物馆', c: '#888' },
    { t: '博物馆展区完成可触发「致伟大的海洋」获永久遗产', c: '#888' },
  ];

  let y = py + 62;
  for (const line of lines) {
    ctx.fillStyle = line.c;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(line.t, px + pw / 2, y);
    y += 22;
  }

  // 关闭提示（增加间距）
  ctx.fillStyle = '#c04030';
  ctx.font = 'bold 16px monospace';
  const closeY = py + ph - 18;
  ctx.fillText('按 空格键 开始游戏', px + pw / 2, closeY);
}
