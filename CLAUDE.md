# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Angel Dice es un juego de memoria tipo Simon Says. El repositorio contiene dos proyectos:

- **`pwa/`** — versión web como PWA (Progressive Web App). HTML/CSS/JS puro, sin sistema de build. Las pruebas están en `pruebas/` (ver «Pruebas»).
- **`android/`** — versión Android con Cordova. Incluye AdMob (`admob-plus-cordova`) y `cordova-plugin-device`.

## Desarrollo local (PWA)

Para trabajar con la PWA (Service Worker requiere HTTPS o localhost):

```bash
node pruebas/servidor.mjs pwa 8765
```

Abrir `http://localhost:8765` en el navegador. El servidor no tiene dependencias y quita de los `.html` los scripts de terceros (AdSense y analítica) para no generar visitas al probar; con `?real=1` los sirve tal cual. El Service Worker solo se registra bajo HTTPS o localhost; en `file://` no funciona.

## Pruebas

```bash
node --test "pruebas/*.test.mjs"
```

`pruebas/arnes.mjs` carga `shared/js/game.js`, sin tocarlo, en un contexto de `node:vm` con navegador y reloj simulados; las pruebas avanzan el tiempo a mano. Solo usan módulos de Node: no hay `package.json`. `pruebas/` no se publica.

## Despliegue (PWA)

Con `srv` (skill `servidor`), desde el repo: `srv.json` (en la raíz) publica `pwa/` como web estática en https://angeldice.angelgf.com.es/.

```bash
srv estado                       # qué release hay publicada
srv subir                        # ensayo; srv subir --publicar para publicar
srv volver                       # vuelve a la release anterior (con ensayo)
```

- Solo se publican los ficheros de `web.ficheros` en `srv.json` (`index.html`, `manifest.json`, `sw.js`, `favicon.svg`, `icons/` y `shared/`) y solo lo que git tiene. Un fichero nuevo que haya que servir se añade ahí y, si es un asset, también a `PRECACHE` en `sw.js`.
- Una ruta que no existe da 404: no es una SPA.
- **La versión de caché la pone `srv subir`**: el paso propio `deploy/version-de-cache.mjs` cambia `CACHE` en el `sw.js` del paquete a `angeldice-<release>`. El `sw.js` del repo no se toca.
- srv no publica con cambios sin commit.

## Código compartido (`shared/`)

- **`shared/css/app.css`** — estilos comunes (modal, botones, canvas).
- **`shared/js/game.js`** — lógica completa. Contiene `Modal`, `Sonido` y `juego`. La variable `_isAndroid` (detecta `cordova` en runtime) activa ramas específicas de cada plataforma: registro de SW e install prompt en PWA; AdMob en Android.

Cada proyecto accede a estos ficheros mediante una **junction de directorio** (`shared/`) creada con `mklink /J`. En el repo son enlaces transparentes (git guarda los ficheros también bajo `pwa/shared/` y `android/www/shared/`); srv y el build de Cordova los siguen sin configuración extra.

## Arquitectura (PWA)

Todo el juego vive en `shared/js/game.js` con tres objetos globales:

- **`Modal`** — sistema de diálogos: `Modal.show(options)` / `Modal.hide()`. Soporta `autoClose: 'btnKey|ms'` para cierre automático (hoy no lo usa ningún diálogo). El título se escribe como texto; el contenido, como HTML. Incrementa/decrementa `juego.enDialogo` para bloquear los toques mientras hay un diálogo abierto.

- **`Sonido`** — sintetiza audio mediante la Web Audio API (sin ficheros externos). `play(id)`: 0–7 = tono sinusoidal del color, de `392 + 62 × id` Hz; 8 = arpegio ascendente de 4 notas (acierto); 9 = barrido sawtooth descendente (fallo). Requiere `Sonido.unlock()` en el primer gesto del usuario para desbloquear el contexto de audio en móviles; mientras el contexto no esté en marcha, `play` pide reanudarlo y guarda solo el último tono pedido, que suena al reanudarse si tiene menos de 250 ms (el primer color tras pulsar «Jugar»); nunca se acumulan tonos.

