@echo off
REM Start local dev server for Catholic Sleep Radio
echo Starting Catholic Sleep Radio server on http://localhost:8080 ...
python -m http.server 8080
if errorlevel 1 (
    echo Python not found. Trying py launcher...
    py -m http.server 8080
)
