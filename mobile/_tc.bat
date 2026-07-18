@echo off
cd /d c:\Users\Nauman\Desktop\SAPIO\mobile
"C:\Program Files\nodejs\npm.cmd" exec tsc -- --noEmit -p tsconfig.json > _tsc_out.txt 2>&1
echo EXIT=%ERRORLEVEL% > _exit.txt
