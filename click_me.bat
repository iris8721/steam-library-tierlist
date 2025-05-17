@echo off
set PROJECT_PATH=%~dp0
cd /d %PROJECT_PATH%

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not found in PATH.
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed or not found in PATH.
    pause
    exit /b 1
)

if not exist "server.js" (
    echo Error: server.js not found in the current directory.
    pause
    exit /b 1
)

if not exist ".env" (
    echo Warning: .env file not found. Creating a sample .env file...
    echo STEAM_API_KEY=your_api_key_here > .env
    echo Created .env file. Please edit it to add your Steam API key.
    notepad .env
    pause
    exit /b 1
)

findstr /C:"STEAM_API_KEY" .env > nul
if %errorlevel% neq 0 (
    echo Error: STEAM_API_KEY not found in .env file.
    echo Please add your Steam API key to the .env file.
    notepad .env
    pause
    exit /b 1
)

findstr /C:"STEAM_API_KEY=" .env | findstr /C:"your_api_key_here" > nul
if %errorlevel% equ 0 (
    echo Error: Please replace the placeholder with your actual Steam API key in the .env file.
    notepad .env
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo Server starting...
start "Steam Tier List Server" cmd /k "node server.js"

timeout /t 3 /nobreak > nul
echo Opening application in browser...
start http://localhost:3000

echo The server is now running!
echo To stop the server, close the command prompt window that opened.

exit /b 0