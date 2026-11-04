// Paso propio de srv (pasos en srv.json). El service worker sirve todo desde la caché
// CACHE y solo borra las cachés con otro nombre: si el nombre no cambia, los clientes
// siguen con los ficheros viejos. Pone el id de la release en el sw.js del paquete; el
// del repo no se toca.
// Falla si no encuentra la constante justo una vez: mejor no publicar que publicar una
// versión que los clientes nunca descargan.
import fs from 'node:fs';
import path from 'node:path';

const paquete = process.env.SRV_PAQUETE;
const release = process.env.SRV_RELEASE;
if (!paquete || !release) {
    console.error('faltan SRV_PAQUETE o SRV_RELEASE: este paso lo lanza srv subir');
    process.exit(1);
}
// Va dentro de una cadena de JS entre comillas simples.
if (!/^[A-Za-z0-9._-]+$/.test(release)) {
    console.error(`SRV_RELEASE con caracteres inesperados: ${JSON.stringify(release)}`);
    process.exit(1);
}

const sw = path.join(paquete, 'web', 'sw.js');
const constante = /const CACHE = '[^']*';/g;
const despues = `const CACHE = 'angeldice-${release}';`;

const js = fs.readFileSync(sw, 'utf8');
const veces = (js.match(constante) ?? []).length;
if (veces !== 1) {
    console.error(`${sw}: se esperaba "const CACHE = '...';" una vez y aparece ${veces}`);
    process.exit(1);
}
fs.writeFileSync(sw, js.replace(constante, despues));

console.log(`sw.js: ${despues}`);
