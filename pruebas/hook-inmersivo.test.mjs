import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const hook = createRequire(import.meta.url)('../android/hooks/after_prepare/set_immersive.js');

// Monta un proyecto Cordova mínimo con el MainActivity.java indicado y pasa el hook.
function conMainActivity(fuente) {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'angeldice-hook-'));
    const fichero = path.join(raiz, 'platforms', 'android', 'app', 'src', 'main', 'java',
        'es', 'angelgf', 'angeldice', 'MainActivity.java');
    fs.mkdirSync(path.dirname(fichero), { recursive: true });
    fs.writeFileSync(fichero, fuente);
    const registro = console.log;
    console.log = () => {};
    try {
        hook({ opts: { projectRoot: raiz } });
        return fs.readFileSync(fichero, 'utf8');
    } finally {
        console.log = registro;
        fs.rmSync(raiz, { recursive: true, force: true });
    }
}

const BIEN = [
    'import android.os.Bundle;',
    'public class MainActivity extends CordovaActivity {',
    '    public void onCreate(Bundle b) {',
    '        loadUrl(launchUrl);',
    '    }',
    '}',
    ''
].join('\n');

test('parchea MainActivity.java con el modo inmersivo', () => {
    const salida = conMainActivity(BIEN);
    assert.match(salida, /WindowCompat\.setDecorFitsSystemWindows\(getWindow\(\), false\);/);
    assert.match(salida, /onWindowFocusChanged/);
    assert.match(salida, /import androidx\.core\.view\.WindowCompat;/);
});

test('falla si no encuentra dónde poner setDecorFitsSystemWindows', () => {
    assert.throws(() => conMainActivity(BIEN.replace('loadUrl(launchUrl);', 'cargar();')),
        /\[immersive\].*loadUrl\(launchUrl\);/);
});

test('falla si no encuentra dónde poner los imports', () => {
    assert.throws(() => conMainActivity(BIEN.replace('import android.os.Bundle;', '')),
        /\[immersive\].*import android\.os\.Bundle;/);
});
