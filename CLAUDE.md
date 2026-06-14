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

**Importante al desplegar cambios en JS/CSS/audio:** incrementar la versión de caché en `sw.js` (línea 1, constante `CACHE = 'angeldice-v1'`) para que los clientes descarten la caché anterior y descarguen los nuevos archivos.

## Arquitectura

Todo el juego vive en `js/game.js` con tres objetos globales:

- **`Modal`** — sistema de diálogos: `Modal.show(options)` / `Modal.hide()`. Soporta `autoClose: 'btnKey|ms'` para cierre automático. Incrementa/decrementa `juego.enDialogo` para bloquear los toques mientras hay un diálogo abierto.

- **`Sonido`** — audio vía Web Audio API. Carga `audio/n0.ogg`–`audio/n5.ogg` (0–3 = cuatro colores, 4 = acierto total de secuencia, 5 = fallo). Requiere `Sonido.unlock()` en el primer gesto del usuario para desbloquear el contexto de audio en móviles.

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
