// audio.js — Web Audio API 程序化音效
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this._waveSource = null;
    this._waveGain = null;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _tone(freq, duration, type = 'sine', volume = 0.12) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) { /* silent fail */ }
  }

  playPickup() {
    this._tone(880, 0.08);
    setTimeout(() => this._tone(1100, 0.06), 40);
  }

  playSell() {
    this._tone(660, 0.1, 'triangle', 0.1);
  }

  playDamage() {
    this._tone(80, 0.15, 'square', 0.08);
  }

  playTreasure() {
    this._tone(523, 0.1);
    setTimeout(() => this._tone(659, 0.08), 60);
    setTimeout(() => this._tone(784, 0.12), 120);
  }

  playWave() {
    if (!this.enabled || !this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * 4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.02;
      }
      this._waveSource = this.ctx.createBufferSource();
      this._waveSource.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      this._waveGain = this.ctx.createGain();
      this._waveGain.gain.value = 0.05;
      this._waveSource.connect(filter);
      filter.connect(this._waveGain);
      this._waveGain.connect(this.ctx.destination);
      this._waveSource.loop = true;
      this._waveSource.start();
    } catch (e) { /* silent fail */ }
  }

  stopWave() {
    try {
      if (this._waveSource) {
        this._waveSource.stop();
        this._waveSource.disconnect();
      }
      if (this._waveGain) this._waveGain.disconnect();
    } catch (e) { /* ignore */ }
    this._waveSource = null;
    this._waveGain = null;
  }
}
