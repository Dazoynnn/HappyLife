# Phase 4: 博物馆完善 + 打磨平衡

> 日期: 2026-05-30 | 基于 Alpha 分支

## A) 博物馆三展区

### 展区切换
- 博物馆 Tab 内左上角显示 `◀ 贝类馆 | 甲壳馆 | 鱼类馆 ▶`
- 点击箭头或按左右方向键切换 `_museumHall`

### 甲壳馆展品
- crab_sand (沙蟹), crab_rock (石蟹), urchin (海胆), chiton (石鳖), horseshoe_crab (鲎)
- 完成奖励: `crustacean_immunity` — 螃蟹/海胆攻击伤害设为0

### 鱼类馆展品
- seahorse (海马), seadragon (海龙), goby (虾虎鱼), octopus_sm (小章鱼), nudibranch (海蛞蝓)
- 完成奖励: `weight_mastery` — 背包负重上限永久+10kg

### 威望流程
- 展区满5件 → 显示红色按钮 → 点击触发 prestige(sectionId)
- 清空金币/水族箱/装备，保留博物馆记录
- 永久遗产写入 legacies[]

## D) 打磨平衡

### 数值调整
- 19种收集物: 普通(5-15金), 良(18-25金), 优(35-55金), 稀有(70-90金), 史诗(120金)
- 单次出海预期: 白沙湾200-350, 黑礁岛300-500, 海草甸250-450
- 装备价格对标3-5次出海可购一件

### 天气实际影响
- 暴雨: 稀有spawn率×2, 稀有出现提示文字
- 更新 collectibles.js spawnAll 接收 weather 参数

### 视觉反馈增强
- 暗坑踩入: renderer.triggerShake(2) + 浮动文字 "陷入淤泥!"
- 苔藓滑倒: 浮动文字 "滑倒了!" + 红色闪烁

### Bug修复
- 确保每个海滩的收集物 biome 覆盖对应 tile 类型
- 检查沙滩和浅水 biome 在三个海滩的一致性
