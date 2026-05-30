// sprites.js — 程序化像素精灵生成
// 所有游戏图形均由 Canvas API 在运行时生成，无需外部素材

import { COLORS, TILE_SIZE } from './data.js';

// 缓存已生成的 sprite canvas
const cache = new Map();

function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

// ============ 地面 Tile 生成 ============

export function genTileDrySand(variant = 0) {
  const key = `dry_sand_${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d');
  ctx.fillStyle = COLORS.sand_dry;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // 随机沙粒纹理
  const seed = variant * 137 + 42;
  for (let i = 0; i < 20; i++) {
    const sx = ((seed + i * 73) % TILE_SIZE);
    const sy = ((seed + i * 47 + 11) % TILE_SIZE);
    const shade = ((seed + i * 31) % 3);
    const color = shade === 0 ? COLORS.sand_dry_light : shade === 1 ? COLORS.sand_dry_dark : COLORS.sand_dry;
    px(ctx, sx, sy, color);
  }
  // 贝壳碎片 (variants 1,2)
  if (variant === 1) {
    px(ctx, 5, 11, '#f0ece0'); px(ctx, 6, 11, '#f0ece0');
  }
  if (variant === 2) {
    // 风纹
    for (let x = 2; x < 14; x += 4) {
      px(ctx, x, 7, COLORS.sand_dry_dark);
    }
  }
  cache.set(key, c);
  return c;
}

export function genTileWetSand(variant = 0) {
  const key = `wet_sand_${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d');
  ctx.fillStyle = COLORS.sand_wet;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  const seed = variant * 251 + 17;
  for (let i = 0; i < 15; i++) {
    const sx = ((seed + i * 67) % TILE_SIZE);
    const sy = ((seed + i * 43 + 5) % TILE_SIZE);
    px(ctx, sx, sy, i % 3 === 0 ? COLORS.sand_wet_dark : COLORS.sand_dry_dark);
  }
  // 小水坑
  if (variant === 1) {
    ctx.fillStyle = '#7ec8d888';
    ctx.fillRect(6, 10, 4, 2);
  }
  // 水纹线
  if (variant === 2) {
    for (let x = 0; x < TILE_SIZE; x += 3) {
      px(ctx, x, 5, COLORS.sand_wet_dark);
    }
  }
  cache.set(key, c);
  return c;
}

export function genTileWater(depth) {
  const key = `water_${depth}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d');
  const colors = [COLORS.water_shallow, COLORS.water_mid, COLORS.water_deep, COLORS.water_abyss];
  ctx.fillStyle = colors[Math.min(depth, colors.length - 1)];
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // 水面波纹
  if (depth === 0) {
    for (let x = 0; x < TILE_SIZE; x += 4) {
      px(ctx, x, 2 + (x % 3), '#ffffff40');
    }
    // 透出沙底
    ctx.fillStyle = '#e8d5a340';
    ctx.fillRect(0, 8, TILE_SIZE, 8);
  }
  if (depth === 1) {
    for (let x = 0; x < TILE_SIZE; x += 6) {
      px(ctx, x, 7, '#ffffff25');
    }
  }
  cache.set(key, c);
  return c;
}

export function genTileRock(w, h, variant = 0) {
  const key = `rock_${w}x${h}_${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = COLORS.rock;
  ctx.fillRect(0, 0, w, h);
  // 不规则边缘
  const seed = variant * 89 + 31;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = ((seed + x * 7 + y * 13) % 10);
      if (n < 2) px(ctx, x, y, COLORS.rock_light);
      else if (n > 7) px(ctx, x, y, COLORS.rock_dark);
    }
  }
  // 裂缝
  const cx = 2 + (seed % (w - 4));
  for (let y = 1; y < h - 1; y++) {
    px(ctx, cx + (y % 3) - 1, y, COLORS.rock_dark);
  }
  // 藤壶
  if (variant === 0 && w >= 2) {
    ctx.fillStyle = '#d4d4c8';
    ctx.fillRect(1, 1, 2, 2);
    ctx.fillRect(w - 3, h - 3, 2, 2);
  }
  cache.set(key, c);
  return c;
}

// ============ 角色精灵生成 ============
// 所有角色动画帧都在这里生成，俯视视角

