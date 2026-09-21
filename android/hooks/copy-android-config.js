#!/usr/bin/env node
// Hook before_build: copia android-config/ (R8/minify) al proyecto Android
// generado. platforms/android se regenera con "platform add", por eso la
// fuente de verdad vive fuera de platforms/.

const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    const projectRoot = context.opts.projectRoot;
    const appDir = path.join(projectRoot, 'platforms', 'android', 'app');

    if (!fs.existsSync(appDir)) {
        console.log('[r8] platforms/android/app no existe todavía, se omite.');
        return;
    }

    const srcDir = path.join(projectRoot, 'android-config');
    const copias = [
        ['build-extras.gradle', path.join(appDir, 'build-extras.gradle')],
        ['proguard-rules.pro', path.join(appDir, 'proguard-rules.pro')],
        ['keep.xml', path.join(appDir, 'src', 'main', 'res', 'raw', 'keep.xml')]
    ];

    copias.forEach(function ([nombre, destino]) {
        const origen = path.join(srcDir, nombre);
        if (!fs.existsSync(origen)) {
            throw new Error('[r8] Falta el fichero ' + origen);
        }
        fs.mkdirSync(path.dirname(destino), { recursive: true });
        fs.copyFileSync(origen, destino);
        console.log('[r8] ' + nombre + ' -> ' + path.relative(projectRoot, destino));
    });
};
