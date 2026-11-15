import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

const nuevo = () => { const j = cargarJuego({ almacen: { ayudaaliniciar: 'false', record: '7' } }); j.arrancar(); j.pulsar('Jugar'); return j; };

test('el título del diálogo se escribe como texto, no como HTML', () => {
    const j = nuevo();
    j.juego.mostrarAyuda();
    assert.equal(j.dialogo().tituloEscritoComo, 'textContent');
});

test('los diálogos no llevan colores en línea', () => {
    const j = nuevo();
    j.juego.mostrarRecord();
    assert.doesNotMatch(j.dialogo().contenido, /color:/);
    assert.match(j.dialogo().contenido, /class="record-num">7</);
    j.pulsar('Cerrar');
    j.juego.mostrarConfiguracion();
    assert.doesNotMatch(j.dialogo().contenido, /color:/);
    assert.match(j.dialogo().contenido, /class="nota"/);
});
