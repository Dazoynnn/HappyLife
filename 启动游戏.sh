#!/bin/bash
# 潮汐猎人 Tide Hunter - Mac/Linux 启动脚本

echo ""
echo "  🌊 潮汐猎人 Tide Hunter MVP"
echo "  ────────────────────────────"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "  [错误] 未找到 Node.js，请先安装："
    echo "  brew install node  或  https://nodejs.org"
    echo ""
    exit 1
fi

# 打开浏览器并启动服务器
echo "  正在启动本地服务器..."
(sleep 1 && open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null) &
node server.js
