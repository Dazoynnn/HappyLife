# Round 1: 存档 + 引导 + 描述 + 遗产修正

> 日期: 2026-05-31 | 分支: alpha

## F1: 存档系统

### 设计
- 存储介质: `localStorage`，key = `"tideHunter_save"`
- 存储时机: 每次 `returnToVillage()` 后自动保存
- 加载时机: `Game` 构造函数末尾，检测到存档则恢复

### 存储内容
```json
{
  "day": 5,
  "moonIndex": 3,
  "tripsCompleted": 5,
  "gold": 320,
  "aquarium": [{ "id": "crab_sand", "name": "沙蟹", "output": 1, "count": 2 }],
  "museum": ["shell_fan", "starfish"],
  "legacies": [],
  "seaPearls": 1,
  "seaPearlFragments": 3.5,
  "slots": 12,
  "maxWeight": 20,
  "equippedTool": null,
  "equippedGloves": null,
  "equippedShoes": null,
  "equippedHeadlamp": null,
  "version": 1
}
```

### 实现
- `Inventory.toJSON()` → 返回可序列化对象
- `Inventory.fromJSON(data)` → 从对象恢复状态
- `Game.saveGame()` → 拼接完整存档对象，写入 localStorage
- `Game.loadGame()` → 读取并恢复，失败则静默跳过
- 在 `returnToVillage()` 末尾调用 `this.saveGame()`
- 在构造函数末尾调用 `this.loadGame()`

### 不存档的内容（每次出海重置）
- 背包物品（回村已结算）
- HP/体力（回村恢复）
- 装备效果（回村重新出海时重置）

## F2: 新手引导

### 设计
- 首次加载（localStorage 无存档）→ 村庄场景显示半透明操作面板
- 面板列出所有按键 + 简短说明
- 底部显示 "按任意键继续"
- 关闭后存 `"tideHunter_tutorial_seen" = "1"` 到 localStorage
- 再次加载不再显示

### 面板内容
```
        🌊 潮汐猎人 — 操作指南

  海滩操作                  村庄操作
  WASD    移动              Q/W/E/R/T  切换建筑
  Shift   奔跑              S/X        出售/全部出售
  E       采集              方向键      选择
  Tab/B   背包              空格/回车   出海
  Esc     返回岸边安全区

  背包操作
  方向键   选择物品
  S       出售  A  水族箱  M  博物馆

          按任意键开始游戏
```

### 实现
- `js/tutorial.js` 新文件 — `TutorialOverlay` 类
- 半透明黑色遮罩 + 居中白色面板
- `game.js` 构造函数中判断是否需要显示

## F3: 修复遗产"待定"

### 修改
- `shop.js` 鱼类馆 `legacyDesc: '鱼类精通 (待定)'` → `'负重大师 (背包负重+10kg)'`
- `data.js` weight_mastery 相关注释同步更新

## F4: 物品描述显示

### 设计
- 背包面板：选中物品时，物品名称下方显示灰色小字 description
- 背包面板底部增加一行：显示当前选中物品的描述
- 未选中物品时显示 "选择一个物品查看详情"

### 实现
- `ui.js` `renderBackpack()` 底部增加描述行
- 读取 `COLLECTIBLES[item.id]?.description` 显示
- `_getCollectibleDefSync` 补充 description 字段
