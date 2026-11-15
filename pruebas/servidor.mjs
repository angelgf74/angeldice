// Servidor estático de solo lectura para probar en local, sin dependencias.
// Uso: node pruebas/servidor.mjs <carpeta> [puerto]      (por defecto, puerto 8765)
// Quita de los .html los scripts de terceros (AdSense y analítica) para no generar
// visitas ni impresiones al probar; con ?real=1 los sirve tal cual.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

if (!process.argv[2]) {
    console.error('uso: node pruebas/servidor.mjs <carpeta> [puerto]');
    process.exit(1);
}
const raiz = path.resolve(process.argv[2]);
const puerto = Number(process.argv[3] || 8765);
const tipos = {
    '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.mjs': 'application/javascript',
    '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'
};

http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); res.end(); return; }
    if (rel.endsWith('/')) rel += 'index.html';
    const fichero = path.join(raiz, rel);
    if (fichero !== raiz && !fichero.startsWith(raiz + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(fichero, (err, datos) => {
        if (err) { res.writeHead(404); res.end('404'); return; }
        const ext = path.extname(fichero);
        if (ext === '.html' && url.searchParams.get('real') !== '1') {
            datos = Buffer.from(datos.toString('utf8')
                .replace(/<script[^>]*src="https:\/\/[^"]*"[^>]*>\s*<\/script>/g, ''));
        }
        res.writeHead(200, { 'Content-Type': tipos[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
        res.end(datos);
    });
}).listen(puerto, '127.0.0.1', () => console.log('sirviendo ' + raiz + ' en http://localhost:' + puerto));
