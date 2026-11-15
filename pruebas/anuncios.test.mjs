import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

// AdMob se inicializa con funciones async: hay que dejar que terminen antes de jugar.
const enAndroid = async () => {
    const j = cargarJuego({ android: true, almacen: { ayudaaliniciar: 'false' } });
    j.arrancar();
    await j.asentar();
    j.jugarHastaNivel(1);
    return j;
};
const perder = (j) => {
    j.juego.toque((j.juego.Secuencia[0] + 1) % 4);
    j.reloj.avanzar(2000); j.pulsar('Jugar otra vez');
};

test('límite: nivel 3, tres derrotas y 90 s', () => {
    const { juego } = cargarJuego({ android: true });
    juego._ultimoAnuncio = 0; juego._derrotasSinAnuncio = 0;
    const serie = [[5, 100000], [5, 100000], [2, 100000], [5, 100000],
                   [5, 150000], [5, 150000], [5, 150000], [5, 190000]];
    assert.deepEqual(serie.map(([s, t]) => juego.tocaIntersticial(s, t)),
                     [false, false, false, true, false, false, false, true]);
});

test('al arrancar no hay anuncio en los primeros 90 s', async () => {
    const j = await enAndroid();
    j.juego._derrotasSinAnuncio = 10;
    assert.equal(j.juego.tocaIntersticial(5, j.juego._ultimoAnuncio + 89999), false);
});

test('una derrota sin anuncio reinicia directo', async () => {
    const j = await enAndroid();
    j.juego.tocaIntersticial = () => false;
    perder(j);
    assert.equal(j.anuncios.mostrados, 0);
    assert.equal(j.dialogo(), null);
});

test('con anuncio, no hay nada que pulsar hasta que el anuncio se cierra', async () => {
    const j = await enAndroid();
    j.juego.tocaIntersticial = () => true;
    perder(j);
    await j.asentar();
    assert.equal(j.anuncios.mostrados, 1);
    assert.equal(j.dialogo(), null);            // el anuncio aún no tapa la pantalla
    j.reloj.avanzar(1000);
    assert.equal(j.dialogo(), null);
    j.anuncios.cerrar();
    assert.deepEqual(j.dialogo().botones, ['Jugar']);
    j.reloj.avanzar(30000);
    assert.equal(j.juego.estado, 'espera');     // la partida no empieza sola
});

test('si el plugin no avisa del cierre, «Jugar» aparece a los 3 s, una sola vez', async () => {
    const j = await enAndroid();
    j.juego.tocaIntersticial = () => true;
    perder(j);
    await j.asentar();
    j.reloj.avanzar(2900);
    assert.equal(j.dialogo(), null);
    j.reloj.avanzar(200);
    assert.deepEqual(j.dialogo().botones, ['Jugar']);
    j.pulsar('Jugar'); j.hastaEstado('turno');
    j.anuncios.cerrar();                         // aviso tardío: no reinicia la partida
    assert.equal(j.juego.estado, 'turno');
    assert.equal(j.dialogo(), null);
});

test('si el anuncio falla, «Jugar» aparece sin esperar', async () => {
    const j = await enAndroid();
    j.juego.tocaIntersticial = () => true;
    j.anuncios.fallar = true;
    perder(j);
    await j.asentar();
    j.pulsar('Jugar'); j.hastaEstado('turno');
    assert.equal(j.juego.Secuencia.length, 1);
});

test('en la PWA nunca se pide anuncio', () => {
    const j = cargarJuego({ almacen: { ayudaaliniciar: 'false' } }); j.jugarHastaNivel(1);
    j.juego.tocaIntersticial = () => { throw new Error('no debe llamarse'); };
    j.juego.toque((j.juego.Secuencia[0] + 1) % 4);
    j.reloj.avanzar(2000); j.pulsar('Jugar otra vez');
    assert.equal(j.dialogo(), null);
});
