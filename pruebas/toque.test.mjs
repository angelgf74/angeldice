import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

test('el toque cuenta una vez, al bajar el dedo', () => {
    const j = cargarJuego({ almacen: { ayudaaliniciar: 'false' } }); j.jugarHastaNivel(1);
    const tocados = [];
    j.juego.toque = (c) => tocados.push(c);
    const { centroX: cx, centroY: cy, radio: r } = j.juego;
    const punto = { clientX: cx + r / 2, clientY: cy + r / 2 };

    j.lienzo.disparar('pointerdown', punto);
    assert.equal(tocados.length, 1);

    j.lienzo.disparar('touchend', { changedTouches: [punto], preventDefault() {} });
    j.lienzo.disparar('click', punto);
    assert.equal(tocados.length, 1);
});

test('«Instalar» responde al clic, que es lo que el navegador acepta como gesto', () => {
    const j = cargarJuego({ almacen: { ayudaaliniciar: 'false' } }); j.jugarHastaNivel(1);
    let pedidos = 0;
    j.juego._installPrompt = { prompt() { pedidos++; }, userChoice: new Promise(() => {}) };
    const punto = { clientX: j.juego.ancho / 2, clientY: j.juego.alto - 5 };

    j.lienzo.disparar('pointerdown', punto);
    assert.equal(pedidos, 0);
    j.lienzo.disparar('click', punto);
    assert.equal(pedidos, 1);
});

test('sin Pointer Events el tablero responde al toque', () => {
    const j = cargarJuego({ almacen: { ayudaaliniciar: 'false' }, sinPointerEvents: true }); j.jugarHastaNivel(1);
    const tocados = [];
    j.juego.toque = (c) => tocados.push(c);
    const { centroX: cx, centroY: cy, radio: r } = j.juego;
    const punto = { clientX: cx + r / 2, clientY: cy + r / 2 };

    j.lienzo.disparar('touchstart', { touches: [punto], preventDefault() {} });
    assert.equal(tocados.length, 1);
    j.lienzo.disparar('mousedown', punto);     // el ratón emulado tras un toque no cuenta otra vez
    assert.equal(tocados.length, 1);
});
