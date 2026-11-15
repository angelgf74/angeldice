import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

test('el juego arranca sin esperar a que carguen los scripts de terceros', () => {
    const j = cargarJuego({ almacen: { ayudaaliniciar: 'false' } });
    j.arrancar('DOMContentLoaded');
    assert.notEqual(j.dialogo(), null);
});

test('arranca también si el documento ya estaba cargado', () => {
    const j = cargarJuego({ almacen: { ayudaaliniciar: 'false' }, documentoListo: true });
    j.reloj.avanzar(1600);
    assert.notEqual(j.dialogo(), null);
});

test('arranca una sola vez', () => {
    const j = cargarJuego({ almacen: { ayudaaliniciar: 'false' } });
    j.arrancar();
    assert.equal(j.lienzo.cambiosDeTamano, 1);
});
