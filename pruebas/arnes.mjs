// Carga shared/js/game.js, sin tocarlo, en un contexto de node:vm con un navegador y un
// reloj simulados. Las pruebas avanzan el tiempo a mano con reloj.avanzar(ms).
// Uso: node --test "pruebas/*.test.mjs"
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const RUTA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'shared', 'js', 'game.js');
const FUENTE = fs.readFileSync(RUTA, 'utf8');

function crearReloj() {
    const tareas = new Map();
    let siguiente = 1;
    const reloj = { ahora: 0 };

    const anotar = (fn, ms, cada) => {
        const id = siguiente++;
        tareas.set(id, { t: reloj.ahora + Math.max(0, Number(ms) || 0), fn, cada });
        return id;
    };
    reloj.programar = (fn, ms) => anotar(fn, ms, 0);
    reloj.repetir   = (fn, ms) => anotar(fn, ms, Math.max(1, Number(ms) || 1));
    reloj.cancelar  = (id) => { tareas.delete(id); };
    reloj.fotograma = (fn) => anotar(() => fn(reloj.ahora), 16, 0);

    // Ejecuta, por orden de vencimiento y después de alta, todo lo que venza en ese plazo.
    reloj.avanzar = (ms) => {
        const fin = reloj.ahora + ms;
        for (;;) {
            let id = null;
            for (const [k, x] of tareas) {
                if (x.t > fin) continue;
                if (id === null || x.t < tareas.get(id).t) id = k;
            }
            if (id === null) break;
            const tarea = tareas.get(id);
            reloj.ahora = Math.max(reloj.ahora, tarea.t);
            if (tarea.cada) tarea.t += tarea.cada; else tareas.delete(id);
            tarea.fn();
        }
        reloj.ahora = fin;
    };
    return reloj;
}

function crearElemento(clases) {
    const lista = new Set(clases || []);
    const oyentes = {};
    let texto = '';
    const el = {
        children: [],
        style: {},
        className: '',
        classList: {
            add: (c) => { lista.add(c); },
            remove: (c) => { lista.delete(c); },
            contains: (c) => lista.has(c),
            toggle: (c, poner) => { if (poner === undefined ? !lista.has(c) : poner) lista.add(c); else lista.delete(c); }
        },
        addEventListener: (tipo, fn) => { (oyentes[tipo] = oyentes[tipo] || []).push(fn); },
        appendChild: (hijo) => { el.children.push(hijo); return hijo; },
        getAttribute: () => null,
        disparar: (tipo, evento) => { (oyentes[tipo] || []).slice().forEach((fn) => fn(evento || {})); }
    };
    // innerHTML y textContent comparten el texto: a las pruebas les basta con lo último
    // escrito. escritoComo dice por cuál de las dos propiedades llegó.
    const propiedad = (nombre) => ({
        get: () => texto,
        set: (v) => { texto = String(v); el.children = []; el.escritoComo = nombre; }
    });
    Object.defineProperty(el, 'innerHTML', propiedad('innerHTML'));
    Object.defineProperty(el, 'textContent', propiedad('textContent'));
    return el;
}

function crearContexto2d() {
    const degradado = { addColorStop() {} };
    const fijas = {
        measureText: () => ({ width: 0 }),
        createLinearGradient: () => degradado,
        createRadialGradient: () => degradado
    };
    const nada = () => {};
    return new Proxy({}, {
        get: (o, p) => (p in fijas ? fijas[p] : (p in o ? o[p] : nada)),
        set: (o, p, v) => { o[p] = v; return true; }
    });
}

