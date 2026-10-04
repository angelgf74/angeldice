#!/usr/bin/env node
//
// Hook after_prepare: el botón/gesto "atrás" manda la app al fondo
// (moveTaskToBack) en lugar de cerrar MainActivity.
//
// Motivo: al destruir la actividad con el SDK de Google Mobile Ads cargado
// (interstitial), el WebView de Chromium revienta con SIGILL en
// onTrimMemory. Google Play rechazó la 1.1.9 por "Estabilidad de la
// aplicación" por este cierre. Enviar la tarea al fondo es además el
// comportamiento por defecto de Android 12+ para actividades raíz.
//

const fs   = require('fs');
const path = require('path');

module.exports = function (context) {
    const root = context.opts.projectRoot;
    const mainActivityPath = path.join(
        root, 'platforms', 'android', 'app', 'src', 'main', 'java',
        'es', 'angelgf', 'angeldice', 'MainActivity.java'
    );

    if (!fs.existsSync(mainActivityPath)) {
        console.warn('[back] No se encontró MainActivity.java en: ' + mainActivityPath);
        return;
    }

    let src = fs.readFileSync(mainActivityPath, 'utf8');

    if (src.includes('OnBackPressedCallback')) {
        console.log('[back] MainActivity.java ya está parcheado, sin cambios.');
        return;
    }

    // --- Añadir imports ---
    src = src.replace(
        'import android.os.Bundle;',
        [
            'import android.os.Bundle;',
            'import androidx.activity.OnBackPressedCallback;'
        ].join('\n')
    );

    // --- Registrar el callback en onCreate, tras cargar la página ---
    const callback = `loadUrl(launchUrl);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                moveTaskToBack(true);
            }
        });`;

    if (!src.includes('loadUrl(launchUrl);')) {
        throw new Error('[back] No se encontró loadUrl(launchUrl) en MainActivity.java');
    }
    src = src.replace('loadUrl(launchUrl);', callback);

    fs.writeFileSync(mainActivityPath, src, 'utf8');
    console.log('[back] MainActivity.java parcheado: "atrás" envía la app al fondo.');
};
