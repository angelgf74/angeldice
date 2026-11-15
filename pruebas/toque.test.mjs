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
