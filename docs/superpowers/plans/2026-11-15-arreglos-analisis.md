# Arreglos del análisis de Angel Dice — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los fallos de partida, audio, anuncios, ritmo e imagen que encontró el análisis del 15 de noviembre de 2026, en cinco fases que se pueden publicar por separado.

**Architecture:** Todo el juego sigue en `shared/js/game.js` con sus tres objetos globales. La pieza nueva es `juego.estado`, una sola variable que dice quién tiene el turno y sustituye a `ReproduciendoSecuencia`; la reproducción pasa de un contador de ticks a una cadena de pasos con duraciones con nombre. Las pruebas cargan `game.js` sin tocarlo en un contexto de `node:vm` con navegador y reloj simulados.

**Tech Stack:** HTML, CSS y JavaScript sin build. Pruebas con `node --test` (Node 24, ya instalado; sin `package.json` ni dependencias).

**Spec:** el informe de análisis entregado en la conversación del 15-nov-2026. No está en el repo; cada tarea cita el hallazgo que arregla con su `fichero:línea` de antes del cambio.

## Global Constraints

- Sin dependencias, frameworks ni pasos de build. Las pruebas usan solo módulos de Node.
- `shared/` se edita una vez, pero git guarda tres copias (`shared/`, `pwa/shared/`, `android/www/shared/`, unidas por junctions): cada commit que toque `shared/` lleva `git add shared pwa/shared android/www/shared`.
- `index.html` pide cada asset con la misma URL que tiene en `PRECACHE`, sin query. Un fichero nuevo que se sirva va en `srv.json` (`web.ficheros`) y en `PRECACHE`.
- `pruebas/` y `docs/` no se publican: no están en `web.ficheros` ni en `android/www`.
- Rama `arreglos-analisis`, un commit por tarea. Push, `srv subir --publicar` y `gplay` solo cuando Angel lo pida, y siempre con ensayo antes. `srv subir --publicar` se niega con el árbol sucio (usa `git status --porcelain`, así que un fichero sin seguimiento también cuenta).
- No se leen ni se muestran keystores, contraseñas de firma ni la clave de la cuenta de servicio.
- Textos de la interfaz en español con tildes.
- El récord guardado en `localStorage` (`record`) sigue significando «niveles superados»: no hay migración de datos.

## Review Focus

Condiciones que el informe no nombra como caso de prueba y que más probablemente fallen en uso real. Cada una tiene su prueba en la tarea indicada.

1. Volver de segundo plano o cerrar un diálogo en mitad de la secuencia: se espera que la secuencia se repita entera, no que siga por la mitad (tarea 3).
2. Girar o redimensionar con un color encendido: se espera que siga encendido (tarea 4).
3. `localStorage` bloqueado, que lanza al leer o escribir: se espera que el juego arranque con los valores por defecto (tarea 4).
4. Cambiar el número de cuadrantes y perder: se espera que la partida siguiente use el número nuevo aunque ya no haya demo (tarea 5).
5. Intersticial que no carga o falla al mostrarse: se espera que la partida siguiente se pueda empezar igual (tarea 8).

## Decisiones tomadas (revísalas antes de ejecutar)

- **El diálogo inicial no se cierra solo.** Hoy «Atento» se cierra a los 5 s y la partida empieza sin gesto del usuario, con el audio aún bloqueado por el navegador. Queda un diálogo con botón «Jugar» que no caduca.
- **Reinicio sin diálogo ni demo.** «Jugar otra vez» arranca directo. La demo se ve una vez por sesión.
- **Tras un intersticial sí hay diálogo «Jugar».** Así la partida nunca empieza debajo del anuncio y no depende de que el plugin (versión alfa) avise del cierre. Cuesta un toque más en, como mucho, una de cada tres derrotas.
- **Límite del intersticial:** 3 niveles superados o más, 3 derrotas desde el anterior y 90 s desde el anterior o desde el arranque.
- **Sonido activado por defecto** cuando no hay valor guardado.
- **Sin sonido propio de «tu turno».** El arpegio queda solo para el acierto; el turno se indica con texto.
- **Corrijo una recomendación del informe:** propuse `defer` para el tracker y arrancar en `DOMContentLoaded`. Está mal: los scripts con `defer` se ejecutan antes de `DOMContentLoaded`, así que el arranque seguiría esperando al tracker. Va con `async` (tarea 14). No he leído `tracker.js`: si depende de ejecutarse antes de que termine la carga, hay que comprobarlo.

## Fuera de este plan

Necesitan una decisión tuya o son trabajo aparte; no bloquean nada de lo de abajo.

- **AdSense en la PWA:** quitarlo o configurarlo entero (`ads.txt`, consentimiento, bloque fuera del tablero). Sin saber si ingresa algo, no lo decido yo.
- **Política de privacidad:** hace falta la URL para enlazarla en la ayuda. No sé si existe.
- **Ficha de Play** (capturas, gráfico de funciones, descripción): después de la fase 4, porque las capturas deben mostrar el aspecto nuevo. Se publica con `gplay ficha`.
- **Cabeceras** (`frame-ancestors`, HSTS): dependen de cómo admita `srv.json` un nginx propio en webs estáticas; no lo he comprobado.
- **Récord por número de cuadrantes:** el récord actual no dice con cuántos se logró; hay que decidir a cuál se asigna.
- **Botones HTML y `<dialog>` nativo** (accesibilidad), **paleta de 8 sectores** y lo pendiente de `pwa/MEJORAS.md`: plan propio, después de este. Con los botones HTML se arreglan también dos hallazgos que aquí no entran: «Instalar» tapa el récord y los emojis hacen de iconos.
- **CSP en `android/www/index.html`:** los diálogos usan atributos `style`, así que pide `'unsafe-inline'` o quitar antes esos estilos, y hay que probarla en dispositivo con AdMob.
- **Zona segura en iOS:** es una sospecha y no tengo dónde verla.
- `android/config.xml:5` publica tu correo en un repo público. Solo lo señalo.

## Estructura de ficheros

| Fichero | Qué cambia |
|---|---|
| `shared/js/game.js` | Estado de turno, audio, tiempos, fin de partida, anuncios, dibujo |
| `shared/css/app.css` | Diálogos oscuros, fuente del sistema |
| `pwa/index.html`, `pwa/sw.js`, `pwa/manifest.json` | Arranque, caché con query, iconos |
| `android/config.xml`, `android/hooks/after_prepare/set_immersive.js` | Lista blanca, icono adaptativo, aviso del hook |
| `android/www/js`, `css`, `img`, `templates` | Se borran |
| `pruebas/arnes.mjs` (nuevo) | Carga `game.js` con navegador y reloj simulados |
| `pruebas/*.test.mjs` (nuevos) | Una prueba por fallo arreglado |
| `pruebas/servidor.mjs` (nuevo) | Servidor estático local, sustituye al comando de Python |
| `pruebas/iconos.html` (nuevo) | Genera los PNG de los iconos desde `favicon.svg` |
| `CLAUDE.md` | Se corrige en la tarea que deja desfasada cada línea |

---

# Fase 1 — Fallos de partida

### Task 1: Arnés de pruebas y servidor local

**Files:**
- Create: `pruebas/arnes.mjs`, `pruebas/arnes.test.mjs`, `pruebas/servidor.mjs`
- Modify: `CLAUDE.md` (sección «Desarrollo local»)

**Interfaces:**
- Produces: `cargarJuego(opciones) -> objeto`, que usan todas las tareas siguientes.