function drawCharacterBase(ctx, ox, oy, leanX = 0, leanY = 0) {
  const x = ox + leanX;
  const y = oy + leanY;
  // 竹篓 (在身体下面，因为俯视——实际在身后)
  ctx.fillStyle = COLORS.bamboo;
  ctx.fillRect(x + 5, y + 12, 10, 10);
  ctx.fillStyle = COLORS.bamboo_dark;
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + 6, y + 13 + i * 2, 8, 1);
  }
  // 身体
  ctx.fillStyle = COLORS.cloth;
  ctx.fillRect(x + 6, y + 8, 8, 7);
  ctx.fillStyle = COLORS.cloth_dark;
  ctx.fillRect(x + 7, y + 9, 6, 5);
  // 手臂
  ctx.fillStyle = COLORS.skin;
  ctx.fillRect(x + 3, y + 9, 3, 4);  // 左臂
  ctx.fillRect(x + 14, y + 9, 3, 4); // 右臂
  // 腿/脚
  ctx.fillStyle = COLORS.cloth;
  ctx.fillRect(x + 7, y + 15, 2, 3);  // 左裤腿
  ctx.fillRect(x + 11, y + 15, 2, 3); // 右裤腿
  ctx.fillStyle = COLORS.skin;
  ctx.fillRect(x + 7, y + 17, 2, 2);  // 左脚
  ctx.fillRect(x + 11, y + 17, 2, 2); // 右脚
  // 斗笠 (顶部)
  ctx.fillStyle = COLORS.hat;
  ctx.fillRect(x + 2, y + 3, 16, 6);
  ctx.fillStyle = COLORS.hat_dark;
  ctx.fillRect(x + 3, y + 4, 14, 4);
  // 斗笠顶部凸起
  ctx.fillStyle = COLORS.hat_dark;
  ctx.fillRect(x + 8, y + 1, 4, 3);
  ctx.fillStyle = COLORS.hat;
  ctx.fillRect(x + 9, y + 1, 2, 2);
  // 头部 (斗笠下)
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(x + 7, y + 8, 6, 2);
}

export function genPlayerIdle(frame = 0) {
  const key = `player_idle_${frame}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(20, 20);
  const ctx = c.getContext('2d');
  const bobY = frame % 2 === 0 ? 0 : -1;
  drawCharacterBase(ctx, 0, 0, 0, bobY);
  cache.set(key, c);
  return c;
}

export function genPlayerWalk(dir, frame = 0) {
  const key = `player_walk_${dir}_${frame}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(20, 20);
  const ctx = c.getContext('2d');
  const offsets = [
    [0, 0, 1, 0],    // frame 0
    [1, 0, -1, 0],   // frame 1
    [0, 0, 0, -1],   // frame 2
    [-1, 0, 0, 1],   // frame 3
  ];
  const [lx, ly, rx, ry] = offsets[frame % 4];
  // Leg swing and arm swing
  const legBob = frame % 2 === 0 ? 0 : -1;
  drawCharacterBase(ctx, 0, 0, 0, legBob);
  // 运动中的手臂摆动用 offset 表示
  cache.set(key, c);
  return c;
}

export function genPlayerRun(dir, frame = 0) {
  const key = `player_run_${dir}_${frame}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(20, 20);
  const ctx = c.getContext('2d');
  const forwardLean = 2;
  const offsets = {
    down: [0, forwardLean],
    up: [0, -forwardLean],
    left: [-forwardLean, 0],
    right: [forwardLean, 0],
  };
  const [lx, ly] = offsets[dir] || [0, 0];
  const bobY = frame % 2 === 0 ? 0 : -1;
  drawCharacterBase(ctx, 0, 0, lx, ly + bobY);
  // 奔跑沙粒
  if (frame % 2 === 0) {
    ctx.fillStyle = COLORS.sand_dry;
    ctx.fillRect(4 + (frame * 3) % 12, 18, 2, 1);
    ctx.fillRect(7 + (frame * 5) % 8, 18, 1, 1);
  }
  cache.set(key, c);
  return c;
}

export function genPlayerDig(frame = 0) {
  const key = `player_dig_${frame}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(20, 22);
  const ctx = c.getContext('2d');
  const bendY = 2;
  drawCharacterBase(ctx, 0, bendY);
  // 铲子
  const shovelX = 12;
  const shovelY = 10 + (frame === 1 ? 3 : frame === 2 ? 6 : 0);
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(shovelX, shovelY, 2, 5);   // 铲头
  ctx.fillStyle = '#b89860';
  ctx.fillRect(shovelX + 1, shovelY - 6, 1, 8); // 铲柄
  // 翻出的沙
  if (frame === 2) {
    ctx.fillStyle = COLORS.sand_dry;
    ctx.fillRect(shovelX - 2, shovelY + 5, 4, 3);
    ctx.fillRect(shovelX - 1, shovelY + 3, 2, 2);
  }
  cache.set(key, c);
  return c;
}

