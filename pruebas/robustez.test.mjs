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
