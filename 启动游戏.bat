@echo off
chcp 65001 >nul
title 潮汐猎人 Tide Hunter

echo.
echo   🌊 潮汐猎人 Tide Hunter MVP
echo   ────────────────────────────
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [错误] 未找到 Node.js，请先安装：
    echo   https://nodejs.org 下载 LTS 版本即可
    echo.
    pause
    exit /b 1
)

:: 启动服务器
echo   正在启动本地服务器...
start http://localhost:3000
node server.js

pause
