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
