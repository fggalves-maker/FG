@echo off
rem Abre o painel DRE Gerencial 2026. De dois cliques neste arquivo.
chcp 65001 >nul
cd /d "%~dp0"
title Painel DRE Gerencial 2026

where py >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Python nao encontrado.
  echo  Instale em https://www.python.org/downloads/ marcando "Add python.exe to PATH"
  echo  e depois de dois cliques neste arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist "DRE Gerencial 2026*.xlsb" (
  echo.
  echo  Planilha nao encontrada.
  echo  Copie o arquivo "DRE Gerencial 2026_v7.9.xlsb" ^(ou outra versao^) para esta pasta:
  echo  %~dp0
  echo.
  pause
  exit /b 1
)

py -c "import streamlit, pyxlsb, pyarrow, openpyxl" >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Primeira execucao: instalando os componentes. Isso leva de 1 a 3 minutos...
  echo.
  py -m pip install --disable-pip-version-check -r requirements.txt
  if errorlevel 1 (
    echo.
    echo  Nao foi possivel instalar os componentes. Verifique a internet e tente de novo.
    pause
    exit /b 1
  )
)

echo.
echo  Abrindo o painel no navegador...
echo  Na primeira vez a leitura da base leva cerca de 1 minuto.
echo  Deixe esta janela aberta enquanto usa o painel. Para encerrar, feche esta janela.
echo.
py -m streamlit run app.py --browser.gatherUsageStats false
pause
