#!/usr/bin/env node
//
// Hook after_prepare: aplica modo inmersivo (oculta status bar + navigation bar)
// en MainActivity.java usando WindowInsetsControllerCompat (API 21+, AndroidX Core).
// Se ejecuta cada vez que se hace `cordova prepare` o `cordova build`.
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
        console.warn('[immersive] No se encontró MainActivity.java en: ' + mainActivityPath);
        return;
    }

    let src = fs.readFileSync(mainActivityPath, 'utf8');

    if (src.includes('onWindowFocusChanged')) {
        console.log('[immersive] MainActivity.java ya está parcheado, sin cambios.');
        return;
    }

    // --- Añadir imports ---
    src = src.replace(
        'import android.os.Bundle;',
        [
            'import android.os.Bundle;',
            'import androidx.core.view.WindowCompat;',
            'import androidx.core.view.WindowInsetsCompat;',
            'import androidx.core.view.WindowInsetsControllerCompat;'
        ].join('\n')
    );

    // --- Añadir setDecorFitsSystemWindows en onCreate (antes del cierre de método) ---
    src = src.replace(
        'loadUrl(launchUrl);',
        'loadUrl(launchUrl);\n        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);'
    );

    // --- Añadir onWindowFocusChanged antes de la llave de cierre de la clase ---
    const method = `
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            WindowInsetsControllerCompat ctrl =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            ctrl.hide(WindowInsetsCompat.Type.systemBars());
            ctrl.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }
    }
`;

    src = src.replace(/}\s*$/, method + '}\n');

    fs.writeFileSync(mainActivityPath, src, 'utf8');
    console.log('[immersive] MainActivity.java parcheado: modo inmersivo activado.');
};
