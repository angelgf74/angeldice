import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cargarJuego } from './arnes.mjs';

const nuevo = (o) => cargarJuego({ almacen: { ayudaaliniciar: 'false', conaudio: 'true' }, ...o });

test('el tono suena en el instante en que se enciende el color', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    const c = j.juego.Secuencia[0];
    const de = (tipo) => j.eventos.find(e => e.tipo === tipo && e.valor === c && e.estado === 'mostrando');
    assert.equal(de('sonido').t, de('luz').t);
});

test('con el audio suspendido los tonos no se acumulan: al reanudar suena solo el último', async () => {
    const j = nuevo({ audio: 'suspended' }); j.arrancar();
    for (const id of [0, 1, 2, 3]) j.Sonido.play(id);
    await j.audio.reanudar();
    assert.equal(j.audio.osciladores, 1);
});

test('un tono pedido hace rato no suena al reanudar', async () => {
    const j = nuevo({ audio: 'suspended' }); j.arrancar();
    j.Sonido.play(0);
    j.reloj.avanzar(1000);
    await j.audio.reanudar();
    assert.equal(j.audio.osciladores, 0);
    j.Sonido.play(0);
    assert.equal(j.audio.osciladores, 1);
});

test('el primer tono de la demo suena aunque el audio se reanude justo después del clic', async () => {
    const j = nuevo({ audio: 'suspended' }); j.arrancar();
    j.pulsar('Jugar');                  // el clic pide reanudar y la demo empieza en el mismo instante
    await j.audio.reanudar();
    j.hastaEstado('mostrando');
    assert.equal(j.audio.osciladores, 4);
});

test('tras un acierto el tablero se apaga antes de enseñar el primer color', () => {
    const j = nuevo(); j.jugarHastaNivel(1);
    const desde = j.eventos.length;
    j.juego.toque(j.juego.Secuencia[0]);
    j.hastaEstado('mostrando');
    j.reloj.avanzar(100);
    const luces = j.eventos.slice(desde).filter(e => e.tipo === 'luz' && e.estado === 'mostrando');
    assert.equal(luces[0].valor, -1);
});

for (const interrumpir of ['segundo plano', 'diálogo']) {
    test(`tras ${interrumpir}, la secuencia se repite entera`, () => {
        const j = nuevo(); j.jugarHastaNivel(1);
        j.juego.toque(j.juego.Secuencia[0]);
        j.hastaEstado('mostrando');
        j.reloj.avanzar(500);
        if (interrumpir === 'diálogo') j.juego.mostrarRecord(); else j.ocultar(true);
        j.reloj.avanzar(3000);
        const desde = j.eventos.length;
        if (interrumpir === 'diálogo') j.pulsar('Cerrar'); else j.ocultar(false);
        j.hastaEstado('turno');
        const tonos = j.eventos.slice(desde).filter(e => e.tipo === 'sonido' && e.valor < 8).map(e => e.valor);
        assert.deepEqual(tonos, [...j.juego.Secuencia]);
    });
}
