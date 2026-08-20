@echo off
chcp 65001 >nul
title Este Dia Com Deus - Bot WhatsApp
cd /d "%~dp0"

echo ========================================================
echo   Executando Robo - Este Dia Com Deus...
echo ========================================================
echo.

python este_dia_bot.py

echo.
echo ========================================================
echo   Execucao finalizada.
echo ========================================================
echo.
pause