```js
// pruebas/arnes.mjs
// opciones: { android = false, almacen = {}, audio = 'running', compartir = false,
//             ancho = 390, alto = 844, dpr = 1 }
//   almacen: objeto inicial de localStorage; con 'roto', getItem y setItem lanzan.
//   android: define `cordova` y un `admob` falso.
//   compartir: define navigator.share, que devuelve una promesa pendiente.
export function cargarJuego(opciones) { /* ... */ }
// Devuelve:
//   juego, Modal, Sonido   los globales de game.js. Sus arrays son de otro contexto:
//                          para comparar con deepEqual, copiar con [...array].
//   reloj.ahora            milisegundos simulados
//   reloj.programar(fn, ms) el setTimeout que se inyecta en el contexto
//   reloj.avanzar(ms)      ejecuta en orden setTimeout, setInterval y requestAnimationFrame (cada 16 ms)
//   almacen                el objeto detrás de localStorage; setItem guarda String(valor)
//   audio                  { state, osciladores, reanudar() }; reanudar() pone 'running',
//                          resuelve los resume() pendientes y devuelve una promesa
//   lienzo                 { width, height, style, cambiosDeTamano }; cambiosDeTamano cuenta
//                          las asignaciones a width
//   eventos                [{ t, tipo: 'luz' | 'sonido', valor, estado }], uno por cada
//                          juego.draw(color) y cada juego.play(id); estado es juego.estado
//   arrancar()             dispara DOMContentLoaded y load (y deviceready con android),
//                          y avanza 1600 ms (splash)
//   dialogo()              null, o { titulo, contenido, botones: string[] }
//   pulsar(nombre)         clic en ese botón del diálogo; lanza si no existe
//   hastaEstado(e, max = 60000)   avanza de 10 en 10 ms hasta juego.estado === e; lanza si no llega
//   jugarHastaNivel(n)     arrancar, primer botón del diálogo y aciertos hasta estar en 'turno'
//                          con Secuencia.length === n
//   ocultar(bool)          cambia document.hidden y dispara visibilitychange
//   redimensionar(w, h)    cambia innerWidth e innerHeight y dispara resize
//   compartido             solo con compartir: { datos, resolver() }
//   anuncios               solo con android: { mostrados, fallar }; con fallar = true,
//                          InterstitialAd.show() rechaza
```

- [ ] **Step 1: Escribir la prueba del arnés**

```js
// pruebas/arnes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

test('game.js arranca en el arnés y abre el primer diálogo', () => {
    const j = cargarJuego({ almacen: { ayudaaliniciar: 'false' } });
    j.arrancar();
    assert.equal(j.dialogo().botones.length, 1);
    assert.equal(j.juego.Secuencia.length, 1);
});

test('el reloj simulado ejecuta los temporizadores en orden', () => {
    const j = cargarJuego();
    const orden = [];
    j.reloj.programar(() => orden.push('b'), 20);
    j.reloj.programar(() => orden.push('a'), 10);
    j.reloj.avanzar(30);
    assert.deepEqual(orden, ['a', 'b']);
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `node --test pruebas/`
Expected: FAIL, `Cannot find module ... arnes.mjs`

- [ ] **Step 3: Implementar `cargarJuego` en `pruebas/arnes.mjs`**

Con `node:vm`: `vm.createContext` con `window`, `document`, `localStorage`, `navigator`, `AudioContext`, los temporizadores del reloj simulado y `console`; después `vm.runInContext` del texto de `shared/js/game.js`. El contexto 2D del canvas es un `Proxy` cuyas funciones no hacen nada y que devuelve `{ width: 0 }` en `measureText` y otro `Proxy` en `createLinearGradient` y `createRadialGradient`. `eventos` se rellena envolviendo `juego.draw` y `juego.play` después de cargar.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `node --test pruebas/`
Expected: 2 pruebas, 0 fallos

- [ ] **Step 5: Crear `pruebas/servidor.mjs`**

Uso: `node pruebas/servidor.mjs pwa 8765`. Sirve la carpeta en `127.0.0.1`, rechaza rutas fuera de ella, `Cache-Control: no-cache`, y quita de los `.html` los `<script src="https://…">` salvo con `?real=1`, para no generar visitas ni impresiones al probar.

Run: `node pruebas/servidor.mjs pwa 8765` y abrir `http://localhost:8765`
Expected: el juego carga y la pestaña Red no muestra peticiones a `googlesyndication.com` ni a `webanalytics-api.angelgf.com.es`

- [ ] **Step 6: Corregir `CLAUDE.md`**

En «Desarrollo local (PWA)», sustituir el bloque de Python y `npx serve` por `node pruebas/servidor.mjs pwa 8765`, y añadir una sección «Pruebas» con `node --test pruebas/`. Python no está instalado en esta máquina.

- [ ] **Step 7: Commit**

```bash
git add pruebas CLAUDE.md
git commit -m "pruebas: arnés con navegador simulado y servidor local sin dependencias"
```

### Task 2: Un solo estado de turno

Hallazgo: `game.js:761`. `toque()` solo mira `ReproduciendoSecuencia` y acepta toques tras el último acierto, durante la demo, tras cerrar «Perdiste» y durante la animación de acierto.

**Files:**
- Modify: `shared/js/game.js` (`juego`, `reproducirSecuencia`, `demoCuadrantes`, `iniciarSecuencia`, `toque`)
- Test: `pruebas/turno.test.mjs`

**Interfaces:**
- Produces: `juego.estado: 'espera' | 'demo' | 'mostrando' | 'turno' | 'acierto' | 'fin'`. Desaparece `juego.ReproduciendoSecuencia`.

| Estado | Desde | Hasta |
|---|---|---|
| `espera` | `iniciarSecuencia` | empieza la demo o la reproducción |
| `demo` | empieza `demoCuadrantes` | su callback |
| `mostrando` | empieza `reproducirSecuencia` | se apaga el último color |
| `turno` | fin de la reproducción | último acierto o fallo |
| `acierto` | último acierto del nivel | empieza la reproducción siguiente |
| `fin` | fallo | `iniciarSecuencia` |

- [ ] **Step 1: Escribir las pruebas**

```js
// pruebas/turno.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

const nuevo = (o) => cargarJuego({ almacen: { ayudaaliniciar: 'false' }, ...o });

test('un doble toque del último color no hace perder', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    const c = j.juego.Secuencia[0];
    j.juego.toque(c); j.juego.toque(c);
    j.hastaEstado('turno');
    assert.equal(j.dialogo(), null);
    assert.equal(j.juego.Secuencia.length, 2);
});

test('los toques durante la demo no cuentan', () => {
    const j = nuevo(); j.arrancar(); j.pulsar(j.dialogo().botones[0]);
    assert.equal(j.juego.estado, 'demo');
    j.juego.toque(0);
    assert.equal(j.juego.Indice, -1);
    assert.equal(j.dialogo(), null);
});

test('los toques durante la animación de acierto no cuentan', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.toque(j.juego.Secuencia[0]);
    while (j.juego.estado === 'acierto') { j.juego.toque(0); j.reloj.avanzar(50); }
    assert.equal(j.juego.Indice, -1);
    assert.equal(j.dialogo(), null);
});

test('tras fallar, otro toque no abre un segundo diálogo', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.toque((j.juego.Secuencia[0] + 1) % j.juego.numCuadrantes);
    j.reloj.avanzar(2000);
    j.pulsar(j.dialogo().botones.at(-1));
    const antes = j.juego.Indice;
    j.juego.toque(0);
    assert.equal(j.juego.Indice, antes);
    assert.equal(j.dialogo(), null);
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `node --test pruebas/turno.test.mjs`
Expected: FAIL; `hastaEstado` lanza porque `juego.estado` no existe

- [ ] **Step 3: Añadir `juego.estado` y sus transiciones**

`estado: 'espera'` en el objeto; las transiciones de la tabla en `iniciarSecuencia`, `demoCuadrantes`, `reproducirSecuencia` y `toque`. Primera línea de `toque`: `if (juego.estado !== 'turno') return;`. Borrar `ReproduciendoSecuencia` y sus tres usos.

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test pruebas/`
Expected: 0 fallos

