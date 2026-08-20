@echo off
chcp 65001 >nul
title Este Dia Com Deus - Bot WhatsApp
cd /d "%~dp0scripts_ross"

python este_dia_bot.py

echo.
echo ========================================================
echo   Execucao finalizada.
echo ========================================================
echo.
pause