- **`juego`** — lógica completa del juego. El canvas `#t1` ocupa toda la pantalla; `juego.draw(color)` redibuja todo y solo pinta (quien enciende un color pide antes su sonido con `juego.play(id)`). `juego.estado` dice de quién es el turno (`espera`, `demo`, `mostrando`, `turno`, `acierto`, `fin`): el tablero solo acepta toques en `turno`. El tablero y los botones de la barra inferior responden en `pointerdown`; «Instalar» va aparte, en `click`, porque el navegador solo acepta `prompt()` dentro de un gesto completo. En Android, el intersticial se pide en `juego.reiniciar` (tras «Jugar otra vez», nunca en el fallo), con el límite de `juego.tocaIntersticial` (3 niveles superados, 3 derrotas y 90 s), y el diálogo «Jugar» no aparece hasta que el anuncio se cierra o falla (o pasan 3 s sin aviso del plugin). El sector `qi` va de `qi × 360/N` a `(qi + 1) × 360/N` grados, desde las 3 en punto y en el sentido de las agujas del reloj. Con 4 cuadrantes coincide con el logo: azul (0) abajo a la derecha, amarillo (1) abajo a la izquierda, verde (2) arriba a la izquierda y rojo (3) arriba a la derecha. Un sector apagado se pinta con su color oscurecido (`juego.oscurecer(color, 0.55)`) y encendido con el color pleno, algo mayor y con halo.

### Estado persistido en `localStorage` (`shared/js/game.js`)

| Clave | Valor |
|---|---|
| `conaudio` | `'true'`/`'false'`; sin valor, sonido activado |
| `ayudaaliniciar` | `'true'`/`'false'`: la primera vez el diálogo de inicio explica cómo se juega |
| `record` | máximo de niveles superados (longitud de la secuencia menos uno) |
| `numcuadrantes` | número de sectores activos (3–8, defecto 4) |

### Service Worker (`pwa/sw.js`, solo PWA)

Estrategia cache-first, solo para peticiones GET del mismo origen; las de terceros (anuncios, analítica) no se interceptan. La lista `PRECACHE` debe incluir todos los assets estáticos (`pruebas/pwa.test.mjs` lo comprueba). Las navegaciones se buscan en la caché ignorando la query (`/?fbclid=…` carga sin red); los assets, con su URL exacta. La constante `CACHE` la cambia `srv subir` en cada release (ver Despliegue), y así se invalidan las cachés antiguas de los clientes.

`index.html` pide cada asset con la misma URL que tiene en `PRECACHE`, sin `?v=` ni otra query: `caches.match` compara también la query, y si no coincide el fichero nunca sale de la caché y sin red el juego no carga (pasaba con `game.js?v=1.0.0`).

## Proyecto Android (`android/`)

Basado en Cordova (`cordova-android ^13`). La versión vive en `android/config.xml` (`gplay version` la muestra y la sube).

Plugins:
- `cordova-plugin-device`
- `admob-plus-cordova` — AdMob ID: `ca-app-pub-8600791204816041~2246022069`. El plugin está en su última versión (2.0.0-alpha.19, noviembre de 2024) y no se publica nada nuevo. El SDK de Google que usa (`play-services-ads`) se fija aparte, en `PLAY_SERVICES_VERSION` de `android/package.json`. Esa variable se aplica al instalar el plugin: tras cambiarla hay que reinstalarlo con `cordova plugin rm admob-plus-cordova --nosave` y `cordova prepare android` (desde `android/`). La versión que acaba en el paquete se lee en `play-services-ads.properties`, en la raíz del APK.

El código de la aplicación web dentro del proyecto Cordova está en `android/www/`.

## Publicar en Google Play

Igual en todos los proyectos Android, con `gplay` (skill `google-play`), desde `android/`:

    gplay version --parche        # o --menor, --mayor, x.y.z
    gplay compilar                # AAB firmado y verificado en release/
    gplay subir --canal internal  # ensayo; con --publicar, de verdad

La firma la hace `gplay compilar`. El keystore está en `~/.google-play/keystores/` y su
contraseña en el Administrador de credenciales de Windows. En el proyecto no hay
contraseñas ni scripts de firma. La configuración está en `android/playstore/gplay.json`,
las notas en `android/playstore/listing/<idioma>/changelogs/<versionCode>.txt` y la ficha
en `android/playstore/listing/` (`gplay ficha descargar` / `publicar`).

## Integraciones externas (PWA)

- **Google AdSense** (`ca-pub-8600791204816041`) — script async en `<head>` de `pwa/index.html`.
- **Web Analytics propio** — tracker en `https://webanalytics-api.angelgf.com.es/tracker.js` con site ID `8e7cef69-3f4f-4ec6-bef7-9fe7a1c3477f`, cargado con `async` al final del `<body>`. El juego arranca en `DOMContentLoaded`, sin esperar a ninguno de los dos.