- [ ] **Step 5: Commit**

```bash
git add shared pwa/shared android/www/shared pruebas
git commit -m "el tablero solo acepta toques en el turno del jugador"
```

### Task 3: El tono suena al encenderse el color

Hallazgos: `game.js:694-704` (el tono llega unos 600 ms tarde), `game.js:85-88` (con el audio suspendido los tonos se acumulan y suenan juntos), `game.js:692` (los diálogos no detienen la reproducción).

**Files:**
- Modify: `shared/js/game.js` (`Sonido.play`, `draw`, `reproducirSecuencia`, `demoCuadrantes`, `toque`, `animarAcierto`), `CLAUDE.md` (descripción de `Sonido`)
- Test: `pruebas/audio.test.mjs`

**Interfaces:**
- Consumes: `juego.estado` (tarea 2).
- Produces:
  - `juego.draw(color)`: solo pinta. Desaparece el parámetro `paso` y la llamada a `juego.play` de dentro. Quien enciende un color llama antes a `juego.play(id)`.
  - `juego.msInicial = 300`, `juego.msEncendido = 700`, `juego.msApagado = 300`, `juego.msVacioFinal = 1000`, `juego.msDestelloFinal = 1000`. Son los tiempos de hoy; la tarea 6 los cambia. Desaparecen `tIntervalo`, `pasosEncendido` y `pasosApagado`.
  - `juego.bloqueado() -> boolean`: `juego.pausa || juego.enDialogo > 0`.

- [ ] **Step 1: Escribir las pruebas**

```js
// pruebas/audio.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

const nuevo = (o) => cargarJuego({ almacen: { ayudaaliniciar: 'false', conaudio: 'true' }, ...o });

test('el tono suena en el instante en que se enciende el color', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    const c = j.juego.Secuencia[0];
    const de = (tipo) => j.eventos.find(e => e.tipo === tipo && e.valor === c && e.estado === 'mostrando');
    assert.equal(de('sonido').t, de('luz').t);
});

test('con el audio suspendido los tonos se descartan', async () => {
    const j = nuevo({ audio: 'suspended' }); j.arrancar();
    for (const id of [0, 1, 2, 3]) j.Sonido.play(id);
    await j.audio.reanudar();
    assert.equal(j.audio.osciladores, 0);
    j.Sonido.play(0);
    assert.equal(j.audio.osciladores, 1);
});

for (const interrumpir of ['segundo plano', 'diálogo']) {
    test(`tras ${interrumpir}, la secuencia se repite entera`, () => {
        const j = nuevo(); j.jugarHastaNivel(1);
        j.juego.toque(j.juego.Secuencia[0]);
        j.hastaEstado('mostrando');
        j.reloj.avanzar(500);
        if (interrumpir === 'diálogo') j.juego.mostrarRecord(); else j.ocultar(true);
        j.reloj.avanzar(3000);
        const desde = j.eventos.length;
        if (interrumpir === 'diálogo') j.pulsar('Cerrar'); else j.ocultar(false);
        j.hastaEstado('turno');
        const tonos = j.eventos.slice(desde).filter(e => e.tipo === 'sonido' && e.valor < 8).map(e => e.valor);
        assert.deepEqual(tonos, [...j.juego.Secuencia]);
    });
}
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `node --test pruebas/audio.test.mjs`
Expected: FAIL en las cuatro (la primera con una diferencia de 600 ms)

- [ ] **Step 3: `Sonido.play` descarta con el contexto parado**

Si `Sonido.ctx.state !== 'running'`: llamar a `Sonido.ctx.resume()` (con `catch` vacío) y salir sin sintetizar ni reintentar.

- [ ] **Step 4: Reescribir `reproducirSecuencia` como cadena de pasos**

Sin `setInterval`. Orden: `msInicial` apagado; por cada color, `juego.play(c)` y `juego.draw(c)` juntos, `msEncendido`, `juego.draw(-1)`, `msApagado`; después `msVacioFinal` apagado, `juego.play(8)` con `juego.draw(-2)` durante `msDestelloFinal`, `juego.draw(-1)` y `estado = 'turno'`. Antes de cada paso, si `juego.bloqueado()`: apagar, comprobar de nuevo cada 100 ms y, al desbloquearse, volver a empezar desde `msInicial` con el primer color.

- [ ] **Step 5: Quitar el audio de `draw` y actualizar las llamadas**

`toque`: `juego.play(color); juego.draw(color);`. `demoCuadrantes`: igual con `i`. `animarAcierto`: `juego.play(8)` antes del primer `juego.draw(-2)`. El resto de llamadas pasan a `juego.draw(-1)` o `juego.draw(-2)`. En `juego.play`, quitar la traducción de `-2` a `8`.

- [ ] **Step 6: Ejecutar y ver que pasan**

Run: `node --test pruebas/`
Expected: 0 fallos

- [ ] **Step 7: Corregir `CLAUDE.md`**

En la descripción de `Sonido`: ids 0–7 son los colores, con frecuencia `392 + 62 × id` Hz; 8 es el arpegio de acierto y 9 el barrido de fallo. En la de `juego`: `juego.draw(color)` solo pinta.

- [ ] **Step 8: Oírlo**

Run: `node pruebas/servidor.mjs pwa 8765`, activar el sonido y jugar hasta el nivel 3
Expected: cada tono coincide con su color y ninguno pisa al siguiente. El audio solo se ha comprobado instrumentado: este paso es el primero en que alguien lo oye.

- [ ] **Step 9: Commit**

```bash
git add shared pwa/shared android/www/shared pruebas CLAUDE.md
git commit -m "el tono suena al encenderse el color y no se acumula con el audio suspendido"
```

### Task 4: Encendido único, redibujado y almacenamiento seguro

Hallazgos: `game.js:777` (temporizadores de apagado sin cancelar), `:463` y `:226` (redibujar apaga el color encendido), `:500-501` (el canvas se redimensiona en cada fotograma), `:370` (el círculo central cuenta como color), `:186` (`localStorage` sin `try/catch`).

**Files:**
- Modify: `shared/js/game.js` (`inicializar`, `handleClick`, `setConAudio`, `setNumCuadrantes`, `draw`, `mostrarSplash`, `toque`)
- Test: `pruebas/robustez.test.mjs`

**Interfaces:**
- Produces:
  - `juego.ajustarCanvas()`: único sitio que asigna `canvas.width`, `height` y `style`, y fija `juego.ancho` y `juego.alto`. Lo llaman `inicializar` (antes del splash) y el listener de `resize`, nadie más: `draw` y `mostrarSplash` dejan de asignar tamaños y leen `juego.ancho` y `juego.alto`.
  - `juego.encender(color, ms)`: guarda `juego._encendido = color`, pinta y programa un único apagado; cancela el anterior con `clearTimeout`. `ms` de un toque: `juego.msToque = 250`.
  - `juego.redibujar()`: `juego.draw(juego._encendido)`. `draw` guarda en `juego._encendido` el color que pinta.
  - `juego.leer(clave) -> string | null` y `juego.guardar(clave, valor)`: `localStorage` dentro de `try/catch`; `leer` devuelve `null` si falla.
  - `juego._rCen`: radio del círculo central, calculado en `draw`.

- [ ] **Step 1: Escribir las pruebas**

```js
// pruebas/robustez.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

const nuevo = (o) => cargarJuego({ almacen: { ayudaaliniciar: 'false' }, ...o });
const ultimaLuz = (j) => j.eventos.findLast(e => e.tipo === 'luz').valor;

