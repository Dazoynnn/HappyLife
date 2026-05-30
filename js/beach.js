// beach.js — 海滩地图生成与管理

import { TILE_SIZE, CANVAS_W, CANVAS_H, MICRO_ZONES } from './data.js';

const MAP_COLS = Math.ceil(CANVAS_W / TILE_SIZE);  // 30
const MAP_ROWS = Math.ceil(CANVAS_H / TILE_SIZE);  // 20

export class BeachMap {
  constructor(name = '白沙湾') {
    this.name = name;
    this.cols = MAP_COLS;
    this.rows = MAP_ROWS;
    this.height = MAP_ROWS;
    this.width = MAP_COLS;
    this.safeZoneEnd = 4;   // 安全区结束行（tile 坐标）

    // tile 数据: 每个 tile { type, variant, biome }
    this.tiles = [];
    this.generate();
  }

  generate() {
    this.tiles = [];
    for (let row = 0; row < this.rows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.tiles[row][col] = this._genTile(row, col);
      }
    }

    // 放置礁石
    this._placeRocks();

    // 放置老码头废墟
    this._placeDockRuins();

    // 放置潮池
    this._placeTidePools();

    // 放置海蚀洞入口
    this._placeCaveEntrance();
  }

  _placeCaveEntrance() {
    // 海蚀洞在礁石区随机位置
    const spots = [];
    for (let row = 10; row < 16; row++) {
      for (let col = 2; col < 28; col++) {
        const t = this.tiles[row][col];
        if (t && t.biome === 'reef_zone') spots.push({ row, col });
      }
    }
    if (spots.length === 0) return;
    const pick = spots[Math.floor(Math.random() * spots.length)];
    this.tiles[pick.row][pick.col] = { type: 'cave_entrance', variant: 0, biome: 'cave' };
    if (pick.col + 1 < this.cols) {
      this.tiles[pick.row][pick.col + 1] = { type: 'cave_entrance', variant: 0, biome: 'cave' };
    }
  }

  _genTile(row, col) {
    const variant = (row * 7 + col * 13) % 3;
    // 安全区：干沙
    if (row < 4) {
      return { type: 'dry_sand', variant, biome: 'safe' };
    }
    // 沙滩浅水：干沙 + 渐变到湿沙
    if (row < 7) {
      return { type: row < 5 ? 'dry_sand' : 'wet_sand', variant: variant % 2, biome: 'sand_shallow' };
    }
    // 潮间带：湿沙为主
    if (row < 14) {
      if (col > 3 && col < 26 && row >= 10 && row < 13) {
        return { type: 'wet_sand', variant: variant % 2, biome: 'tidal_flat' };
      }
      // 逐渐入水
      if (row >= 12) {
        return { type: row >= 13 && (col > 22 || col < 7) ? 'mid_water' : 'shallow_water', variant: 0, biome: 'tidal_flat' };
      }
      return { type: 'wet_sand', variant: variant % 2, biome: 'tidal_flat' };
    }
    // 外礁边缘
    if (row < 18) {
      if (col > 3 && col < 10 && row >= 15) {
        return { type: 'shallow_water', variant: 0, biome: 'reef_zone' };
      }
      if (col > 20 && col < 27 && row >= 15) {
        return { type: 'shallow_water', variant: 0, biome: 'reef_zone' };
      }
      return { type: 'mid_water', variant: 0, biome: 'outer_reef' };
    }
    // 远海
    return { type: row >= 19 ? 'abyss_water' : 'deep_water', variant: 0, biome: 'deep_water' };
  }

  _placeRocks() {
    // 礁石北侧 (row 5-6, col 5-10)
    this._setRockRect(5, 5, 3, 2, 'small');
    this._setRockRect(6, 8, 1, 2, 'medium');

    // 潮间带礁石 (row 9-11, col 22-27)
    this._setRockRect(9, 22, 2, 3, 'large');
    this._setRockRect(10, 25, 1, 1, 'small');
    this._setRockRect(12, 20, 1, 1, 'small');

    // 外礁 (row 15-16, col 5-8)
    this._setRockRect(15, 5, 2, 2, 'medium');
    this._setRockRect(16, 8, 1, 1, 'small');

    // 外礁右侧 (row 14-15, col 24-26)
    this._setRockRect(14, 24, 1, 2, 'medium');
    this._setRockRect(15, 23, 1, 1, 'small');
  }

  _setRockRect(row, col, w, h, size) {
    for (let r = row; r < Math.min(row + h, this.rows); r++) {
      for (let c = col; c < Math.min(col + w, this.cols); c++) {
        const variant = ((r - row) * 3 + (c - col)) % 3;
        this.tiles[r][c] = { type: `rock_${size}`, variant, biome: 'reef_zone' };
      }
    }
  }

  _placeDockRuins() {
    // 老码头废墟在左侧 (row 3-5, col 2-4)
    for (let r = 3; r < 6; r++) {
      this.tiles[r][2] = { type: 'dock_wood', variant: 0, biome: 'dock_ruins' };
      this.tiles[r][3] = { type: 'dock_wood', variant: 1, biome: 'dock_ruins' };
    }
    // 散落的木板
    this.tiles[4][4] = { type: 'dock_plank', variant: 0, biome: 'dock_ruins' };
    this.tiles[5][1] = { type: 'dock_plank', variant: 1, biome: 'dock_ruins' };
  }

  _placeTidePools() {
    // 潮池在礁石旁边 (row 10-11, col 23-24)
    this.tiles[10][23] = { type: 'tide_pool', variant: 0, biome: 'tide_pool' };
    this.tiles[10][24] = { type: 'tide_pool', variant: 0, biome: 'tide_pool' };
    this.tiles[11][23] = { type: 'tide_pool', variant: 0, biome: 'tide_pool' };
    this.tiles[11][24] = { type: 'tide_pool', variant: 0, biome: 'tide_pool' };
  }

  // 获取指定像素位置下的 tile 信息
  getTileAt(px, py) {
    const col = Math.floor(px / TILE_SIZE);
    const row = Math.floor(py / TILE_SIZE);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null;
    }
    return this.tiles[row][col];
  }

  // 获取 biome
  getBiomeAt(px, py) {
    const tile = this.getTileAt(px, py);
    return tile ? tile.biome : null;
  }

  // 判断位置是否在水中
  isInWater(px, py, tideLevel) {
    const tileY = Math.floor(py / TILE_SIZE);
    const waterLine = Math.floor(tideLevel * this.rows);
    return tileY >= waterLine;
  }
}
