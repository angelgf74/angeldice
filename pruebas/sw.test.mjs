import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ruta = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'pwa', 'sw.js');

// Carga pwa/sw.js con un service worker simulado y devuelve su manejador de fetch.
function cargarSw() {
    const oyentes = {};
    const consultas = [];
    const mundo = {
        URL,
        self: {
            location: { origin: 'https://angeldice.angelgf.com.es' },
            addEventListener: (tipo, fn) => { oyentes[tipo] = fn; },
            skipWaiting() {}, clients: { claim() {} }
        },
        caches: {
            match: (peticion, opciones) => { consultas.push({ url: peticion.url, opciones }); return Promise.resolve('de caché'); },
            open: () => Promise.resolve({ addAll: () => Promise.resolve() }),
            keys: () => Promise.resolve([])
        },
        fetch: () => Promise.resolve('de red')
    };
    vm.createContext(mundo);
    vm.runInContext(fs.readFileSync(ruta, 'utf8'), mundo);
    const pedir = (url, extra = {}) => {
        const evento = { request: { url, method: 'GET', mode: 'no-cors', ...extra }, respuesta: undefined,
                         respondWith(p) { evento.respuesta = p; } };
        oyentes.fetch(evento);
        return evento;
    };
    return { pedir, consultas };
}

const SITIO = 'https://angeldice.angelgf.com.es';

test('una navegación con query sale de la caché', async () => {
    const sw = cargarSw();
    const e = sw.pedir(SITIO + '/?fbclid=abc', { mode: 'navigate' });
    assert.equal(await e.respuesta, 'de caché');
    assert.equal(sw.consultas[0].opciones.ignoreSearch, true);
});

test('un asset se busca con su URL exacta', async () => {
    const sw = cargarSw();
    const e = sw.pedir(SITIO + '/shared/js/game.js');
    assert.equal(await e.respuesta, 'de caché');
    assert.notEqual((sw.consultas[0].opciones || {}).ignoreSearch, true);
});

test('las peticiones a otros orígenes no se interceptan', () => {
    const sw = cargarSw();
    const e = sw.pedir('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js');
    assert.equal(e.respuesta, undefined);
    assert.equal(sw.consultas.length, 0);
});

test('las peticiones que no son GET no se interceptan', () => {
    const sw = cargarSw();
    const e = sw.pedir(SITIO + '/algo', { method: 'POST' });
    assert.equal(e.respuesta, undefined);
});