test('un toque rápido no lo apaga el temporizador del toque anterior', () => {
    const j = nuevo(); j.jugarHastaNivel(3);
    const [a, b] = j.juego.Secuencia;
    j.juego.toque(a); j.reloj.avanzar(200);
    j.juego.toque(b); j.reloj.avanzar(150);
    assert.equal(ultimaLuz(j), b);
    j.reloj.avanzar(150);
    assert.equal(ultimaLuz(j), -1);
});

test('girar la pantalla no apaga el color encendido', () => {
    const j = nuevo(); j.jugarHastaNivel(2);
    const a = j.juego.Secuencia[0];
    j.juego.toque(a);
    j.redimensionar(844, 390);
    assert.equal(ultimaLuz(j), a);
});

test('el canvas solo cambia de tamaño al arrancar y al redimensionar', () => {
    const j = nuevo(); j.jugarHastaNivel(2);
    assert.equal(j.lienzo.cambiosDeTamano, 1);
    j.redimensionar(844, 390);
    assert.equal(j.lienzo.cambiosDeTamano, 2);
});

test('tocar el círculo central no cuenta como color', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.handleClick(j.juego.centroX, j.juego.centroY);
    assert.equal(j.juego.Indice, -1);
});

test('con localStorage bloqueado el juego arranca con valores por defecto', () => {
    const j = cargarJuego({ almacen: 'roto' });
    j.arrancar();
    assert.notEqual(j.dialogo(), null);
    assert.equal(j.juego.numCuadrantes, 4);
    assert.equal(j.juego.record, 0);
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `node --test pruebas/robustez.test.mjs`
Expected: FAIL en las cinco

- [ ] **Step 3: Implementar las cinco funciones del bloque Interfaces**

`draw` empieza con `ctx.save()` y termina con `ctx.restore()`: hoy cada `canvas.width = W` borra el estado del contexto, y sin esa asignación `lineJoin = 'round'` del título se quedaría puesto para los sectores del fotograma siguiente. `handleClick` sale si `juego.distancia(x, y, cx, cy) < juego._rCen`. El temporizador de «Sonido ON» y el listener de `resize` llaman a `juego.redibujar()`. Todos los `localStorage.getItem` y `setItem` pasan por `leer` y `guardar`.

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test pruebas/`
Expected: 0 fallos

- [ ] **Step 5: Commit**

```bash
git add shared pwa/shared android/www/shared pruebas
git commit -m "un solo temporizador de apagado, redibujado sin apagar y almacenamiento con try/catch"
```

---

# Fase 2 — Flujo y ritmo

### Task 5: Inicio, fin de partida y reinicio

Hallazgos: `game.js:738-757` (cada reinicio repite «Atento» y la demo), `:781, 805, 816` (tres números distintos para el mismo resultado), `:814` (no se ve el color correcto ni se avisa del récord), `:796` (la URL de compartir en Android da 403), `:808` («Compartir» reinicia sin esperar), `:416-448` (la ayuda inicial es un muro de texto).

**Files:**
- Modify: `shared/js/game.js` (`inicializar`, `iniciarSecuencia`, `toque`, `mostrarRecord`), `shared/css/app.css`
- Test: `pruebas/partida.test.mjs`

**Interfaces:**
- Consumes: `juego.estado`, `juego.encender`, `juego.guardar`.
- Produces:
  - `juego.urlPublica = 'https://angeldice.angelgf.com.es/'`, en las dos plataformas.
  - `juego.iniciarSecuencia(conDialogo: boolean)`: prepara la partida y deja `estado = 'espera'`. Con `conDialogo`, abre el diálogo de inicio y espera a «Jugar»; sin él, llama a `juego.empezar()` tras `juego.msAntesDeEmpezar = 400`.
  - `juego.empezar()`: demo si `!juego._demoVista` (y la marca), después `reproducirSecuencia`.
  - `juego.fallo()`: lo llama `toque` al fallar.
  - `juego.reiniciar(superados: number)`: en esta tarea solo llama a `juego.iniciarSecuencia(false)`. La tarea 8 le añade el anuncio.
  - `juego.textoSuperados(n) -> string`.

Textos fijados:

| Sitio | Texto |
|---|---|
| Diálogo de inicio, primera vez | título `Cómo se juega`; lista: `Mira qué colores se encienden y en qué orden.` · `Cuando ponga «Tu turno», tócalos en el mismo orden.` · `Cada nivel añade un color más.`; botón `Jugar` (`btn-green`) |
| Diálogo de inicio, resto | título `Angel Dice`; contenido `Repite la secuencia de colores.`; botón `Jugar` (`btn-green`) |
| `textoSuperados(0)` | `No has superado ningún nivel` |
| `textoSuperados(1)` | `Has superado <b>1</b> nivel` |
| `textoSuperados(n)` | `Has superado <b>n</b> niveles` |
| Fin de partida | título `😵 Fin de la partida`; con récord nuevo, además `<p class="nuevo-record">¡Nuevo récord!</p>`; botones `Compartir` (`btn-share`, solo con `navigator.share`) y `Jugar otra vez` (`btn-green`) |
| Texto al compartir | `¡He superado N niveles en Angel Dice! ¿Puedes superarme?` (con 1, `1 nivel`) |
| Diálogo de récord | `niveles superados` en lugar de `nivel más alto alcanzado` |

- [ ] **Step 1: Escribir las pruebas**

```js
// pruebas/partida.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

const nuevo = (o) => cargarJuego({ almacen: { ayudaaliniciar: 'false' }, ...o });
const fallar = (j) => {
    j.juego.toque((j.juego.Secuencia[j.juego.Indice + 1] + 1) % j.juego.numCuadrantes);
    j.reloj.avanzar(2000);
};

test('la primera vez el diálogo de inicio explica el juego; después no', () => {
    const primera = cargarJuego(); primera.arrancar();
    assert.equal(primera.dialogo().titulo, 'Cómo se juega');
    assert.deepEqual(primera.dialogo().botones, ['Jugar']);
    assert.equal(primera.almacen.ayudaaliniciar, 'false');
    const otra = nuevo(); otra.arrancar();
    assert.equal(otra.dialogo().titulo, 'Angel Dice');
});

test('el diálogo de inicio no se cierra solo', () => {
    const j = nuevo(); j.arrancar();
    j.reloj.avanzar(30000);
    assert.notEqual(j.dialogo(), null);
    assert.equal(j.juego.estado, 'espera');
});

test('al fallar parpadea el color correcto antes del diálogo', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    const correcto = j.juego.Secuencia[0];
    const desde = j.eventos.length;
    fallar(j);
    const luces = j.eventos.slice(desde).filter(e => e.tipo === 'luz' && e.valor === correcto);
    assert.equal(luces.length, 3);
});

test('fin de partida: un solo número, récord y aviso', () => {
    const j = nuevo(); j.jugarHastaNivel(3);
    fallar(j);
    assert.match(j.dialogo().contenido, /Has superado <b>2<\/b> niveles/);
    assert.match(j.dialogo().contenido, /¡Nuevo récord!/);
    assert.equal(j.juego.record, 2);
    assert.equal(j.almacen.record, '2');
    assert.deepEqual(j.dialogo().botones, ['Jugar otra vez']);
});

test('«Jugar otra vez» arranca sin diálogo ni demo', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    fallar(j); j.pulsar('Jugar otra vez');
    const desde = j.eventos.length;
    j.hastaEstado('turno');
    assert.equal(j.dialogo(), null);
    assert.equal(j.eventos.slice(desde).some(e => e.estado === 'demo'), false);
    assert.equal(j.juego.Secuencia.length, 1);
});

test('la partida siguiente usa el número de cuadrantes nuevo', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.setNumCuadrantes(6);
    fallar(j); j.pulsar('Jugar otra vez');
    assert.equal(j.juego.numCuadrantes, 6);
});

