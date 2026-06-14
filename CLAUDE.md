# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Angel Dice es un juego de memoria tipo Simon Says implementado como PWA (Progressive Web App). Es una migración del juego Android/Cordova original. No tiene sistema de build, ni gestor de paquetes, ni tests: es HTML/CSS/JS puro.

## Desarrollo local

Para trabajar con la PWA (Service Worker requiere HTTPS o localhost):

```bash
# Con Python
python -m http.server 8080
# Con Node
npx serve .
```

Abrir `http://localhost:8080` en el navegador. El Service Worker solo se registra bajo HTTPS o localhost; en `file://` no funciona.

## Despliegue

```bash
bash deploy.sh
```

Copia los archivos al servidor `agfserver-angel` vía SCP y recarga nginx. Requiere acceso SSH configurado con ese alias en `~/.ssh/config`.

**La versión de caché se actualiza automáticamente** al ejecutar `deploy.sh` (mediante `sed` sobre `sw.js`). Solo es necesario hacerlo a mano si se despliega por otro medio.

## Arquitectura

Todo el juego vive en `js/game.js` con tres objetos globales:

- **`Modal`** — sistema de diálogos: `Modal.show(options)` / `Modal.hide()`. Soporta `autoClose: 'btnKey|ms'` para cierre automático. Incrementa/decrementa `juego.enDialogo` para bloquear los toques mientras hay un diálogo abierto.

- **`Sonido`** — sintetiza audio mediante la Web Audio API (sin ficheros externos). `play(id)`: 0–3 = tono sinusoidal por color (392/330/262/220 Hz), 4 = arpeggio ascendente de 4 notas, 5 = barrido sawtooth descendente de fallo. Requiere `Sonido.unlock()` en el primer gesto del usuario para desbloquear el contexto de audio en móviles.

- **`juego`** — lógica completa del juego. El canvas `#t1` ocupa toda la pantalla; `juego.draw(color, paso)` redibuja todo en cada frame. Los cuatro cuadrantes (azul=0, amarillo=1, verde=2, rojo=3) se mapean a sectores del arco: `idx = (y < cy) ? ((x < cx) ? 2 : 3) : ((x < cx) ? 1 : 0)`.

### Estado persistido en `localStorage`

| Clave | Valor |
|---|---|
| `conaudio` | `'true'`/`'false'` |
| `ayudaaliniciar` | `'true'`/`'false'` (se muestra solo la primera vez) |
| `record` | número máximo de nivel alcanzado |

### Service Worker (`sw.js`)

Estrategia cache-first. La lista `PRECACHE` debe incluir todos los assets estáticos. Al actualizar assets, cambiar la constante `CACHE` para invalidar cachés antiguas en clientes.

## Integraciones externas

- **Google AdSense** (`ca-pub-8600791204816041`) — script async en `<head>` de `index.html`.
- **Web Analytics propio** — tracker en `https://angelgf.com.es/webanalyticsapi/tracker.js` con site ID `8e7cef69-3f4f-4ec6-bef7-9fe7a1c3477f`, cargado al final del `<body>`.
