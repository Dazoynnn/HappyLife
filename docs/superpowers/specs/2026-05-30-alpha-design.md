# Alpha 版开发设计文档

> 从 MVP（白沙湾原型）→ Alpha（3 海滩 + 完整系统）
> 文档日期: 2026-05-30 | 版本: v1.0

---

## 架构决策

### 保持不变
- Canvas 2D 渲染管线（buffer → scale 2x）
- ES Modules 模块化（14 个 JS 文件）
- 数据驱动配置（data.js 单文件）
- 场景模式：VILLAGE / BEACH 两态切换

### 新增模块
- `js/weather.js` — 天气系统（晴/雨/暴雨）
- `js/events.js` — 随机事件管理（沉船/鲨鱼/人鱼商人）
- `js/audio.js` — Web Audio API 音效合成
- `js/beaches/` — 每个海滩独立配置（白沙湾/黑礁岛/海草甸）

### 改动模块
- `js/data.js` — 新收集物、新装备、新 tile 类型、新 biome
- `js/beach.js` — 支持多海滩配置加载
- `js/inventory.js` — 威望重置、海灵珠合成、大件物品
- `js/player.js` — 拖拽状态、装备效果应用
- `js/game.js` — 海滩选择、天气集成、事件触发
- `js/shop.js` — 5 建筑（+海图）、威望 UI
- `js/renderer.js` — 雨滴粒子、沉船特效、海草动画
- `js/sprites.js` — 新精灵表

---

## Phase 1: 白沙湾系统完善

### 1.1 威望系统
- 博物馆展区完成 → 弹出确认 → 执行重置
- 重置范围：金币、水族箱、装备、背包
- 保留：博物馆捐赠记录、永久遗产
- 新增 `inventory.prestige(sectionId)` 方法
- 永久遗产存储为 `inventory.legacies: string[]`
- 收集物生成时检查 legacies 应用概率加成

### 1.2 天气系统
- 每次出海前随机天气（data.js WEATHER 表）
- 小雨：渲染半透明雨滴粒子，鱼 spawn 率 ×1.2
- 暴雨：更多雨滴，稀有生物 spawn ×2，画面变暗，移动随机偏移
- 天气不影响潮汐周期长度
- `WeatherSystem` 类管理状态 + 渲染

### 1.3 沉船事件
- 触发：outer_reef biome 内，概率 3%/分钟
- 效果：时间暂停 30 秒（`tide.paused = true`）
- 残骸内 spawn：coin_ancient ×20、随机 treasure ×3-5、随机装备 ×1
- 30 秒后潮水加速恢复（`tide.elapsed += 30`）
- `ShipwreckEvent` 类管理

### 1.4 海蚀洞
- 仅在 `tide.level < 0.1` 时入口可见
- 入口 tile 在礁石区随机位置
- 洞内 spawn 2-3 个高品质收集物
- 潮水到 60% 时自动踢出玩家

### 1.5 大件拖拽
- 收集物 `bulky: true` 标记
- 拾取后 player 进入 `dragging` 状态
- 速度 ×0.5，不能采集
- 放下时地图标记闪烁图标
- 潮水 50% → 大件自动浮起可推

### 1.6 海灵珠合成
- inventory.seaPearlFragments 累积
- 10 碎片 = 1 海灵珠
- 能力 1「潮汐感知」：HUD 显示精确秒数
- 能力 2「归巢本能」：空格立刻回安全区（丢一半物品）

### 1.7 装备扩充
- 4 新装备加入 EQUIPMENT 表
- 装备效果在 player.update 中检查应用
- 头灯槽位新增

---

## Phase 2: 黑礁岛

### 地图参数
- 礁石覆盖率 40%，沙滩 20%，水 40%
- 安全区仅 2 tile 高（vs 白沙湾 4 tile）
- 潮池数量 ×3
- 新 biome：barnacle_rock、moss_rock、deep_pool

### 6 新收集物
- urchin (海胆): dig/careful, 礁石区, damage=15
- chiton (石鳖): dig, 礁石区
- octopus_sm (小章鱼): chase, 潮池, 逃跑 AI
- abalone (鲍鱼): dig, 深潮池, 稀有
- seaglass (海玻璃): auto, 沙滩, 3 颜色变体
- crab_rock (石蟹): grab, 礁石, 比沙蟹更快

### 博物馆
- 甲壳馆（Crustacean Hall）
- 展位：沙蟹、石蟹、海胆、石鳖、藤壶

### 新机制
- 苔藓礁石：无防滑鞋 → 随机滑倒（2 秒无法移动）
- 深潮池：无水桶装备 → 不能采集

---

## Phase 3: 海草甸

### 地图参数
- 海草覆盖 35%，淤泥 40%，水 25%
- 大量半透明海草覆盖层
- 淤泥 tile 上移动速度 ×0.7
- 随机暗坑陷阱

### 6 新收集物
- seahorse (海马): careful/net, 海草区
- seadragon (海龙): chase, 高海草, 稀有
- goby (虾虎鱼): qte, 淤泥浅水
- nudibranch (海蛞蝓): pickup, 海草叶面, 多色
- sand_dollar (沙钱): dig, 淤泥
- horseshoe_crab (鲎): bulky, 深水泥滩, 稀有

### 博物馆
- 鱼类馆（Fish Hall）
- 展位：海马、海龙、虾虎鱼、鲎、海蛞蝓

### 新机制
- 淤泥减速（涉水靴可免疫）
- 暗坑陷阱：随机陷入 3 秒
- 高海草遮挡视野（头灯可穿透）

---

## Phase 4: 打磨

### 音效
- AudioContext 为基础
- 海浪：noise → lowpass → gain LFO
- 采集：短 sine 音
- 受伤：方波 burst
- 珍宝：上升三音
- 所有音效在 audio.js 中程序化生成

### 海滩选择 UI
- 村庄新增第 5 建筑「海图」
- 列表显示已解锁海滩
- 锁定项显示解锁条件

### 数据平衡目标
- 白沙湾单次预期收益：300-400 金币
- 黑礁岛：400-600 金币（更高风险）
- 海草甸：350-500 金币（中等风险，特殊产出）
- 博物馆展区完成约需 5-7 次出海
