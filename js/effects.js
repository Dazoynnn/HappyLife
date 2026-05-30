// effects.js — 粒子特效和视觉反馈

export class Particle {
  constructor(x, y, vx, vy, life, color, size = 1) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.color = color;
    this.size = size;
    this.alive = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 50 * dt; // 重力
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }
}

export class EffectsManager {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  // 采集粒子爆发
  burstCollect(x, y, count = 5, color = '#d4c08a') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 60;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 20,
        0.3 + Math.random() * 0.3,
        color,
        1 + Math.random() * 2
      ));
    }
  }

  // 珍宝发现光柱
  treasureGlow(x, y) {
    // 光柱用多个上升金色粒子模拟
    for (let i = 0; i < 15; i++) {
      this.particles.push(new Particle(
        x + (Math.random() - 0.5) * 6,
        y,
        (Math.random() - 0.5) * 10,
        -40 - Math.random() * 40,
        0.8 + Math.random() * 0.5,
        '#d4a840',
        1 + Math.random() * 2
      ));
    }
  }

  // 受伤粒子
  burstDamage(x, y) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 40;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 30,
        0.2 + Math.random() * 0.2,
        '#c04030',
        1 + Math.random() * 1
      ));
    }
  }

  // 浮动文字（如"+15金币"）
  addFloatingText(x, y, text, color = '#ffffff', duration = 1.5) {
    this.floatingTexts.push({
      x, y, text, color, duration, maxDuration: duration,
    });
  }

  update(dt) {
    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => p.alive);

    for (const ft of this.floatingTexts) {
      ft.duration -= dt;
      ft.y -= 30 * dt; // 向上飘
    }
    this.floatingTexts = this.floatingTexts.filter(ft => ft.duration > 0);
  }

  draw(ctx, scale = 2) {
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size * scale, p.size * scale);
    }
    ctx.globalAlpha = 1;

    for (const ft of this.floatingTexts) {
      const alpha = Math.max(0, ft.duration / ft.maxDuration);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `${10 * scale}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
  }
}