test('«Compartir» usa la URL pública y espera antes de reiniciar', async () => {
    const j = nuevo({ compartir: true }); j.jugarHastaNivel(2);
    fallar(j); j.pulsar('Compartir');
    assert.equal(j.compartido.datos.url, 'https://angeldice.angelgf.com.es/');
    assert.match(j.compartido.datos.text, /He superado 1 nivel /);
    assert.equal(j.juego.estado, 'fin');
    await j.compartido.resolver();
    assert.equal(j.juego.estado, 'espera');
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `node --test pruebas/partida.test.mjs`
Expected: FAIL en las siete

- [ ] **Step 3: Implementar `iniciarSecuencia`, `empezar`, `fallo`, `reiniciar` y `textoSuperados`**

`fallo`: `estado = 'fin'`, cancela el apagado pendiente de `encender`, `juego.play(9)`, récord si `superados > juego.record` (con `superados = Secuencia.length - 1`), tres parpadeos del color correcto (200 ms encendido, 150 ms apagado) y después el diálogo. `Compartir` llama a `juego.reiniciar` cuando la promesa de `navigator.share` se resuelve o se rechaza. El arranque de `inicializar` pasa a `mostrarSplash` y `juego.iniciarSecuencia(true)`; `mostrarAyuda` queda solo para el botón ❓.

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test pruebas/`
Expected: 0 fallos. En `turno.test.mjs`, la prueba «tras fallar…» sigue valiendo porque pulsa el último botón.

- [ ] **Step 5: Añadir `.nuevo-record` a `shared/css/app.css`**

`font-weight: bold; margin-top: 8px;` y el color dorado `#b8860b` (sobre el fondo blanco actual; la tarea 12 lo cambia a `#ffd700`).

- [ ] **Step 6: Commit**

```bash
git add shared pwa/shared android/www/shared pruebas
git commit -m "reinicio directo, color correcto al fallar y un solo número para el resultado"
```

### Task 6: Tiempos, indicador de turno y sonido por defecto

Hallazgos: `game.js:702-710` (1 s vacío y 1 s de destello tras el último color; 5,1 s hasta poder tocar en el nivel 1), `:489` (nada indica de quién es el turno), `:186` (el sonido viene apagado).

**Files:**
- Modify: `shared/js/game.js` (constantes, `reproducirSecuencia`, `toque`, `draw`, `inicializar`, texto de la ayuda)
- Test: `pruebas/ritmo.test.mjs`

**Interfaces:**
- Consumes: constantes y cadena de pasos de la tarea 3.
- Produces:
  - `juego.msEncendido = 450`, `juego.msApagado = 150`, `juego.msInicial = 300`, `juego.msTrasAcierto = 400`. Se borran `msVacioFinal`, `msDestelloFinal` y sus dos pasos.
  - `juego.textoEstado() -> string`: `'Observa'` en `demo` y `mostrando`, `'Tu turno'` en `turno`, `'¡Bien!'` en `acierto`, `''` en `espera` y `fin`.
  - `conaudio` sin valor guardado significa sonido activado.

- [ ] **Step 1: Escribir las pruebas**

```js
// pruebas/ritmo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

const nuevo = (o) => cargarJuego({ almacen: { ayudaaliniciar: 'false' }, ...o });

test('el texto de estado dice de quién es el turno', () => {
    const j = nuevo(); j.arrancar();
    assert.equal(j.juego.textoEstado(), '');
    j.pulsar('Jugar');
    assert.equal(j.juego.textoEstado(), 'Observa');
    j.hastaEstado('turno');
    assert.equal(j.juego.textoEstado(), 'Tu turno');
    j.juego.toque(j.juego.Secuencia[0]);
    assert.equal(j.juego.textoEstado(), '¡Bien!');
});

test('de «Jugar otra vez» a poder tocar pasan menos de 1,5 s', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.toque((j.juego.Secuencia[0] + 1) % 4);
    j.reloj.avanzar(2000); j.pulsar('Jugar otra vez');
    const t0 = j.reloj.ahora;
    j.hastaEstado('turno');
    assert.ok(j.reloj.ahora - t0 <= 1500);
});

test('de acertar el nivel 1 a poder tocar el 2 pasan menos de 3 s', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.toque(j.juego.Secuencia[0]);
    const t0 = j.reloj.ahora;
    j.hastaEstado('turno');
    assert.ok(j.reloj.ahora - t0 <= 3000);
});

test('el turno empieza en cuanto se apaga el último color', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    const apagado = j.eventos.findLast(e => e.tipo === 'luz' && e.estado === 'mostrando');
    const turno = j.eventos.find(e => e.estado === 'turno');
    assert.ok(turno.t - apagado.t <= 150);
});

test('sin valor guardado el sonido está activado', () => {
    const j = cargarJuego(); j.arrancar();
    assert.equal(j.juego.conAudio, true);
    const callado = cargarJuego({ almacen: { conaudio: 'false' } }); callado.arrancar();
    assert.equal(callado.juego.conAudio, false);
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `node --test pruebas/ritmo.test.mjs`
Expected: FAIL en las cinco

- [ ] **Step 3: Cambiar las constantes y quitar el vacío y el destello finales**

Tras apagar el último color: `estado = 'turno'` y `juego.redibujar()`. En `toque`, la espera tras el último acierto pasa de 1000 a `juego.msTrasAcierto`.

- [ ] **Step 4: Implementar `textoEstado` y pintarlo**

En `draw`: `titleH = pad * 5`; el título se centra en `y = pad * 1.75` y el texto de estado en `y = pad * 4`, en negrita, blanco, de `Math.max(16, pad * 1.1)` px. En apaisado esto reduce el radio del tablero unos 10 px a 844×390; es el precio de que el texto no pise el tablero.

- [ ] **Step 5: Récord legible y ayuda al día**

En la barra inferior, el tamaño del récord y de «Instalar» pasa a `Math.max(16, Math.floor(botH * 0.30))`. En `mostrarAyuda`, quitar la línea de la animación de ondas y añadir `Arriba verás «Observa» o «Tu turno».`

- [ ] **Step 6: Ejecutar y ver que pasan**

Run: `node --test pruebas/`
Expected: 0 fallos

- [ ] **Step 7: Verlo**

Run: `node pruebas/servidor.mjs pwa 8765`, a 390×844 y a 844×390 en las herramientas de desarrollo
Expected: el texto de estado no pisa ni el título ni el tablero en ninguna de las dos orientaciones

- [ ] **Step 8: Commit**

```bash
git add shared pwa/shared android/www/shared pruebas
git commit -m "ritmo más corto, indicador de turno y sonido activado por defecto"
```

### Task 7: El toque cuenta al bajar el dedo

Hallazgo: `game.js:216`. El toque cuenta al levantar el dedo y donde se levanta.

**Files:**
- Modify: `shared/js/game.js` (`inicializar`)

**Interfaces:**
- Produces: `handleClick(x, y)` recibe coordenadas en píxeles CSS relativas al canvas. La tarea 10 depende de esto.

- [ ] **Step 1: Sustituir los tres listeners por uno**

Quitar `click`, `touchstart` y `touchend`. Un `pointerdown` que llama a `juego.handleClick(e.clientX - rect.left, e.clientY - rect.top)`, sin los factores `sx` y `sy`. El CSS ya tiene `touch-action: none` en el canvas, que es lo que hacía el `preventDefault` de `touchstart`.

- [ ] **Step 2: Ejecutar las pruebas**

Run: `node --test pruebas/`
Expected: 0 fallos (el arnés llama a `handleClick` y a `toque` directamente)

- [ ] **Step 3: Probarlo con ratón y con toque emulado**

Run: `node pruebas/servidor.mjs pwa 8765`; con ratón y con el modo táctil de las herramientas de desarrollo
Expected: el color se enciende al pulsar, no al soltar; un toque produce un solo paso (el número «1 / N» sube de uno en uno); los cuatro botones de la barra inferior responden. En un móvil real no lo puedo comprobar yo.

- [ ] **Step 4: Commit**

```bash
git add shared pwa/shared android/www/shared
git commit -m "el toque cuenta al bajar el dedo (pointerdown)"
```

---

# Fase 3 — Android

No subir a Play hasta terminar esta fase: la fase 2 cambia el flujo de reinicio del que depende el anuncio.

### Task 8: Intersticial con límite

Hallazgos: `game.js:787` (intersticial en cada derrota, a la vez que el diálogo y el sonido de fallo), `:239-243` (AdMob se configura antes de `deviceready` si `window.admob` ya existe).

**Files:**
- Modify: `shared/js/game.js` (`inicializar`, `reiniciar`, `fallo`)
- Test: `pruebas/anuncios.test.mjs`

**Interfaces:**
- Consumes: `juego.reiniciar(superados)` e `iniciarSecuencia(conDialogo)` (tarea 5).
- Produces: `juego.tocaIntersticial(superados: number, ahora: number) -> boolean`. Suma uno a `juego._derrotasSinAnuncio` y devuelve `true` si `superados >= 3`, `_derrotasSinAnuncio >= 3` y `ahora - juego._ultimoAnuncio >= 90000`; al devolver `true` pone el contador a 0 y `_ultimoAnuncio = ahora`. `inicializar` pone `_ultimoAnuncio = Date.now()`.

- [ ] **Step 1: Escribir las pruebas**

```js
// pruebas/anuncios.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

const nuevo = (o) => cargarJuego({ android: true, almacen: { ayudaaliniciar: 'false' }, ...o });
const perder = (j) => {
    j.juego.toque((j.juego.Secuencia[0] + 1) % 4);
    j.reloj.avanzar(2000); j.pulsar('Jugar otra vez');
};

test('límite: nivel 3, tres derrotas y 90 s', () => {
    const { juego } = nuevo();
    juego._ultimoAnuncio = 0; juego._derrotasSinAnuncio = 0;
    const serie = [[5, 100000], [5, 100000], [2, 100000], [5, 100000],
                   [5, 150000], [5, 150000], [5, 150000], [5, 190000]];
    assert.deepEqual(serie.map(([s, t]) => juego.tocaIntersticial(s, t)),
                     [false, false, false, true, false, false, false, true]);
});

test('una derrota sin anuncio reinicia directo', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.tocaIntersticial = () => false;
    perder(j);
    assert.equal(j.anuncios.mostrados, 0);
    assert.equal(j.dialogo(), null);
});

test('con anuncio, la partida espera a «Jugar»', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.tocaIntersticial = () => true;
    perder(j);
    assert.equal(j.anuncios.mostrados, 1);
    assert.deepEqual(j.dialogo().botones, ['Jugar']);
    j.reloj.avanzar(30000);
    assert.equal(j.juego.estado, 'espera');
});

