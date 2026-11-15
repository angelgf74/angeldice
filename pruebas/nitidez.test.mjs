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

test('con densidad 3 los toques siguen en píxeles CSS', () => {
    const j = cargarJuego({ dpr: 3, almacen: { ayudaaliniciar: 'false' } }); j.jugarHastaNivel(1);
    const tocados = [];
    j.juego.toque = (c) => tocados.push(c);
    const { centroX: cx, centroY: cy, radio: r } = j.juego;
    assert.equal(cx, 195);
    j.lienzo.disparar('pointerdown', { clientX: cx + r / 2, clientY: cy + r / 2 });
    assert.equal(tocados.length, 1);
});
