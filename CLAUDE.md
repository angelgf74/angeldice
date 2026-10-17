# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Angel Dice es un juego de memoria tipo Simon Says. El repositorio contiene dos proyectos:

- **`pwa/`** — versión web como PWA (Progressive Web App). HTML/CSS/JS puro, sin sistema de build ni tests.
- **`android/`** — versión Android con Cordova. Incluye AdMob (`admob-plus-cordova`) y `cordova-plugin-device`.

## Desarrollo local (PWA)

Para trabajar con la PWA (Service Worker requiere HTTPS o localhost):

```bash
cd pwa
# Con Python
python -m http.server 8080
# Con Node
npx serve .
```

Abrir `http://localhost:8080` en el navegador. El Service Worker solo se registra bajo HTTPS o localhost; en `file://` no funciona.

## Despliegue (PWA)

```bash
cd pwa
bash deploy.sh
```

Copia los archivos al servidor `agfserver-angel` vía SCP y recarga nginx. Requiere acceso SSH configurado con ese alias en `~/.ssh/config`.

**La versión de caché se actualiza automáticamente** al ejecutar `deploy.sh` (mediante `sed` sobre `sw.js`). Solo es necesario hacerlo a mano si se despliega por otro medio.

## Código compartido (`shared/`)

- **`shared/css/app.css`** — estilos comunes (modal, botones, canvas).
- **`shared/js/game.js`** — lógica completa. Contiene `Modal`, `Sonido` y `juego`. La variable `_isAndroid` (detecta `cordova` en runtime) activa ramas específicas de cada plataforma: registro de SW e install prompt en PWA; AdMob en Android.

Cada proyecto accede a estos ficheros mediante una **junction de directorio** (`shared/`) creada con `mklink /J`. En el repo son enlaces transparentes; el SCP y el build de Cordova los siguen sin configuración extra.

## Arquitectura (PWA)

Todo el juego vive en `shared/js/game.js` con tres objetos globales:

- **`Modal`** — sistema de diálogos: `Modal.show(options)` / `Modal.hide()`. Soporta `autoClose: 'btnKey|ms'` para cierre automático. Incrementa/decrementa `juego.enDialogo` para bloquear los toques mientras hay un diálogo abierto.

- **`Sonido`** — sintetiza audio mediante la Web Audio API (sin ficheros externos). `play(id)`: 0–3 = tono sinusoidal por color (392/330/262/220 Hz), 4 = arpeggio ascendente de 4 notas, 5 = barrido sawtooth descendente de fallo. Requiere `Sonido.unlock()` en el primer gesto del usuario para desbloquear el contexto de audio en móviles.

- **`juego`** — lógica completa del juego. El canvas `#t1` ocupa toda la pantalla; `juego.draw(color, paso)` redibuja todo en cada frame. Los cuatro cuadrantes (azul=0, amarillo=1, verde=2, rojo=3) se mapean a sectores del arco: `idx = (y < cy) ? ((x < cx) ? 2 : 3) : ((x < cx) ? 1 : 0)`.

### Estado persistido en `localStorage` (`shared/js/game.js`)

| Clave | Valor |
|---|---|
| `conaudio` | `'true'`/`'false'` |
| `ayudaaliniciar` | `'true'`/`'false'` (se muestra solo la primera vez) |
| `record` | número máximo de nivel alcanzado |
| `numcuadrantes` | número de sectores activos (3–8, defecto 4) |

### Service Worker (`pwa/sw.js`, solo PWA)

Estrategia cache-first. La lista `PRECACHE` debe incluir todos los assets estáticos. Al actualizar assets, cambiar la constante `CACHE` para invalidar cachés antiguas en clientes.

## Proyecto Android (`android/`)

Basado en Cordova (`cordova-android ^13`). Versión actual: **1.1.11**.

Plugins:
- `cordova-plugin-device`
- `admob-plus-cordova` — AdMob ID: `ca-app-pub-8600791204816041~2246022069`

El código de la aplicación web dentro del proyecto Cordova está en `android/www/`.

## Integraciones externas (PWA)

- **Google AdSense** (`ca-pub-8600791204816041`) — script async en `<head>` de `pwa/index.html`.
- **Web Analytics propio** — tracker en `https://angelgf.com.es/webanalyticsapi/tracker.js` con site ID `8e7cef69-3f4f-4ec6-bef7-9fe7a1c3477f`, cargado al final del `<body>`.