export function cargarJuego(opciones = {}) {
    // documentoListo: game.js se carga con el documento ya analizado (readyState 'complete').
    const { android = false, audio: estadoAudio = 'running', compartir = false,
            ancho = 390, alto = 844, dpr = 1, documentoListo = false,
            sinPointerEvents = false } = opciones;
    const roto = opciones.almacen === 'roto';
    const almacen = roto ? {} : { ...(opciones.almacen || {}) };

    const reloj = crearReloj();
    const eventos = [];
    const avisos = [];
    const asentar = () => new Promise((hecho) => setImmediate(hecho));

    // ── Canvas ───────────────────────────────────────────────────────────────
    const ctx2d = crearContexto2d();
    const lienzo = crearElemento();
    let anchoLienzo = 300;
    lienzo.cambiosDeTamano = 0;
    lienzo.height = 150;
    Object.defineProperty(lienzo, 'width', {
        get: () => anchoLienzo,
        set: (v) => { anchoLienzo = v; lienzo.cambiosDeTamano++; }
    });
    lienzo.getContext = () => ctx2d;
    lienzo.getBoundingClientRect = () => ({ left: 0, top: 0, width: mundo.innerWidth, height: mundo.innerHeight });

    // ── Documento ────────────────────────────────────────────────────────────
    const elementos = {
        't1': lienzo,
        'modal-overlay': crearElemento(['modal-overlay', 'hidden']),
        'modal-title': crearElemento(),
        'modal-content': crearElemento(),
        'modal-buttons': crearElemento()
    };
    const oyentesDoc = {};
    const oyentesVentana = {};
    const disparar = (oyentes, tipo) => (oyentes[tipo] || []).slice().forEach((fn) => fn({ type: tipo }));
    const documento = {
        hidden: false,
        readyState: documentoListo ? 'complete' : 'loading',
        getElementById: (id) => elementos[id] || null,
        createElement: () => crearElemento(),
        querySelectorAll: () => [],
        addEventListener: (tipo, fn) => { (oyentesDoc[tipo] = oyentesDoc[tipo] || []).push(fn); },
        removeEventListener: (tipo, fn) => { oyentesDoc[tipo] = (oyentesDoc[tipo] || []).filter((x) => x !== fn); }
    };

    // ── Audio ────────────────────────────────────────────────────────────────
    const audio = { state: estadoAudio, osciladores: 0, pendientes: [] };
    audio.reanudar = () => {
        audio.state = 'running';
        audio.pendientes.splice(0).forEach((resolver) => resolver());
        return asentar();
    };
    const parametro = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
    const nodo = () => ({ connect() {}, start() {}, stop() {}, type: '', frequency: parametro(), gain: parametro() });
    class AudioFalso {
        get state() { return audio.state; }
        get currentTime() { return reloj.ahora / 1000; }
        get destination() { return {}; }
        resume() {
            return new Promise((resolver) => {
                if (audio.state === 'running') resolver(); else audio.pendientes.push(resolver);
            });
        }
        createOscillator() { audio.osciladores++; return nodo(); }
        createGain() { return nodo(); }
    }

    // ── Compartir y anuncios ─────────────────────────────────────────────────
    const navegador = {};
    let compartido;
    if (compartir) {
        compartido = { datos: null, resolver: () => asentar() };
        navegador.share = (datos) => new Promise((resolver) => {
            compartido.datos = datos;
            compartido.resolver = () => { resolver(); return asentar(); };
        });
    }
    let anuncios;
    let admob;
    if (android) {
        // cerrar(): el plugin avisa de que el jugador ha cerrado el intersticial.
        anuncios = { mostrados: 0, fallar: false, cerrar: () => disparar(oyentesDoc, 'admob.ad.dismiss') };
        admob = {
            configure: () => Promise.resolve(),
            BannerAd: class { show() { return Promise.resolve(); } },
            InterstitialAd: class {
                load() { return Promise.resolve(); }
                show() {
                    anuncios.mostrados++;
                    return anuncios.fallar ? Promise.reject(new Error('sin anuncio')) : Promise.resolve();
                }
            }
        };
    }

    // ── Contexto global de game.js ───────────────────────────────────────────
    const mundo = {
        innerWidth: ancho,
        innerHeight: alto,
        devicePixelRatio: dpr,
        location: { href: 'http://localhost:8765/' },
        document: documento,
        navigator: navegador,
        AudioContext: AudioFalso,
        localStorage: {
            getItem: (k) => { if (roto) throw new Error('almacenamiento bloqueado'); return k in almacen ? almacen[k] : null; },
            setItem: (k, v) => { if (roto) throw new Error('almacenamiento bloqueado'); almacen[k] = String(v); }
        },
        console: { log() {}, warn: (...a) => avisos.push(a), error: (...a) => avisos.push(a) },
        // Date.now() sigue al reloj simulado, para que los plazos sean deterministas.
        Date: class extends Date { static now() { return 1700000000000 + reloj.ahora; } },
        setTimeout: reloj.programar,
        clearTimeout: reloj.cancelar,
        setInterval: reloj.repetir,
        clearInterval: reloj.cancelar,
        requestAnimationFrame: reloj.fotograma,
        addEventListener: (tipo, fn) => { (oyentesVentana[tipo] = oyentesVentana[tipo] || []).push(fn); }
    };
    if (android) { mundo.cordova = {}; mundo.admob = admob; }
    if (!sinPointerEvents) mundo.PointerEvent = function PointerEvent() {};
    mundo.window = mundo;
    vm.createContext(mundo);
    vm.runInContext(FUENTE, mundo, { filename: RUTA });

    const { juego, Modal, Sonido } = mundo;

    // Registro de cada pintado y de cada sonido pedido, con el instante y el estado.
    const anotar = (tipo, original) => function (valor) {
        eventos.push({ t: reloj.ahora, tipo, valor, estado: juego.estado });
        return original.apply(juego, arguments);
    };
    juego.draw = anotar('luz', juego.draw);
    juego.play = anotar('sonido', juego.play);

    // ── Ayudas para las pruebas ──────────────────────────────────────────────
    let arrancado = false;
    // hasta: 'load' (por defecto) dispara DOMContentLoaded y load; 'DOMContentLoaded',
    // solo el primero, como cuando un script de terceros aún no ha terminado de cargar.
    const arrancar = (hasta = 'load') => {
        if (arrancado) return;
        arrancado = true;
        disparar(oyentesDoc, 'DOMContentLoaded');
        disparar(oyentesVentana, 'DOMContentLoaded');
        if (hasta === 'load') {
            documento.readyState = 'complete';
            disparar(oyentesVentana, 'load');
        }
        if (android) disparar(oyentesDoc, 'deviceready');
        reloj.avanzar(1600);
    };

    const dialogo = () => {
        if (elementos['modal-overlay'].classList.contains('hidden')) return null;
        return {
            titulo: elementos['modal-title'].textContent,
            tituloEscritoComo: elementos['modal-title'].escritoComo,
            contenido: elementos['modal-content'].innerHTML,
            botones: elementos['modal-buttons'].children.map((b) => b.textContent)
        };
    };

    const pulsar = (nombre) => {
        const abierto = dialogo();
        const boton = abierto && elementos['modal-buttons'].children.find((b) => b.textContent === nombre);
        if (!boton) throw new Error(`no hay botón «${nombre}»; diálogo: ${JSON.stringify(abierto)}`);
        boton.disparar('click');
    };

    const hastaEstado = (estado, max = 60000) => {
        for (let t = 0; juego.estado !== estado; t += 10) {
            if (t >= max) throw new Error(`no se llegó al estado «${estado}»; sigue en «${juego.estado}»`);
            reloj.avanzar(10);
        }
    };

    const jugarHastaNivel = (n) => {
        arrancar();
        while (dialogo()) pulsar(dialogo().botones[0]);
        hastaEstado('turno');
        while (juego.Secuencia.length < n) {
            for (const color of [...juego.Secuencia]) { juego.toque(color); reloj.avanzar(300); }
            hastaEstado('turno');
        }
    };

    const ocultar = (oculto) => {
        documento.hidden = oculto;
        disparar(oyentesDoc, 'visibilitychange');
    };

    const redimensionar = (w, h) => {
        mundo.innerWidth = w;
        mundo.innerHeight = h;
        disparar(oyentesVentana, 'resize');
    };

    return { juego, Modal, Sonido, reloj, almacen, audio, lienzo, eventos, avisos, asentar,
             arrancar, dialogo, pulsar, hastaEstado, jugarHastaNivel, ocultar, redimensionar,
             compartido, anuncios };
}
