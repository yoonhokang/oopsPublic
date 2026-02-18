@echo off
echo Starting Local Web Server...
echo Please ensure Python is installed and added to PATH.
echo Opening browser...
start http://localhost:8080
python -m http.server 8080
pause