test('si el anuncio falla, se puede seguir jugando', async () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.tocaIntersticial = () => true;
    j.anuncios.fallar = true;
    perder(j);
    await Promise.resolve();
    j.pulsar('Jugar'); j.hastaEstado('turno');
    assert.equal(j.juego.Secuencia.length, 1);
});

test('en la PWA nunca se pide anuncio', () => {
    const j = cargarJuego({ almacen: { ayudaaliniciar: 'false' } }); j.jugarHastaNivel(1);
    j.juego.tocaIntersticial = () => { throw new Error('no debe llamarse'); };
    j.juego.toque((j.juego.Secuencia[0] + 1) % 4);
    j.reloj.avanzar(2000); j.pulsar('Jugar otra vez');
    assert.equal(j.dialogo(), null);
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `node --test pruebas/anuncios.test.mjs`
Expected: FAIL en las cinco

- [ ] **Step 3: Implementar `tocaIntersticial` y usarlo en `reiniciar`**

`reiniciar(superados)`: si `_isAndroid && juego.tocaIntersticial(superados, Date.now())`, llamar a `juego.MostrarPubliInterstitial()` sin esperarla y a `juego.iniciarSecuencia(true)`; si no, `juego.iniciarSecuencia(false)`. Quitar la llamada del momento del fallo.

- [ ] **Step 4: AdMob siempre en `deviceready`**

Sustituir la rama `if (window.admob)` por `document.addEventListener('deviceready', initAdMob, false)`. Cordova llama al instante a los listeners de `deviceready` registrados después de que el evento haya ocurrido.

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `node --test pruebas/`
Expected: 0 fallos

- [ ] **Step 6: Commit**

```bash
git add shared pwa/shared android/www/shared pruebas
git commit -m "intersticial con límite y fuera del momento del fallo"
```

- [ ] **Step 7: Probar en dispositivo (lo hace Angel)**

Con un AAB de `gplay compilar` en el canal interno: perder cuatro veces seguidas pasando del nivel 3, con más de 90 s de partida.
Expected: el anuncio sale como mucho una vez, después de «Jugar otra vez»; al cerrarlo se ve el diálogo «Jugar»; el banner sigue arriba. Nada de esto se puede comprobar sin dispositivo.

### Task 9: Limpieza del proyecto Android

Hallazgos: `android/www/js`, `css`, `img`, `templates` (código antiguo sin uso que se empaqueta, con jQuery 3.2.1), `android/config.xml:7-13` (lista blanca abierta), `set_immersive.js:42` (no avisa si no encuentra dónde parchear).

**Files:**
- Delete: `android/www/js/`, `android/www/css/`, `android/www/img/`, `android/www/templates/`
- Modify: `android/config.xml`, `android/hooks/after_prepare/set_immersive.js`

- [ ] **Step 1: Confirmar que nada los usa**

Run: `git grep -nE "jquery|fastclick|skeleton|font-awesome|templates/|img/logo" -- android/www/index.html android/config.xml shared`
Expected: sin resultados

- [ ] **Step 2: Borrarlos**

```bash
git rm -r android/www/js android/www/css android/www/img android/www/templates
```

- [ ] **Step 3: El hook falla si no puede parchear**

En `set_immersive.js`, antes de cada `replace` del ancla `'import android.os.Bundle;'` y `'loadUrl(launchUrl);'`: si `!src.includes(ancla)`, `throw new Error('[immersive] no se encuentra "' + ancla + '" en MainActivity.java')`. El otro hook ya lo hace así.

- [ ] **Step 4: Cerrar la lista blanca de `config.xml`**

Quitar `<access origin="*" />` y los `allow-intent` de `http`, `tel`, `sms`, `mailto` y `geo`. Se quedan `https://*/*` y `market:*`: el clic en un anuncio abre el navegador o Play.

- [ ] **Step 5: Compilar y probar en dispositivo (lo hace Angel)**

Run: `gplay compilar` desde `android/`
Expected: compila; los dos hooks escriben su línea de «parcheado» o «ya está parcheado»; el AAB no contiene `assets/www/js`. En el dispositivo, el banner carga y un clic en él abre el navegador. Si el banner no carga sin `<access origin="*" />`, se repone esa línea y se anota aquí: no lo he podido comprobar.

- [ ] **Step 6: Commit**

```bash
git add android
git commit -m "android: fuera el código antiguo sin uso, lista blanca cerrada y hook que avisa"
```

---

# Fase 4 — Diseño

### Task 10: Nitidez en pantallas de alta densidad

Hallazgo: `game.js:500-503`. El canvas no usa `devicePixelRatio`. No lo he visto: mi monitor tiene DPR 1.

**Files:**
- Modify: `shared/js/game.js` (`ajustarCanvas`, `draw`, `mostrarSplash`, `animarAcierto`)
- Test: `pruebas/nitidez.test.mjs`

**Interfaces:**
- Consumes: `juego.ajustarCanvas()` (tarea 4), coordenadas CSS en `handleClick` (tarea 7).
- Produces: `juego.dpr = Math.min(window.devicePixelRatio || 1, 3)`. `juego.ancho` y `juego.alto` siguen en píxeles CSS.

- [ ] **Step 1: Escribir las pruebas**

```js
// pruebas/nitidez.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

test('el canvas se pinta a la densidad de la pantalla', () => {
    const j = cargarJuego({ dpr: 3, ancho: 390, alto: 844 }); j.arrancar();
    assert.equal(j.lienzo.width, 1170);
    assert.equal(j.lienzo.height, 2532);
    assert.equal(j.lienzo.style.width, '390px');
    assert.equal(j.juego.ancho, 390);
});

test('la densidad se limita a 3', () => {
    const j = cargarJuego({ dpr: 4, ancho: 390, alto: 844 }); j.arrancar();
    assert.equal(j.lienzo.width, 1170);
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `node --test pruebas/nitidez.test.mjs`
Expected: FAIL, `390 !== 1170`

- [ ] **Step 3: Aplicar la densidad en `ajustarCanvas`**

`canvas.width = Math.round(W * dpr)`, igual el alto, `style` en píxeles CSS, y `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`. `draw`, `mostrarSplash` y `animarAcierto` no cambian: siguen pintando en píxeles CSS.

- [ ] **Step 4: Ejecutar y ver que pasan**

Run: `node --test pruebas/`
Expected: 0 fallos

- [ ] **Step 5: Verlo**

Run: `node pruebas/servidor.mjs pwa 8765`, con un dispositivo emulado de DPR 3 en las herramientas de desarrollo
Expected: título y número nítidos; los toques caen en el sector pulsado; las ondas de acierto siguen centradas

- [ ] **Step 6: Commit**

```bash
git add shared pwa/shared android/www/shared pruebas
git commit -m "el canvas se pinta a la densidad de la pantalla"
```

### Task 11: Tablero

Hallazgos: `game.js:676-685` (el encendido casi no se distingue y el amarillo apagado parece encendido), `:473-487` (trazo negro y sombra dura), `:538` y `:851` (el tablero está girado 90° respecto al logo), `app.css:12` (Arial).

**Files:**
- Modify: `shared/js/game.js` (`DibArco`, `draw`, `SelColor`, `handleClick`, todas las `ctx.font`), `shared/css/app.css`, `CLAUDE.md`
- Test: `pruebas/tablero.test.mjs`

**Interfaces:**
- Produces:
  - `juego.oscurecer(hex: string, factor: number) -> string`: cada canal por `factor`, redondeado, en minúsculas.
  - `juego.fuente = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif'`.
  - Sector `qi` entre `qi × 360/N` y `(qi + 1) × 360/N` grados, desde las 3 en punto y en el sentido de las agujas del reloj.

Valores fijados:

| Elemento | Valor |
|---|---|
| Sector apagado | color plano `oscurecer(color, 0.55)` |
| Sector encendido | color pleno, radio × 1,03, `shadowColor` el propio color, `shadowBlur = r × 0.15`, sin desplazamiento |
| Sombra de un sector apagado | `rgba(0,0,0,0.35)`, `shadowBlur = r × 0.06`, `shadowOffsetY = r × 0.02`, `shadowOffsetX = 0` |
| Trazo de los sectores | ninguno (se quita `ctx.stroke()`) |

- [ ] **Step 1: Escribir las pruebas**

```js
// pruebas/tablero.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

test('oscurecer multiplica cada canal', () => {
    const { juego } = cargarJuego();
    assert.equal(juego.oscurecer('#FFFF77', 0.5), '#80803c');
    assert.equal(juego.oscurecer('#338833', 1), '#338833');
});

test('con 4 cuadrantes el tablero coincide con el logo', () => {
    const j = cargarJuego({ almacen: { ayudaaliniciar: 'false' } }); j.jugarHastaNivel(1);
    const tocados = [];
    j.juego.toque = (c) => tocados.push(c);
    const { centroX: cx, centroY: cy, radio: r } = j.juego;
    const d = r / 2;
    j.juego.handleClick(cx + d, cy + d);   // abajo a la derecha: azul
    j.juego.handleClick(cx - d, cy + d);   // abajo a la izquierda: amarillo
    j.juego.handleClick(cx - d, cy - d);   // arriba a la izquierda: verde
    j.juego.handleClick(cx + d, cy - d);   // arriba a la derecha: rojo
    assert.deepEqual(tocados, [0, 1, 2, 3]);
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `node --test pruebas/tablero.test.mjs`
Expected: FAIL; la segunda da `[1, 2, 3, 0]`

- [ ] **Step 3: Girar el tablero**

En `draw`: `a0 = qi * angPer`. En `handleClick`: `norm = (ang + 360) % 360` y `a0 = idx * (360 / N)`.

- [ ] **Step 4: Implementar `oscurecer` y los valores de la tabla**

`SelColor` devuelve un color, no un degradado, y deja de recibir `ctx`.

- [ ] **Step 5: Fuente del sistema**

Todas las `ctx.font` terminan en `'px ' + juego.fuente` en lugar de `'px Arial'`. En `app.css`, `font-family: system-ui, "Segoe UI", Roboto, Arial, sans-serif`.

- [ ] **Step 6: Ejecutar y ver que pasan**

Run: `node --test pruebas/`
Expected: 0 fallos

- [ ] **Step 7: Verlo con 4 y con 8 cuadrantes**

Run: `node pruebas/servidor.mjs pwa 8765`
Expected: el color encendido se distingue de un vistazo, también el amarillo; el splash y el tablero tienen el verde arriba a la izquierda. Los factores 0,55 y 1,03 están elegidos sobre el papel: si a ojo no convencen, se ajustan aquí y se anota el valor final.

- [ ] **Step 8: Corregir `CLAUDE.md`**

En la descripción de `juego`: el sector `qi` va de `qi × 360/N` a `(qi + 1) × 360/N` grados desde las 3 en punto, en el sentido de las agujas del reloj; con 4, azul abajo a la derecha, amarillo abajo a la izquierda, verde arriba a la izquierda y rojo arriba a la derecha.

- [ ] **Step 9: Commit**

```bash
git add shared pwa/shared android/www/shared pruebas CLAUDE.md
git commit -m "tablero: encendido visible, sin trazo, orientado como el logo y fuente del sistema"
```

### Task 12: Diálogos

Hallazgos: `app.css:43-64, 129-133` (estilo de otra aplicación; contraste 3,2:1 en el título y 4,3:1 en el botón verde), `game.js:17-18` (`innerHTML` en el título), `game.js:385, 407, 409` (colores en línea).

**Files:**
- Modify: `shared/css/app.css`, `shared/js/game.js` (`Modal.show`, `mostrarConfiguracion`, `mostrarRecord`)

- [ ] **Step 1: Sustituir los estilos del diálogo**

```css
.modal { border: 0; border-radius: 16px; background: #0f2247; }
.modal-title { background: none; border: 0; padding: 18px 20px 4px; }
.modal-content { color: #d6e4ff; padding: 8px 20px 16px; }
.modal-content em { color: #9fc0ff; }
.modal-buttons { background: none; border: 0; padding: 8px 20px 20px; }
.modal-btn { min-height: 48px; border: 0; border-radius: 12px; background: #24407a; color: #fff; }
.modal-btn:hover, .modal-btn:active { background: #2f52a0; }
.modal-btn.btn-green { background: #1f7a1f; }
.modal-btn.btn-green:hover, .modal-btn.btn-green:active { background: #279527; }
.nq-btn { border: 0; background: #24407a; color: #fff; }
.nq-btn:hover, .nq-btn:active { background: #2f52a0; }
.nq-btn.nq-active { background: #ffd700; color: #0f2247; }
.nq-btn.nq-active:hover, .nq-btn.nq-active:active { background: #ffe24d; }
.nuevo-record, .record-num { color: #ffd700; }
.record-num { font-size: 4rem; font-weight: bold; line-height: 1; margin: 0 0 10px; }
.nota { color: #9fb4dd; font-size: 0.82rem; text-align: center; margin-top: 10px; }
```

Se borran `.modal-content center h1` (el diálogo «Atento» ya no existe) y las reglas antiguas que estas sustituyen. Contrastes calculados: blanco sobre `#24407a`, 10:1; blanco sobre `#1f7a1f`, 5,4:1.

- [ ] **Step 2: Quitar los colores en línea de `game.js`**

`mostrarConfiguracion`: el párrafo final usa `class="nota"`. `mostrarRecord`: `class="record-num"` para el número y `class="nota"` para el texto.

- [ ] **Step 3: El título del diálogo se escribe como texto**

En `Modal.show`: `titleEl.textContent = options.title || ''`. Los títulos son texto y emojis; el contenido sigue con `innerHTML` porque lleva etiquetas escritas en el propio código.

- [ ] **Step 4: Ejecutar las pruebas y ver los cinco diálogos**

Run: `node --test pruebas/` y `node pruebas/servidor.mjs pwa 8765`
Expected: 0 fallos; inicio, ayuda, configuración, récord y fin de partida se leen bien a 390×844, y la ayuda se desplaza dentro del diálogo

- [ ] **Step 5: Commit**

```bash
git add shared pwa/shared android/www/shared
git commit -m "diálogos oscuros con contraste AA y sin colores en línea"
```

### Task 13: Iconos

Hallazgos: `pwa/manifest.json:16,22` (`icon-512.png` es una imagen pequeña ampliada, declarada `any maskable` sin zona segura), `android/config.xml:23-26` (iconos hasta 96 px y ninguno adaptativo).

**Files:**
- Create: `pruebas/iconos.html`, `pwa/icons/icon-maskable-512.png`, `android/res/icon/android/` (`icono-144.png`, `icono-192.png`, `adaptativo-frente.png`, `adaptativo-fondo.png`)
- Modify: `pwa/icons/icon-192.png`, `pwa/icons/icon-512.png`, `pwa/manifest.json`, `pwa/sw.js` (`PRECACHE`), `android/config.xml`, `android/playstore/listing/es-419/images/icon.png`

- [ ] **Step 1: Crear `pruebas/iconos.html`**

Página que carga `../pwa/favicon.svg` en un `<img>`, lo pinta en un canvas por cada fila de la tabla y pone un enlace de descarga por fichero. Se abre con `node pruebas/servidor.mjs . 8765` en `http://localhost:8765/pruebas/iconos.html`.

| Fichero | Tamaño | Contenido |
|---|---|---|
| `icon-192.png`, `icon-512.png` | 192, 512 | el SVG a tamaño completo |
| `icon-maskable-512.png` | 512 | fondo `#004CB3` a sangre y el SVG al 60 % centrado |
| `icono-144.png`, `icono-192.png` | 144, 192 | el SVG a tamaño completo |
| `adaptativo-frente.png` | 432 | fondo transparente y el SVG al 55 % centrado |
| `adaptativo-fondo.png` | 432 | `#004CB3` liso |
| `icon.png` de la ficha | 512 | igual que `icon-512.png` |

- [ ] **Step 2: Generar los PNG y colocarlos**

Expected: `icon-512.png` nítido al 100 %; en `icon-maskable-512.png` el dibujo entero cabe en un círculo del 80 % del lado.

- [ ] **Step 3: Declarar los iconos en `pwa/manifest.json`**

`icon-192.png` e `icon-512.png` con `"purpose": "any"`; una entrada nueva para `icons/icon-maskable-512.png` con `"purpose": "maskable"`.

- [ ] **Step 4: Añadir el fichero nuevo a `PRECACHE`**

`'./icons/icon-maskable-512.png'` en `pwa/sw.js`. `srv.json` ya publica la carpeta `icons` entera.

- [ ] **Step 5: Declarar los iconos en `android/config.xml`**

Añadir `xxhdpi` (144) y `xxxhdpi` (192) como los actuales, y en esas dos y en `xhdpi` los atributos `foreground="res/icon/android/adaptativo-frente.png"` y `background="res/icon/android/adaptativo-fondo.png"`.

- [ ] **Step 6: Comprobar**

Run: `node pruebas/servidor.mjs pwa 8765` y Aplicación → Manifiesto en las herramientas de desarrollo; `gplay compilar` desde `android/`
Expected: el manifiesto no da avisos de iconos y la vista previa enmascarable no recorta el dibujo; el AAB compila. El icono adaptativo en el lanzador solo se ve en dispositivo.

- [ ] **Step 7: Commit**

```bash
git add pruebas pwa android
git commit -m "iconos regenerados desde favicon.svg, con versión enmascarable y adaptativa"
```

---

# Fase 5 — PWA

### Task 14: Arranque, caché y metadatos

Hallazgos: `game.js:956` con `pwa/index.html:25,41` (el juego espera a AdSense y al tracker), `pwa/sw.js:31` (la caché no ignora la query e intercepta peticiones ajenas), `pwa/index.html:14,18` (`og:image` relativa), `pwa/index.html:5` (`user-scalable=no`).

**Files:**
- Modify: `shared/js/game.js` (última línea), `pwa/index.html`, `pwa/sw.js`

- [ ] **Step 1: Arrancar sin esperar a terceros**

Al final de `game.js`: si `document.readyState === 'loading'`, `document.addEventListener('DOMContentLoaded', juego.inicializar)`; si no, `juego.inicializar()`. En `pwa/index.html`, el `<script>` del tracker lleva `async`.

- [ ] **Step 2: El service worker solo atiende lo suyo**

En el `fetch` de `pwa/sw.js`: salir sin `respondWith` si `e.request.method !== 'GET'` o si el origen de la URL no es `self.location.origin`. Para `e.request.mode === 'navigate'`, `caches.match(e.request, { ignoreSearch: true })`; para el resto, como ahora.

- [ ] **Step 3: Metadatos**

`og:image` y `twitter:image` con `https://angeldice.angelgf.com.es/icons/icon-512.png`; añadir `<meta property="og:url" content="https://angeldice.angelgf.com.es/">`; quitar `, user-scalable=no` del `viewport`.

- [ ] **Step 4: Ejecutar las pruebas**

Run: `node --test pruebas/`
Expected: 0 fallos (el arnés dispara `DOMContentLoaded` y `load`)

- [ ] **Step 5: Comprobar sin red y con red lenta**

Run: `node pruebas/servidor.mjs pwa 8765`; cargar una vez `http://localhost:8765/`, marcar «Sin conexión» y abrir `http://localhost:8765/?fbclid=prueba`
Expected: el juego carga. Después, con `?real=1` y el dominio `webanalytics-api.angelgf.com.es` bloqueado en la pestaña Red: el splash aparece igual de rápido. Al terminar, anular el registro del service worker de `localhost:8765`.

- [ ] **Step 6: Commit**

```bash
git add shared pwa android/www/shared
git commit -m "pwa: arranca sin esperar a terceros y carga sin red aunque la URL traiga query"
```

- [ ] **Step 7: Marcar en `pwa/MEJORAS.md` lo que este plan deja hecho**

Añadir a «Experiencia de usuario», como `[x]`: indicador de turno, reinicio directo, color correcto al fallar. La línea «Meta `og:` y Twitter Card» ya estaba marcada y ahora es cierta. En «Dificultad progresiva», cambiar `tIntervalo` y `pasosEncendido` por `msEncendido` y `msApagado`, que son las constantes que quedan.

```bash
git add pwa/MEJORAS.md
git commit -m "MEJORAS: lo que deja hecho el plan de arreglos"
```
