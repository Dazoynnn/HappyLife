// main.js — 入口文件

import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');
if (!canvas) {
  throw new Error('找不到 game-canvas 元素');
}

const game = new Game(canvas);
game.start();

console.log('🌊 潮汐猎人 Tide Hunter MVP 已启动');
console.log('操作说明:');
console.log('  [WASD] 移动  [Shift] 奔跑');
console.log('  [E] 采集/互动  [Tab/B] 打开背包');
console.log('  [Esc] 返回村庄');
console.log('  村庄中: [1-4]切换建筑 [空格/回车]出海');
console.log('  背包中: [方向键]选择 [S]出售 [A]水族箱 [M]博物馆');
