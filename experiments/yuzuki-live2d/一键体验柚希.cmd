@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 run_yuzuki.py
  goto end
)
where python >nul 2>nul
if %errorlevel%==0 (
  python run_yuzuki.py
  goto end
)
echo 请安装 Python 3 后再次双击本文件，或使用任意本地静态文件服务器打开 web 目录。
:end
pause
