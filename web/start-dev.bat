@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 会計判断支援アプリの開発サーバを起動しています...
echo しばらくするとブラウザが自動で開きます。
echo 終了する場合はこのウィンドウで Ctrl+C を押すか、ウィンドウを閉じてください。
echo.
start /B cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3000"
npm run dev
pause
