@echo off
title MEP Engineering & Trading - Cheque Printer
cd /d "%~dp0"
echo ========================================================
echo  MEP ENGINEERING & TRADING COMPANY (PVT) LTD
echo  Cheque & Voucher Print System
echo  Starting local server on http://localhost:8888 ...
echo ========================================================
start "" "http://localhost:8888"
node --env-file-if-exists=.env server.js
pause

