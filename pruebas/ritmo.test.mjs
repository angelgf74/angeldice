import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

const nuevo = (o) => cargarJuego({ almacen: { ayudaaliniciar: 'false' }, ...o });

test('el texto de estado dice de quién es el turno', () => {
    const j = nuevo(); j.arrancar();
    assert.equal(j.juego.textoEstado(), '');
    j.pulsar('Jugar');
    assert.equal(j.juego.textoEstado(), 'Observa');
    j.hastaEstado('turno');
    assert.equal(j.juego.textoEstado(), 'Tu turno');
    j.juego.toque(j.juego.Secuencia[0]);
    assert.equal(j.juego.textoEstado(), '¡Bien!');
});

test('de «Jugar otra vez» a poder tocar pasan menos de 1,5 s', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.toque((j.juego.Secuencia[0] + 1) % 4);
    j.reloj.avanzar(2000); j.pulsar('Jugar otra vez');
    const t0 = j.reloj.ahora;
    j.hastaEstado('turno');
    assert.ok(j.reloj.ahora - t0 <= 1500, `tardó ${j.reloj.ahora - t0} ms`);
});

test('de acertar el nivel 1 a poder tocar el 2 pasan menos de 3 s', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    j.juego.toque(j.juego.Secuencia[0]);
    const t0 = j.reloj.ahora;
    j.hastaEstado('turno');
    assert.ok(j.reloj.ahora - t0 <= 3000, `tardó ${j.reloj.ahora - t0} ms`);
});

test('el turno empieza en cuanto se apaga el último color', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    const apagado = j.eventos.findLast(e => e.tipo === 'luz' && e.estado === 'mostrando');
    const turno = j.eventos.find(e => e.estado === 'turno');
    assert.ok(turno.t - apagado.t <= 150, `pasaron ${turno && turno.t - apagado.t} ms`);
});

test('sin valor guardado el sonido está activado', () => {
    const j = cargarJuego(); j.arrancar();
    assert.equal(j.juego.conAudio, true);
    const callado = cargarJuego({ almacen: { conaudio: 'false' } }); callado.arrancar();
    assert.equal(callado.juego.conAudio, false);
});