export function genPlayerGrab(frame = 0) {
  const key = `player_grab_${frame}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(22, 20);
  const ctx = c.getContext('2d');
  const armExtend = frame === 1 ? 5 : (frame === 2 ? 2 : 0);
  const leanBack = frame === 0 ? -2 : 0;
  drawCharacterBase(ctx, 0, 0, leanBack, 0);
  if (frame === 1 || frame === 2) {
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(17, 9, armExtend, 2);
    if (frame === 2) {
      // 抓到东西的手握拳
      ctx.fillStyle = COLORS.skin_dark;
      ctx.fillRect(17 + armExtend, 8, 3, 3);
    }
  }
  cache.set(key, c);
  return c;
}

export function genPlayerCarry(frame = 0) {
  const key = `player_carry_${frame}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(20, 20);
  const ctx = c.getContext('2d');
  const bendY = 2;
  drawCharacterBase(ctx, 0, 0, 0, bendY);
  // 汗水
  if (frame % 2 === 0) {
    ctx.fillStyle = '#88ccff88';
    ctx.fillRect(3, 2, 1, 1);
  }
  cache.set(key, c);
  return c;
}

// ============ 收集物精灵 ============

export function genShellFan() {
  const key = 'shell_fan';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(12, 10);
  const ctx = c.getContext('2d');
  const cx = 6, cy = 5;
  // 扇形轮廓
  ctx.fillStyle = '#f0e8e0';
  ctx.fillRect(2, 4, 8, 6);
  ctx.fillRect(3, 3, 6, 1);
  ctx.fillRect(4, 2, 4, 1);
  ctx.fillRect(5, 1, 2, 1);
  // 棱线
  ctx.fillStyle = '#d8c8c0';
  ctx.fillRect(5, 3, 1, 5);
  ctx.fillRect(7, 3, 1, 5);
  ctx.fillRect(4, 5, 1, 3);
  ctx.fillRect(8, 5, 1, 3);
  // 铰合点
  ctx.fillStyle = '#b8a090';
  ctx.fillRect(5, 8, 2, 2);
  cache.set(key, c);
  return c;
}

export function genShellConch() {
  const key = 'shell_conch';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(14, 10);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f0ead8';
  ctx.fillRect(2, 3, 10, 6);
  ctx.fillRect(1, 4, 2, 4);
  ctx.fillRect(10, 2, 3, 8);
  ctx.fillRect(12, 1, 1, 2);
  // 螺旋纹
  ctx.fillStyle = '#c0a878';
  ctx.fillRect(4, 4, 1, 5);
  ctx.fillRect(7, 3, 1, 6);
  ctx.fillRect(10, 5, 1, 4);
  // 壳口
  ctx.fillStyle = '#8a7050';
  ctx.fillRect(10, 6, 3, 3);
  cache.set(key, c);
  return c;
}

