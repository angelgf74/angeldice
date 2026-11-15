import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pwa = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'pwa');
const leer = (f) => fs.readFileSync(path.join(pwa, f), 'utf8');

const precache = [...leer('sw.js').match(/const PRECACHE = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
const manifiesto = JSON.parse(leer('manifest.json'));

test('todo lo que está en PRECACHE existe', () => {
    for (const url of precache.filter(u => u !== './')) {
        assert.ok(fs.existsSync(path.join(pwa, url)), `falta ${url}`);
    }
});

test('los iconos del manifiesto existen y están en PRECACHE', () => {
    for (const icono of manifiesto.icons) {
        assert.ok(fs.existsSync(path.join(pwa, icono.src)), `falta ${icono.src}`);
        assert.ok(precache.includes('./' + icono.src), `${icono.src} no está en PRECACHE`);
    }
});

test('hay un icono enmascarable aparte, con su zona segura', () => {
    const usos = manifiesto.icons.map(i => i.purpose);
    assert.ok(usos.includes('maskable'));
    assert.ok(usos.includes('any'));
    assert.equal(usos.includes('any maskable'), false);
});

test('index.html pide los assets sin query, igual que en PRECACHE', () => {
    const html = leer('index.html');
    const locales = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
        .filter(u => !/^https?:/.test(u));
    for (const url of locales) {
        assert.equal(url.includes('?'), false, `${url} lleva query`);
        assert.ok(precache.includes('./' + url), `${url} no está en PRECACHE`);
    }
});

test('las imágenes para compartir el enlace llevan URL absoluta', () => {
    const html = leer('index.html');
    for (const meta of ['og:image', 'twitter:image']) {
        const m = html.match(new RegExp(`<meta (?:property|name)="${meta}" content="([^"]+)"`));
        assert.equal(m[1], 'https://angeldice.angelgf.com.es/icons/icon-512.png');
    }
    assert.match(html, /<meta property="og:url" content="https:\/\/angeldice\.angelgf\.com\.es\/">/);
});

test('ningún script de terceros bloquea el arranque', () => {
    const externos = [...leer('index.html').matchAll(/<script\b[^>]*src="https:[^>]*>/g)].map(m => m[0]);
    assert.equal(externos.length, 2);
    for (const etiqueta of externos) assert.match(etiqueta, /\basync\b/, etiqueta);
});

test('la página deja ampliar el texto', () => {
    assert.doesNotMatch(leer('index.html'), /user-scalable=no/);
});
