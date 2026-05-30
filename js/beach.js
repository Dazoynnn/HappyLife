// beach.js — 海滩地图生成与管理
import { TILE_SIZE, CANVAS_W, CANVAS_H, MICRO_ZONES, BEACHES } from './data.js';

const MAP_COLS = Math.ceil(CANVAS_W / TILE_SIZE);  // 30
const MAP_ROWS = Math.ceil(CANVAS_H / TILE_SIZE);  // 20

export class BeachMap {
  constructor(beachId = 'white_sand') {
    const config = BEACHES[beachId] || BEACHES['white_sand'];
    this.name = config.name;
    this.beachId = beachId;
    this.config = config;
    this.cols = MAP_COLS;
    this.rows = MAP_ROWS;
    this.height = MAP_ROWS;
    this.width = MAP_COLS;
    this.safeZoneEnd = config.safeZoneRows;
    this.tiles = [];
    this.generate();
  }

  generate() {
    this.tiles = [];
    switch (this.beachId) {
      case 'black_reef':
        this._generateBlackReef();
        break;
      case 'seagrass':
        this._generateSeagrass();
        break;
      default:
        this._generateWhiteSand();
    }
  }

  // ===================== 白沙湾 =====================
  _generateWhiteSand() {
    for (let row = 0; row < this.rows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.tiles[row][col] = this._tileWhiteSand(row, col);
      }
    }
    this._placeRocks();
    this._placeDockRuins();
    this._placeTidePools();
    this._placeCaveEntrance();
  }

  _tileWhiteSand(row, col) {
    const variant = (row * 7 + col * 13) % 3;
    if (row < 4) return { type: 'dry_sand', variant, biome: 'safe' };
    if (row < 7) return { type: row < 5 ? 'dry_sand' : 'wet_sand', variant: variant % 2, biome: 'sand_shallow' };
    if (row < 14) {
      if (col > 3 && col < 26 && row >= 10 && row < 13)
        return { type: 'wet_sand', variant: variant % 2, biome: 'tidal_flat' };
      if (row >= 12)
        return { type: row >= 13 && (col > 22 || col < 7) ? 'mid_water' : 'shallow_water', variant: 0, biome: 'tidal_flat' };
      return { type: 'wet_sand', variant: variant % 2, biome: 'tidal_flat' };
    }
    if (row < 18) {
      if (col > 3 && col < 10 && row >= 15) return { type: 'shallow_water', variant: 0, biome: 'reef_zone' };
      if (col > 20 && col < 27 && row >= 15) return { type: 'shallow_water', variant: 0, biome: 'reef_zone' };
      return { type: 'mid_water', variant: 0, biome: 'outer_reef' };
    }
    return { type: row >= 19 ? 'abyss_water' : 'deep_water', variant: 0, biome: 'deep_water' };
  }

  // ===================== 黑礁岛 =====================
  _generateBlackReef() {
    for (let row = 0; row < this.rows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.tiles[row][col] = this._tileBlackReef(row, col);
      }
    }
    this._placeBlackReefRocks();
    this._placeTidePools();            // 大量潮池
    this._placeDeepPools();            // 深潮池（需要水桶）
    this._placeMossRocks();            // 苔藓礁石（会滑倒）
  }

  _tileBlackReef(row, col) {
    const variant = (row * 7 + col * 13) % 3;
    // 安全区只有2行 — 更高风险
    if (row < 2) return { type: 'dry_sand', variant, biome: 'safe' };
    // 黑沙滩（深色砂砾）
    if (row < 5) return { type: row < 3 ? 'dry_sand' : 'wet_sand', variant: variant % 2, biome: 'black_reef_shore' };
    // 浅水礁石交错带（大量礁石）
    if (row < 10) {
      return { type: 'shallow_water', variant: 0, biome: 'sand_shallow' };
    }
    // 主要礁石区
    if (row < 16) {
      return { type: 'shallow_water', variant: 0, biome: 'reef_zone' };
    }
    // 外礁
    if (row < 19) return { type: 'mid_water', variant: 0, biome: 'outer_reef' };
    // 远海
    return { type: row >= 19 ? 'abyss_water' : 'deep_water', variant: 0, biome: 'deep_water' };
  }

  _placeBlackReefRocks() {
    // 黑礁岛：礁石覆盖率 40%，密集分布
    // 左上大片礁石群
    this._setRockRect(5, 2, 8, 4, 'large');
    this._setRockRect(6, 10, 4, 2, 'medium');
    // 中部礁石带
    this._setRockRect(9, 8, 6, 3, 'large');
    this._setRockRect(9, 15, 3, 2, 'medium');
    // 右下礁石群
    this._setRockRect(13, 18, 7, 3, 'large');
    this._setRockRect(14, 25, 2, 1, 'small');
    // 散落小礁石
    this._setRockRect(4, 18, 2, 2, 'small');
    this._setRockRect(8, 2, 2, 1, 'small');
    this._setRockRect(11, 5, 1, 1, 'small');
    this._setRockRect(15, 3, 3, 1, 'medium');
  }

  _placeMossRocks() {
    // 苔藓礁石：覆盖在部分礁石上，玩家走上去会滑倒
    const spots = [];
    for (let row = 5; row < 16; row++) {
      for (let col = 0; col < this.cols; col++) {
        const t = this.tiles[row][col];
        if (t && t.type.startsWith('rock_')) spots.push({ row, col });
      }
    }
    // 随机选30%的礁石覆盖苔藓
    for (const s of spots) {
      if (Math.random() < 0.3 && this.tiles[s.row][s.col].type !== 'cave_entrance') {
        this.tiles[s.row][s.col] = { type: 'rock_moss', variant: 0, biome: 'moss_rock' };
      }
    }
    // 藤壶礁石
    for (const s of spots) {
      if (Math.random() < 0.25 && this.tiles[s.row][s.col].type.startsWith('rock_') && this.tiles[s.row][s.col].type !== 'rock_moss') {
        this.tiles[s.row][s.col] = { type: 'rock_barnacle', variant: 0, biome: 'barnacle_rock' };
      }
    }
  }

  _placeDeepPools() {
    // 深潮池：2x2 的深色水域，需要水桶才能采集
    const spots = [];
    for (let row = 8; row < 16; row++) {
      for (let col = 2; col < 26; col++) {
        const t = this.tiles[row][col];
        if (t && t.type === 'shallow_water') spots.push({ row, col });
      }
    }
    // 随机选位置放 3-4 个深潮池
    const count = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count && spots.length > 0; i++) {
      const idx = Math.floor(Math.random() * spots.length);
      const s = spots.splice(idx, 1)[0];
      if (s.row + 1 < this.rows && s.col + 1 < this.cols) {
        this.tiles[s.row][s.col] = { type: 'tide_pool', variant: 1, biome: 'deep_pool' };
        this.tiles[s.row][s.col + 1] = { type: 'tide_pool', variant: 1, biome: 'deep_pool' };
        if (s.row + 1 < this.rows) {
          this.tiles[s.row + 1][s.col] = { type: 'tide_pool', variant: 1, biome: 'deep_pool' };
          this.tiles[s.row + 1][s.col + 1] = { type: 'tide_pool', variant: 1, biome: 'deep_pool' };
        }
      }
    }
  }

  // ===================== 海草甸 =====================
  _generateSeagrass() {
    for (let row = 0; row < this.rows; row++) {
      this.tiles[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.tiles[row][col] = this._tileSeagrass(row, col);
      }
    }
    this._placeSeagrassPatches();
    this._placeMudPits();
  }

  _tileSeagrass(row, col) {
    const variant = (row * 7 + col * 13) % 3;
    if (row < 3) return { type: 'dry_sand', variant, biome: 'safe' };
    if (row < 6) return { type: 'wet_sand', variant: variant % 2, biome: 'sand_shallow' };
    // 淤泥滩（主要地形）
    if (row < 12)
      return { type: 'mud_flat', variant: variant % 2, biome: 'mud_flat' };
    // 海草浅水
    if (row < 17)
      return { type: 'shallow_water', variant: 0, biome: 'seagrass_meadow' };
    if (row < 19)
      return { type: 'mid_water', variant: 0, biome: 'outer_reef' };
    return { type: row >= 19 ? 'abyss_water' : 'deep_water', variant: 0, biome: 'deep_water' };
  }

  _placeSeagrassPatches() {
    // 在浅水区随机放置海草丛
    for (let row = 8; row < 17; row++) {
      for (let col = 0; col < this.cols; col++) {
        const t = this.tiles[row][col];
        if (t && (t.biome === 'seagrass_meadow' || t.biome === 'mud_flat')) {
          if (Math.random() < 0.35) {
            // 高海草（遮挡视野）
            if (Math.random() < 0.3 && row > 10) {
              this.tiles[row][col] = { type: 'seagrass_tall', variant: 0, biome: 'seagrass_tall' };
            } else {
              this.tiles[row][col] = { type: 'seagrass_short', variant: 0, biome: 'seagrass_meadow' };
            }
          }
        }
      }
    }
    // 放置几簇矮礁石
    this._setRockRect(7, 3, 2, 1, 'small');
    this._setRockRect(12, 22, 2, 2, 'small');
    this._setRockRect(14, 12, 1, 1, 'small');
  }

  _placeMudPits() {
    // 暗坑陷阱：在淤泥区随机放置
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const row = 5 + Math.floor(Math.random() * 8);
      const col = 2 + Math.floor(Math.random() * 26);
      if (row < this.rows && col < this.cols) {
        this.tiles[row][col] = { type: 'mud_pit', variant: 0, biome: 'mud_flat' };
        // 暗坑不易察觉 => 混合在淤泥中
      }
    }
  }

  // ===================== 共享方法 =====================
  _placeRocks() {
    this._setRockRect(5, 5, 3, 2, 'small');
    this._setRockRect(6, 8, 1, 2, 'medium');
    this._setRockRect(9, 22, 2, 3, 'large');
    this._setRockRect(10, 25, 1, 1, 'small');
    this._setRockRect(12, 20, 1, 1, 'small');
    this._setRockRect(15, 5, 2, 2, 'medium');
    this._setRockRect(16, 8, 1, 1, 'small');
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
    for (let r = 3; r < 6; r++) {
      this.tiles[r][2] = { type: 'dock_wood', variant: 0, biome: 'dock_ruins' };
      this.tiles[r][3] = { type: 'dock_wood', variant: 1, biome: 'dock_ruins' };
    }
    this.tiles[4][4] = { type: 'dock_plank', variant: 0, biome: 'dock_ruins' };
    this.tiles[5][1] = { type: 'dock_plank', variant: 1, biome: 'dock_ruins' };
  }

  _placeTidePools() {
    const count = this.beachId === 'black_reef' ? 4 : 1;
    for (let n = 0; n < count; n++) {
      const baseRow = 8 + n * 4;
      const baseCol = 5 + n * 8;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
          const tr = baseRow + r;
          const tc = baseCol + c;
          if (tr < this.rows && tc < this.cols && this.tiles[tr][tc].biome === 'reef_zone') {
            this.tiles[tr][tc] = { type: 'tide_pool', variant: 0, biome: 'tide_pool' };
          }
        }
      }
    }
  }

  _placeCaveEntrance() {
    if (!this.config.hasCave) return;
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

  // ===================== 查询方法 =====================
  getTileAt(px, py) {
    const col = Math.floor(px / TILE_SIZE);
    const row = Math.floor(py / TILE_SIZE);
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.tiles[row][col];
  }

  getBiomeAt(px, py) {
    const tile = this.getTileAt(px, py);
    return tile ? tile.biome : null;
  }

  isInWater(px, py, tideLevel) {
    const tileY = Math.floor(py / TILE_SIZE);
    const waterLine = Math.floor(tideLevel * this.rows);
    return tileY >= waterLine;
  }
}
