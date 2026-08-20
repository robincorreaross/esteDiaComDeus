@echo off
chcp 65001 >nul
title Este Dia Com Deus - Painel de Controle
cd /d "%~dp0scripts_ross"

python este_dia_gui.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Ocorreu uma falha ao iniciar o painel.
    pause
)
