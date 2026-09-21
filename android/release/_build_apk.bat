@echo off
echo.
echo ========== APK ==========
echo BUILD...
cd /d "%~dp0.."
call cordova build android --release -- --packageType=apk
if errorlevel 1 ( echo ERROR: fallo el build APK. & exit /b 1 )
cd /d "%~dp0"

echo ZIPALIGN...
if exist "%APK_ALIGNED%" del "%APK_ALIGNED%"
"%ZIPALIGN%" -v 4 "%APK_UNSIGNED%" "%APK_ALIGNED%"
if errorlevel 1 ( echo ERROR: fallo zipalign. & exit /b 1 )

echo APKSIGNER...
if exist "%APK_SIGNED%" del "%APK_SIGNED%"
call "%APKSIGNER%" sign --ks "%KEYSTORE%" --ks-key-alias AngelDice --ks-pass env:KEYSTORE_PASS --out "%APK_SIGNED%" "%APK_ALIGNED%"
if errorlevel 1 ( echo ERROR: fallo la firma del APK. & exit /b 1 )

call "%APKSIGNER%" verify --verbose "%APK_SIGNED%"
if exist "%APK_ALIGNED%" del "%APK_ALIGNED%"
echo APK listo: %~dp0%APK_SIGNED%
