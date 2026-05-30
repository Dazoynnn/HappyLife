// input.js — 键盘输入管理

export class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this.justReleased = {};

    this._onKeyDown = (e) => {
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','KeyF','Tab','Escape'].includes(e.code)) {
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => {
      this.keys[e.code] = false;
      this.justReleased[e.code] = true;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  isDown(code) { return !!this.keys[code]; }

  wasPressed(code) {
    if (this.justPressed[code]) {
      this.justPressed[code] = false;
      return true;
    }
    return false;
  }

  wasReleased(code) {
    if (this.justReleased[code]) {
      this.justReleased[code] = false;
      return true;
    }
    return false;
  }

  // 每帧结束时调用，清理单帧状态
  endFrame() {
    this.justPressed = {};
    this.justReleased = {};
  }

  get direction() {
    let dx = 0, dy = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1;
    if (this.keys['ArrowUp'] || this.keys['KeyW']) dy -= 1;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) dy += 1;
    // 归一化
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    return { x: dx, y: dy };
  }

  get dirName() {
    const d = this.direction;
    if (d.y < -0.3) return 'up';
    if (d.y > 0.3) return 'down';
    if (d.x < -0.3) return 'left';
    if (d.x > 0.3) return 'right';
    return 'down';
  }

  get isMoving() {
    const d = this.direction;
    return Math.abs(d.x) > 0.1 || Math.abs(d.y) > 0.1;
  }

  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}
