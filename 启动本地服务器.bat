@echo off
chcp 65001 >nul
echo 正在启动本地服务器...
echo 启动后请在浏览器打开: http://localhost:8000/AI行业落地分析报告.html
echo 按 Ctrl+C 可停止服务器
echo.
python -m http.server 8000
pause
