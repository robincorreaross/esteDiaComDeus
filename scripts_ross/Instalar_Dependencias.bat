@echo off
chcp 65001 >nul
title Este Dia Com Deus - Instalador de Dependencias
cd /d "%~dp0"

echo ========================================================
echo   Instalando dependencias do projeto no Python...
echo ========================================================
echo.

python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo.
echo ========================================================
echo   Instalacao concluida com sucesso!
echo   Voce ja pode dar 2 cliques em Abrir_Painel.bat
echo ========================================================
echo.
pause
