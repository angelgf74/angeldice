# Angel Dice

Juego de memoria de colores y secuencias, al estilo *Simon Says*. La app ilumina una secuencia de sectores de colores con su sonido; el jugador debe repetirla tocando los sectores en el mismo orden. Cada acierto añade un paso más a la secuencia. El objetivo: llegar al nivel más alto posible.

- Número de sectores configurable (de 3 a 8, 4 por defecto).
- Sonido sintetizado en tiempo real con la Web Audio API, sin ficheros de audio.
- Récord personal guardado en el dispositivo.
- Funciona sin conexión.

Disponible en dos versiones que comparten el mismo código de juego:

| Versión | Tecnología | Publicidad |
|---|---|---|
| **Web (PWA)** | HTML/CSS/JS puro, instalable, Service Worker cache-first | Google AdSense |
| **Android** | Apache Cordova (`cordova-android` 13) | AdMob (configurado para público infantil) |

## Estructura

```
angeldice/
├── shared/           Código común a ambas plataformas
│   ├── css/app.css
│   └── js/game.js    Lógica completa del juego (Modal, Sonido, juego)
├── pwa/              Versión web
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js         Service Worker
│   └── deploy.sh     Despliegue al servidor
└── android/          Proyecto Cordova
    ├── config.xml
    ├── www/          Web empaquetada en la app
    ├── hooks/        Parches sobre el proyecto Android generado
    ├── android-config/  Reglas de R8 / minificación
    └── release/      Scripts de build y firma, notas de versión
```

En local, `pwa/shared` y `android/www/shared` son *junctions* de directorio (`mklink /J`) que apuntan a `shared/`, de modo que ambas versiones usan exactamente los mismos ficheros. Git no guarda junctions: en un clon nuevo aparecen como copias normales. Para recrearlas en Windows, desde la raíz del repositorio:

```bat
rmdir /s /q pwa\shared android\www\shared
mklink /J pwa\shared shared
mklink /J android\www\shared shared
```

## Versión web (PWA)

El Service Worker solo se registra en `localhost` o bajo HTTPS, así que hay que servir la carpeta con un servidor local (no vale abrir el fichero con `file://`):

```bash
cd pwa
python -m http.server 8080
# o bien
npx serve .
```

Y abrir `http://localhost:8080`.

### Despliegue

```bash
cd pwa
bash deploy.sh
```

Copia los ficheros por SCP al servidor y recarga nginx. Antes, actualiza automáticamente la versión de caché en `sw.js` para que los clientes descarguen los nuevos assets. Requiere acceso SSH configurado con el alias `agfserver-angel`.

## Versión Android

Requisitos:

- Node.js y Cordova CLI
- Android SDK (`ANDROID_HOME`)
- JDK 21 (por ejemplo, el JBR incluido en Android Studio)
- Gradle 8.14

```bash
cd android
npm install
cordova platform add android
cordova build android            # build de depuración
```

Build de release firmado (genera `release/AngelDice.aab` para Google Play):

```bat
set KEYSTORE_PASS=...
android\release\Firmar.bat
```

El keystore de firma no está en el repositorio.

### Hooks de Cordova

`platforms/` se regenera con cada `cordova platform add`, por eso las personalizaciones nativas viven en hooks:

- `hooks/after_prepare/set_immersive.js`: modo inmersivo (oculta barras del sistema).
- `hooks/after_prepare/back_to_background.js`: el botón "atrás" envía la app a segundo plano en lugar de cerrar la actividad (evita un cierre inesperado del WebView con el SDK de anuncios cargado).
- `hooks/copy-android-config.js`: copia la configuración de R8 de `android-config/` al proyecto generado.

## Autor

Ángel Galán Fernández
