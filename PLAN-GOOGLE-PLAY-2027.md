# Plan de acción — requisitos Google Play 2026/2027

Proyecto: **AngelDice** (`es.angelgf.angeldice`, Cordova)
Referencia: https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html

## 1. Memoria dinámica / cobertura DEX — deadline **febrero 2027**

Estado actual: sin preferencia de minify en `config.xml` → el build de Android sale con R8 desactivado (0% de cobertura de shrink/ofuscación).

Acciones:
- Añadir en `config.xml`, dentro de `<platform name="android">`:
  ```xml
  <preference name="android-minifyEnabled" value="true" />
  <preference name="android-shrinkResources" value="true" />
  ```
- Regenerar la plataforma (`cordova platform rm android && cordova platform add android`, o `cordova prepare android`) para que el `build.gradle` generado recoja la preferencia.
- Compilar `cordova build android --release` y probar la app completa a mano: al ser un juego de dados sin dependencias nativas complejas, el riesgo de rotura por ofuscación es bajo.
- Confirmar en Play Console (Android vitals → DEX) que la cobertura supera el 25% exigido.

## 2. Migración segura entre dispositivos (zero-tap sign-in) — deadline **abril 2027**

Estado actual: la app no tiene sistema de login.

**No aplica.** No se requiere ninguna acción para este requisito.
