@echo off
rem ============================================================================
rem  TK3 Tournament Manager - compartir la app con un enlace de Cloudflare
rem
rem  Haz doble clic en este archivo. Hace, por orden:
rem    1. Descarga la ultima version de GitHub (git pull, solo si no pisa nada).
rem    2. Pone al dia las dependencias de Python y de Node.
rem    3. Arranca la API (FastAPI, puerto 8000) y la web (Angular, puerto 4200),
rem       cada una en su propia ventana.
rem    4. Abre un tunel rapido de Cloudflare y te ensena el enlace (y lo copia).
rem
rem  Para cortar: cierra las tres ventanas (API, web y tunel).
rem  MariaDB tiene que estar arrancada antes, como siempre.
rem ============================================================================
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title TK3 - Compartir con enlace

echo.
echo  === TK3 Tournament Manager: compartir con enlace ===
echo.

rem ---------- 1. Última versión ----------
echo [1/4] Buscando la última versión en GitHub...
set "CAMBIOS="
for /f "delims=" %%c in ('git status --porcelain --untracked-files^=no') do set "CAMBIOS=1"
if defined CAMBIOS (
    echo.
    echo  Tienes cambios sin subir en esta carpeta:
    git status --short --untracked-files=no
    echo.
    echo  No actualizo para no pisarlos. Se arranca la versión que ya tienes.
    echo.
) else (
    git pull --ff-only
    if errorlevel 1 (
        echo.
        echo  No se ha podido actualizar ^(sin internet o la rama ha cambiado^).
        echo  Se arranca la versión que ya tienes.
        echo.
    )
)

rem ---------- 2. Dependencias ----------
echo [2/4] Poniendo al día las dependencias...
if not exist "backend\venv\Scripts\python.exe" (
    echo  Creando el entorno de Python ^(solo la primera vez^)...
    python -m venv backend\venv || goto :error
)
"backend\venv\Scripts\python.exe" -m pip install -q -r backend\requirements.txt || echo  Aviso: pip no ha podido revisar las dependencias de Python. Sigo.
if not exist "backend\.env" (
    echo.
    echo  Falta backend\.env con los datos de la base de datos.
    echo  Copia backend\.env.example como backend\.env y rellénalo.
    goto :error
)
pushd frontend
call npm install --no-audit --no-fund --loglevel=error || echo  Aviso: npm no ha podido revisar las dependencias de la web. Sigo.
popd

rem ---------- 3. API y web ----------
echo [3/4] Arrancando la API y la web...
start "TK3 - API (no cerrar)" /d "%~dp0backend" cmd /k "venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "TK3 - Web (no cerrar)" /d "%~dp0frontend" cmd /k "npx ng serve --host 127.0.0.1 --port 4200"

echo  Esperando a que la web esté lista (la primera vez tarda un poco)...
set /a INTENTOS=0
:esperar_web
timeout /t 3 /nobreak >nul
curl -s -o nul http://127.0.0.1:4200 && goto :web_lista
set /a INTENTOS+=1
if !INTENTOS! lss 60 goto :esperar_web
echo  La web no responde. Mira la ventana "TK3 - Web" por si hay un error.
goto :error
:web_lista
echo  Web lista en http://localhost:4200

rem ---------- 4. Túnel de Cloudflare ----------
echo [4/4] Abriendo el túnel de Cloudflare...
set "CLOUDFLARED=cloudflared"
where cloudflared >nul 2>&1 || call :buscar_cloudflared
if not defined CLOUDFLARED goto :error

set "LOG=%TEMP%\tk3-tunel.log"
if exist "%LOG%" del "%LOG%"
start "TK3 - Tunel Cloudflare (no cerrar)" "%CLOUDFLARED%" tunnel --no-autoupdate --url http://127.0.0.1:4200 --logfile "%LOG%"

set "ENLACE="
set /a INTENTOS=0
:esperar_enlace
timeout /t 2 /nobreak >nul
if not exist "%LOG%" goto :sin_enlace_aun
for /f "delims=" %%u in ('powershell -NoProfile -Command "$m = Select-String -Path $env:LOG -Pattern 'https://[a-z0-9-]+[.]trycloudflare[.]com' | Select-Object -First 1; if ($m) { $m.Matches[0].Value }"') do set "ENLACE=%%u"
:sin_enlace_aun
if defined ENLACE goto :enlace_listo
set /a INTENTOS+=1
if !INTENTOS! lss 30 goto :esperar_enlace
echo  Cloudflare no ha dado el enlace. Mira la ventana "TK3 - Tunel Cloudflare".
goto :error

:enlace_listo
echo !ENLACE!| clip
echo.
echo  ==============================================================
echo.
echo     Enlace para compartir:  !ENLACE!
echo.
echo     (ya está copiado: pégalo con Ctrl+V)
echo.
echo  ==============================================================
echo.
echo  El enlace funciona mientras estén abiertas las ventanas de la
echo  API, la web y el túnel. Cada vez que lo arranques sale uno nuevo.
echo.
start "" "!ENLACE!"
pause
exit /b 0

rem ---------- Ayudantes ----------
:buscar_cloudflared
rem winget lo instala aquí, y la ventana actual aún no lo ve en el PATH
for %%p in ("%ProgramFiles(x86)%\cloudflared\cloudflared.exe" "%ProgramFiles%\cloudflared\cloudflared.exe") do (
    if exist %%p (
        set "CLOUDFLARED=%%~p"
        exit /b 0
    )
)
echo  No tienes cloudflared. Lo instalo con winget (solo la primera vez)...
winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
for %%p in ("%ProgramFiles(x86)%\cloudflared\cloudflared.exe" "%ProgramFiles%\cloudflared\cloudflared.exe") do (
    if exist %%p (
        set "CLOUDFLARED=%%~p"
        exit /b 0
    )
)
echo  No se ha podido instalar. Descárgalo de
echo  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
set "CLOUDFLARED="
exit /b 1

:error
echo.
echo  Algo ha fallado. Lee el mensaje de arriba.
pause
exit /b 1
