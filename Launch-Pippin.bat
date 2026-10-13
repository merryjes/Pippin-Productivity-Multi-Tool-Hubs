@echo off
title Pippin Cozy Study Desktop
echo Starting Pippin Cozy Study Companion...

:: Check for Microsoft Edge or Chrome
start msedge.exe --app="file:///C:/Users/ADMIN/Pippin/index.html" --window-size=500,580 2>nul
if %ERRORLEVEL% EQU 0 goto :done

start chrome.exe --app="file:///C:/Users/ADMIN/Pippin/index.html" --window-size=500,580 2>nul
if %ERRORLEVEL% EQU 0 goto :done

start "" "C:\Users\ADMIN\Pippin\index.html"

:done
exit