export function genClam(open = false) {
  const key = `clam_${open}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(10, 8);
  const ctx = c.getContext('2d');
  if (!open) {
    ctx.fillStyle = '#d8d0d0';
    ctx.fillRect(1, 1, 8, 6);
    ctx.fillRect(2, 0, 6, 1);
    ctx.fillRect(2, 7, 6, 1);
    // 同心纹
    ctx.fillStyle = '#e0d8d0';
    ctx.fillRect(3, 2, 4, 1);
    ctx.fillRect(3, 5, 4, 1);
    // 壳缝
    ctx.fillStyle = '#b0a8a0';
    ctx.fillRect(4, 1, 2, 6);
  } else {
    // 张开
    ctx.fillStyle = '#d8d0d0';
    ctx.fillRect(1, 0, 3, 8);  // 左壳
    ctx.fillRect(6, 0, 3, 8);  // 右壳
    ctx.fillStyle = '#f8f0e8';
    ctx.fillRect(4, 2, 2, 4);  // 内部软体
  }
  cache.set(key, c);
  return c;
}

export function genCrab(state = 'idle', frame = 0) {
  const key = `crab_${state}_${frame}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(14, 10);
  const ctx = c.getContext('2d');
  // 身体
  ctx.fillStyle = '#d8c898';
  ctx.fillRect(3, 3, 8, 5);
  ctx.fillRect(4, 2, 6, 1);
  // 斑点
  ctx.fillStyle = '#a08050';
  ctx.fillRect(5, 4, 1, 1);
  ctx.fillRect(8, 5, 1, 1);
  ctx.fillRect(6, 6, 1, 1);
  // 眼柄
  ctx.fillStyle = '#d8c898';
  ctx.fillRect(5, 0, 1, 3);
  ctx.fillRect(8, 0, 1, 3);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(5, 0, 1, 1);
  ctx.fillRect(8, 0, 1, 1);
  // 腿
  const legWave = state === 'flee' ? (frame % 2 === 0 ? 0 : 1) : 0;
  ctx.fillStyle = '#c8b080';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(1, 4 + i, 2, 1);         // 左腿
    ctx.fillRect(11 + legWave, 4 + i, 2, 1); // 右腿
  }
  // 螯钳
  ctx.fillStyle = '#c04030';
  const clawOpen = state === 'attack' && frame === 1;
  ctx.fillRect(1, 2, 3, clawOpen ? 1 : 2);
  ctx.fillRect(10, 2, 3, clawOpen ? 1 : 2);
  cache.set(key, c);
  return c;
}

export function genStarfish() {
  const key = 'starfish';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(12, 12);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e87850';
  const shape = [
    [0,0,0,0,1,1,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,1,1,1,1,1,1,0,0,0,0],
    [0,1,1,1,1,1,1,1,1,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,1],
    [0,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,1,1,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0],
    [0,0,1,1,1,1,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,1,1,0,0,0],
    [1,0,0,0,0,0,0,0,0,1,0,0],
  ];
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      if (shape[y] && shape[y][x]) px(ctx, x, y, COLORS.red);
    }
  }
  // 中心盘
  ctx.fillStyle = '#f0a090';
  ctx.fillRect(4, 4, 4, 4);
  // 颗粒感
  ctx.fillStyle = '#d06040';
  ctx.fillRect(3, 5, 1, 1);
  ctx.fillRect(8, 4, 1, 1);
  ctx.fillRect(5, 7, 1, 1);
  cache.set(key, c);
  return c;
}

export function genCoinAncient() {
  const key = 'coin_ancient';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(8, 8);
  const ctx = c.getContext('2d');
  // 圆钱
  ctx.fillStyle = '#b89860';
  ctx.fillRect(1, 0, 6, 8);
  ctx.fillRect(0, 1, 8, 6);
  ctx.fillRect(1, 1, 6, 6);
  // 方孔
  ctx.fillStyle = '#2d2010';
  ctx.fillRect(3, 3, 2, 2);
  // 铜锈
  ctx.fillStyle = '#6a8a5a88';
  ctx.fillRect(5, 1, 1, 2);
  ctx.fillRect(2, 6, 2, 1);
  cache.set(key, c);
  return c;
}

export function genPearl() {
  const key = 'pearl';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(6, 6);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f8f0e0';
  ctx.fillRect(1, 0, 4, 6);
  ctx.fillRect(0, 1, 6, 4);
  // 高光
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(1, 1, 2, 1);
  // 阴影
  ctx.fillStyle = '#e0d8c8';
  ctx.fillRect(4, 4, 1, 1);
  cache.set(key, c);
  return c;
}

// ============ UI 图标 ============

export function genHeartIcon() {
  const key = 'heart';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(12, 12);
  const ctx = c.getContext('2d');
  const shape = [
    [0,1,1,0,0,0,1,1,0,0,0,0],
    [1,1,1,1,0,1,1,1,1,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,0,0],
    [1,1,1,1,1,1,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,0,0,0],
  ];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 12; x++) {
      if (shape[y] && shape[y][x]) px(ctx, x, y + 2, COLORS.hp_red);
    }
  }
  cache.set(key, c);
  return c;
}

export function genStaminaIcon() {
  const key = 'stamina';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(10, 10);
  const ctx = c.getContext('2d');
  ctx.fillStyle = COLORS.stamina_yellow;
  ctx.fillRect(4, 0, 2, 4);
  ctx.fillRect(2, 4, 6, 2);
  ctx.fillRect(5, 5, 1, 3);
  ctx.fillRect(3, 6, 3, 2);
  ctx.fillRect(1, 8, 8, 2);
  cache.set(key, c);
  return c;
}

