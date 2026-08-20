@echo off
chcp 65001 >nul
title Este Dia Com Deus - Painel de Controle
cd /d "%~dp0"

echo ========================================================
echo   Iniciando Painel de Controle - Este Dia Com Deus...
echo ========================================================
echo.

python este_dia_gui.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Ocorreu uma falha ao iniciar o painel.
    echo Verifique se o Python esta instalado no seu computador.
    echo.
    pause
)
