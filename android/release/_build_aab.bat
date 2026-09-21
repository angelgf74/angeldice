@echo off
echo.
echo ========== AAB ==========
echo BUILD...
cd /d "%~dp0.."
call cordova build android --release -- --packageType=bundle
if errorlevel 1 ( echo ERROR: fallo el build AAB. & exit /b 1 )
cd /d "%~dp0"

echo JARSIGNER...
if exist "%AAB_SIGNED%" del "%AAB_SIGNED%"
copy "%AAB_UNSIGNED%" "%AAB_SIGNED%" > nul
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore "%KEYSTORE%" -storepass %KEYSTORE_PASS% -keypass %KEYSTORE_PASS% "%AAB_SIGNED%" AngelDice
if errorlevel 1 ( echo ERROR: fallo la firma del AAB. & exit /b 1 )

jarsigner -verify -verbose -certs "%AAB_SIGNED%"
echo AAB listo: %~dp0%AAB_SIGNED%
