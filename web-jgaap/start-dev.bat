@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 日本基準 会計判断支援アプリの開発サーバを起動しています...
echo ブラウザで http://localhost:3001 が開きます。
echo 終了する場合はこのウィンドウで Ctrl+C を押すか、ウィンドウを閉じてください。
echo.
start /B cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3001"
npm run dev
pause
