import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

const nuevo = (o) => cargarJuego({ almacen: { ayudaaliniciar: 'false' }, ...o });
const fallar = (j) => {
    j.juego.toque((j.juego.Secuencia[j.juego.Indice + 1] + 1) % j.juego.numCuadrantes);
    j.reloj.avanzar(2000);
};

test('la primera vez el diálogo de inicio explica el juego; después no', () => {
    const primera = cargarJuego(); primera.arrancar();
    assert.equal(primera.dialogo().titulo, 'Cómo se juega');
    assert.deepEqual(primera.dialogo().botones, ['Jugar']);
    assert.equal(primera.almacen.ayudaaliniciar, 'false');
    const otra = nuevo(); otra.arrancar();
    assert.equal(otra.dialogo().titulo, 'Angel Dice');
});

test('el diálogo de inicio no se cierra solo', () => {
    const j = nuevo(); j.arrancar();
    j.reloj.avanzar(30000);
    assert.notEqual(j.dialogo(), null);
    assert.equal(j.juego.estado, 'espera');
});

test('al fallar parpadea el color correcto antes del diálogo', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    const correcto = j.juego.Secuencia[0];
    const desde = j.eventos.length;
    fallar(j);
    const luces = j.eventos.slice(desde).filter(e => e.tipo === 'luz' && e.valor === correcto);
    assert.equal(luces.length, 3);
});

test('fin de partida: un solo número, récord y aviso', () => {
    const j = nuevo(); j.jugarHastaNivel(3);
    fallar(j);
    assert.match(j.dialogo().contenido, /Has superado <b>2<\/b> niveles/);
    assert.match(j.dialogo().contenido, /¡Nuevo récord!/);
    assert.equal(j.juego.record, 2);
    assert.equal(j.almacen.record, '2');
    assert.deepEqual(j.dialogo().botones, ['Jugar otra vez']);
});

test('sin récord nuevo no hay aviso', () => {
    const j = nuevo({ almacen: { ayudaaliniciar: 'false', record: '5' } }); j.jugarHastaNivel(2);
    fallar(j);
    assert.match(j.dialogo().contenido, /Has superado <b>1<\/b> nivel$/);
    assert.equal(j.juego.record, 5);
});

test('«Jugar otra vez» arranca sin diálogo ni demo', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    fallar(j); j.pulsar('Jugar otra vez');
    const desde = j.eventos.length;
    j.hastaEstado('turno');
    assert.equal(j.dialogo(), null);
    assert.equal(j.eventos.slice(desde).some(e => e.estado === 'demo'), false);
    assert.equal(j.juego.Secuencia.length, 1);
});

test('la partida siguiente usa el número de cuadrantes nuevo', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.setNumCuadrantes(6);
    fallar(j); j.pulsar('Jugar otra vez');
    assert.equal(j.juego.numCuadrantes, 6);
});

test('«Compartir» usa la URL pública y espera antes de reiniciar', async () => {
    const j = nuevo({ compartir: true }); j.jugarHastaNivel(2);
    fallar(j); j.pulsar('Compartir');
    assert.equal(j.compartido.datos.url, 'https://angeldice.angelgf.com.es/');
    assert.match(j.compartido.datos.text, /He superado 1 nivel /);
    assert.equal(j.juego.estado, 'fin');
    await j.compartido.resolver();
    assert.equal(j.juego.estado, 'espera');
});
