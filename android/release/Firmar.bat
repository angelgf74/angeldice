@echo off
setlocal
: ============================================================
:  Script de firma para AngelDice -- requiere JDK 17+ y ANDROID_HOME configurado
:  Variables de entorno necesarias (definir antes de ejecutar):
:    KEYSTORE_PASS   -- contrasena de la keystore
:    ANDROID_HOME    -- ruta al SDK de Android (ej: C:\Users\angel\AppData\Local\Android\Sdk)
:  Uso:
:    set KEYSTORE_PASS=tu_contrasena
:    release\Firmar.bat
: ============================================================

if "%ANDROID_HOME%"=="" set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk

: El JDK del sistema (25) rompe Gradle 8.x al compilar los scripts de build.
: Se usa el JBR (JDK 21) embebido en Android Studio, que sí es compatible.
set "JBR_HOME=C:\Program Files\Android\Android Studio\jbr"
if exist "%JBR_HOME%\bin\java.exe" (
    set "JAVA_HOME=%JBR_HOME%"
    set "PATH=%JBR_HOME%\bin;%PATH%"
) else (
    echo AVISO: no se encontro el JBR de Android Studio en "%JBR_HOME%".
    echo        Si el build falla con "Unsupported class file major version",
    echo        instala un JDK 21 y define JAVA_HOME manualmente.
)

: cordova-android no usa el gradlew del proyecto: busca "gradle" en el PATH.
: Se añade el Gradle 8.14.2 ya cacheado por el propio Gradle en %%USERPROFILE%%\.gradle.
if not defined GRADLE_BIN (
    for /f "delims=" %%G in ('dir /b /s "%USERPROFILE%\.gradle\wrapper\dists\gradle-8.14.2-bin\gradle.bat" 2^>nul') do set "GRADLE_BIN=%%~dpG"
)
if defined GRADLE_BIN (
    set "PATH=%GRADLE_BIN%;%PATH%"
) else (
    echo AVISO: no se encontro Gradle 8.14.2 cacheado en %%USERPROFILE%%\.gradle\wrapper\dists.
    echo        Si el build falla con "Could not find an installed version of Gradle",
    echo        instala Gradle 8.14.2 y añadelo al PATH, o define GRADLE_BIN=carpeta\bin antes de ejecutar este script.
)

if "%KEYSTORE_PASS%"=="" (
    echo ERROR: La variable KEYSTORE_PASS no esta definida.
    echo Ejemplo: set KEYSTORE_PASS=tu_contrasena
    exit /b 1
)

set BUILDTOOLS=%ANDROID_HOME%\build-tools\37.0.0
set APKSIGNER=%BUILDTOOLS%\apksigner.bat
set ZIPALIGN=%BUILDTOOLS%\zipalign.exe
set KEYSTORE=AngelDice-key.keystore

set APK_UNSIGNED=..\platforms\android\app\build\outputs\apk\release\app-release-unsigned.apk
set APK_ALIGNED=AngelDice-aligned.apk
set APK_SIGNED=AngelDice.apk
set AAB_UNSIGNED=..\platforms\android\app\build\outputs\bundle\release\app-release.aab
set AAB_SIGNED=AngelDice.aab

echo.
echo Que formato desea generar?
echo   1) APK
echo   2) AAB (Android App Bundle - para Google Play)
echo   3) Ambos
echo.
set /p FORMATO=Elige (1/2/3):

if "%FORMATO%"=="1" goto SOLO_APK
if "%FORMATO%"=="2" goto SOLO_AAB
if "%FORMATO%"=="3" goto AMBOS
echo ERROR: Opcion no valida.
exit /b 1

:SOLO_APK
call "%~dp0_build_apk.bat"
if errorlevel 1 exit /b 1
goto INSTALAR

:SOLO_AAB
call "%~dp0_build_aab.bat"
if errorlevel 1 exit /b 1
goto FIN

:AMBOS
call "%~dp0_build_apk.bat"
if errorlevel 1 exit /b 1
call "%~dp0_build_aab.bat"
if errorlevel 1 exit /b 1
goto INSTALAR

:INSTALAR
echo.
set /p INST=Instalar APK en dispositivo conectado? (s/n):
if /i "%INST%"=="s" adb install -r "%~dp0%APK_SIGNED%"

:FIN
echo.
echo Proceso completado.