export function genGoldIcon() {
  const key = 'gold';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(10, 10);
  const ctx = c.getContext('2d');
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(2, 0, 6, 10);
  ctx.fillRect(1, 1, 8, 8);
  ctx.fillRect(0, 2, 10, 6);
  ctx.fillRect(1, 3, 8, 4);
  ctx.fillRect(2, 4, 6, 2);
  // 方孔
  ctx.fillStyle = '#8a6a30';
  ctx.fillRect(4, 4, 2, 2);
  cache.set(key, c);
  return c;
}

export function genMoonIcon(phase) {
  const key = `moon_${phase}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(32, 32);
  const ctx = c.getContext('2d');
  const cx = 16, cy = 16, r = 12;

  if (phase === 'full') {
    ctx.fillStyle = '#f0e8c0';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // 环形山
    ctx.fillStyle = '#d8d0a0';
    ctx.fillRect(10, 10, 3, 2);
    ctx.fillRect(18, 14, 2, 3);
    ctx.fillRect(14, 18, 2, 2);
  } else if (phase === 'half' || phase === 'quarter' || phase === 'quarter2') {
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0e8c0';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
  } else if (phase === 'new') {
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // 边缘一线光
    ctx.fillStyle = '#f0e8c020';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // 蛾眉月等
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0e8c0';
    ctx.beginPath();
    ctx.arc(cx + 3, cy, r - 1, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
  }
  cache.set(key, c);
  return c;
}

export function genTideBarBg() {
  const key = 'tide_bar_bg';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(200, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#00000060';
  ctx.fillRect(0, 0, 200, 16);
  // 刻度线
  ctx.fillStyle = '#ffffff20';
  ctx.fillRect(50, 0, 1, 16);
  ctx.fillRect(100, 0, 1, 16);
  ctx.fillRect(150, 0, 1, 16);
  cache.set(key, c);
  return c;
}

// ============ 获取对应 sprite ============

export function getCollectibleSprite(itemId, state = 'default', frame = 0) {
  switch (itemId) {
    case 'shell_fan': return genShellFan();
    case 'shell_conch': return genShellConch();
    case 'clam': return genClam(state === 'open');
    case 'crab_sand': return genCrab(state, frame);
    case 'starfish': return genStarfish();
    case 'coin_ancient': return genCoinAncient();
    case 'pearl': return genPearl();
    case 'urchin': return genUrchin();
    case 'chiton': return genChiton();
    case 'octopus_sm': return genOctopusSm();
    case 'abalone': return genAbalone();
    case 'seaglass': return genSeaglass(state === 'variant' ? frame : 0);
    case 'crab_rock': return genCrabRock();
    default: return null;
  }
}

export function getPlayerSprite(anim, dir, frame) {
  switch (anim) {
    case 'idle': return genPlayerIdle(frame);
    case 'walk': return genPlayerWalk(dir, frame);
    case 'run': return genPlayerRun(dir, frame);
    case 'dig': return genPlayerDig(frame);
    case 'grab': return genPlayerGrab(frame);
    case 'carry': return genPlayerCarry(frame);
    default: return genPlayerIdle(0);
  }
}

function genTileCave() {
  const key = 'cave_entrance';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // 洞口边缘岩石
  ctx.fillStyle = COLORS.rock;
  ctx.fillRect(0, 0, TILE_SIZE, 3);
  ctx.fillRect(0, TILE_SIZE - 3, TILE_SIZE, 3);
  ctx.fillRect(0, 0, 3, TILE_SIZE);
  ctx.fillRect(TILE_SIZE - 3, 0, 3, TILE_SIZE);
  // 钟乳石
  ctx.fillStyle = COLORS.rock_light;
  px(ctx, 5, 3, COLORS.rock_light);
  px(ctx, 10, 4, COLORS.rock_light);
  // 水痕
  ctx.fillStyle = '#2d6e8240';
  ctx.fillRect(0, 0, TILE_SIZE, 2);
  cache.set(key, c);
  return c;
}

function genTileDockWood(variant) {
  const key = `dock_wood_${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5a4030';
  ctx.fillRect(2, 0, 12, TILE_SIZE);
  ctx.fillStyle = '#4a3020';
  ctx.fillRect(6, 0, 2, TILE_SIZE);
  if (variant === 1) {
    ctx.fillStyle = '#3a5a2a';
    ctx.fillRect(0, 2, TILE_SIZE, 1);
  }
  cache.set(key, c);
  return c;
}

function genTileDockPlank(variant) {
  const key = `dock_plank_${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6a4a30';
  ctx.fillRect(2, 6, 12, 4);
  ctx.fillStyle = '#5a3a20';
  ctx.fillRect(2, 6, 12, 1);
  cache.set(key, c);
  return c;
}

function genTileTidePool() {
  const key = 'tide_pool';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d');
  ctx.fillStyle = COLORS.rock;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = '#3a8a95';
  ctx.fillRect(3, 3, 10, 10);
  // 生物暗示
  px(ctx, 6, 7, '#e87850');
  px(ctx, 10, 5, '#7ec8d8');
  cache.set(key, c);
  return c;
}

// === 黑礁岛 tile 精灵 ===
function genTileRockBarnacle(variant) {
  const key = `rock_barnacle_${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d');
  // 基底礁石
  ctx.fillStyle = COLORS.rock;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = COLORS.rock_dark;
  ctx.fillRect(2, 4, 4, 1); // 裂缝
  ctx.fillStyle = COLORS.rock_light;
  px(ctx, 0, 0, COLORS.rock_light);
  // 藤壶群
  ctx.fillStyle = '#d8d8d0';
  for (let i = 0; i < 5; i++) {
    const bx = 3 + (i * 3) % 13;
    const by = 2 + i * 2;
    ctx.beginPath();
    ctx.arc(bx, by, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // 藤壶中心小点
    px(ctx, bx, by, '#888');
  }
  cache.set(key, c);
  return c;
}

function genTileRockMoss() {
  const key = 'rock_moss';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = c.getContext('2d');
  ctx.fillStyle = COLORS.rock;
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  ctx.fillStyle = COLORS.rock_dark;
  ctx.fillRect(1, 8, 6, 1);
  // 苔藓覆盖
  ctx.fillStyle = COLORS.moss;
  ctx.fillRect(0, 0, TILE_SIZE, 3);
  ctx.fillRect(2, 3, 4, 2);
  ctx.fillRect(8, 0, 3, 2);
  ctx.fillStyle = '#4a6a2a';
  px(ctx, 5, 1, '#4a6a2a');
  px(ctx, 11, 1, '#4a6a2a');
  ctx.fillStyle = '#6a8a4a';
  px(ctx, 3, 0, '#6a8a4a');
  px(ctx, 9, 2, '#6a8a4a');
  cache.set(key, c);
  return c;
}

// === 黑礁岛收集物精灵 ===
function genUrchin() {
  const key = 'urchin';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(14, 14);
  const ctx = c.getContext('2d');
  // 黑色圆体
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(7, 7, 5, 0, Math.PI * 2);
  ctx.fill();
  // 尖刺（辐射状短线）
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
    ctx.beginPath();
    ctx.moveTo(7 + Math.cos(a) * 5, 7 + Math.sin(a) * 5);
    ctx.lineTo(7 + Math.cos(a) * 7, 7 + Math.sin(a) * 7);
    ctx.stroke();
  }
  // 高光
  px(ctx, 5, 5, '#555');
  cache.set(key, c);
  return c;
}

function genChiton() {
  const key = 'chiton';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(10, 8);
  const ctx = c.getContext('2d');
  // 椭圆形扁平身体
  ctx.fillStyle = '#7a6a5a';
  ctx.beginPath();
  ctx.ellipse(5, 4, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // 背板分段线
  ctx.strokeStyle = '#5a4a3a';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(3 + i * 2, 2);
    ctx.lineTo(3 + i * 2, 6);
    ctx.stroke();
  }
  // 边缘
  ctx.strokeStyle = '#8a7a6a';
  ctx.beginPath();
  ctx.ellipse(5, 4, 5, 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  cache.set(key, c);
  return c;
}

function genOctopusSm() {
  const key = 'octopus_sm';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(16, 16);
  const ctx = c.getContext('2d');
  // 圆头
  ctx.fillStyle = '#c87060';
  ctx.beginPath();
  ctx.arc(8, 5, 5, 0, Math.PI * 2);
  ctx.fill();
  // 眼睛
  ctx.fillStyle = '#fff';
  px(ctx, 6, 3, '#fff'); px(ctx, 10, 3, '#fff');
  px(ctx, 6, 3, '#1a1a1a'); // 瞳孔
  // 8条触手
  ctx.strokeStyle = '#c87060';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.3;
    ctx.beginPath();
    ctx.moveTo(8 + Math.cos(a) * 5, 5 + Math.sin(a) * 4);
    ctx.quadraticCurveTo(
      8 + Math.cos(a) * 8, 8 + Math.sin(a) * 8,
      8 + Math.cos(a) * 6 + Math.sin(i) * 2, 10 + Math.sin(a) * 6
    );
    ctx.stroke();
  }
  cache.set(key, c);
  return c;
}

function genAbalone() {
  const key = 'abalone';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(14, 10);
  const ctx = c.getContext('2d');
  // 椭圆形壳
  ctx.fillStyle = '#6a8a7a';
  ctx.beginPath();
  ctx.ellipse(7, 5, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // 螺层纹理
  ctx.strokeStyle = '#5a7a6a';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(2 + i, 4 + i * 0.5, 3 + i, 0, Math.PI * 1.5);
    ctx.stroke();
  }
  // 珍珠光泽内层
  ctx.fillStyle = '#f0e8e040';
  ctx.beginPath();
  ctx.ellipse(7, 5, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 壳边呼吸孔
  for (let i = 0; i < 3; i++) {
    px(ctx, 3 + i * 3, 8, '#4a6a5a');
  }
  cache.set(key, c);
  return c;
}

function genSeaglass(variant = 0) {
  const colors = ['#7ec8d8', '#a8d8a0', '#e8c8a0', '#c8a8d8'];
  const color = colors[variant % colors.length];
  const key = `seaglass_${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(8, 8);
  const ctx = c.getContext('2d');
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  // 不规则圆角方形
  ctx.moveTo(2, 0); ctx.lineTo(6, 0);
  ctx.quadraticCurveTo(8, 1, 7, 3);
  ctx.lineTo(6, 7);
  ctx.quadraticCurveTo(5, 8, 3, 7);
  ctx.lineTo(0, 4);
  ctx.quadraticCurveTo(0, 2, 2, 0);
  ctx.fill();
  ctx.globalAlpha = 1;
  // 高光
  px(ctx, 2, 1, '#ffffff60');
  cache.set(key, c);
  return c;
}

function genCrabRock() {
  const key = 'crab_rock';
  if (cache.has(key)) return cache.get(key);
  const c = createCanvas(14, 10);
  const ctx = c.getContext('2d');
  // 深灰色甲壳
  ctx.fillStyle = '#5a5a5a';
  ctx.beginPath();
  ctx.ellipse(7, 4, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // 斑纹
  ctx.fillStyle = '#4a4a4a';
  px(ctx, 5, 3, '#4a4a4a'); px(ctx, 9, 4, '#4a4a4a');
  // 眼睛柄
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(3, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, 2); ctx.lineTo(11, 0); ctx.stroke();
  // 8条腿
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(7 + side * 5, 4 + i * 0.5);
      ctx.lineTo(7 + side * 7, 6 + i * 1.5);
      ctx.stroke();
    }
  }
  // 大螯
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(0, 2, 4, 2);
  ctx.fillRect(10, 3, 4, 2);
  cache.set(key, c);
  return c;
}

export function getTileSprite(type, variant = 0) {
  switch (type) {
    case 'dry_sand': return genTileDrySand(variant);
    case 'wet_sand': return genTileWetSand(variant);
    case 'shallow_water': return genTileWater(0);
    case 'mid_water': return genTileWater(1);
    case 'deep_water': return genTileWater(2);
    case 'abyss_water': return genTileWater(3);
    case 'rock_small': return genTileRock(16, 16, variant);
    case 'rock_medium': return genTileRock(16, 32, variant);
    case 'rock_large': return genTileRock(32, 32, variant);
    case 'rock_barnacle': return genTileRockBarnacle(variant);
    case 'rock_moss': return genTileRockMoss();
    case 'cave_entrance': return genTileCave();
    case 'dock_wood': return genTileDockWood(variant);
    case 'dock_plank': return genTileDockPlank(variant);
    case 'tide_pool': return genTileTidePool();
    default: return genTileDrySand(0);
  }
}
