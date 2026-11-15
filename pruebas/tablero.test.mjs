import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

test('oscurecer multiplica cada canal', () => {
    const { juego } = cargarJuego();
    assert.equal(juego.oscurecer('#FFFF77', 0.5), '#80803c');
    assert.equal(juego.oscurecer('#338833', 1), '#338833');
});

test('un sector apagado es su color oscurecido; encendido, el color pleno', () => {
    const { juego } = cargarJuego();
    assert.equal(juego.SelColor(-1, 1), juego.oscurecer('#FFFF77', 0.55));
    assert.equal(juego.SelColor(1, 1), '#FFFF77');
    assert.equal(juego.SelColor(0, 1), juego.oscurecer('#FFFF77', 0.55));
    assert.equal(juego.SelColor(-2, 1), '#FFFF77');
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
