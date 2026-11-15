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
