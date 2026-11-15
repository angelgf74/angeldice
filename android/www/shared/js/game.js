'use strict';

var _isAndroid = typeof cordova !== 'undefined';

// ─── Modal dialog system ──────────────────────────────────────────────────────

var Modal = {
    _timer: null,

    show: function (options) {
        Modal._clearTimer();
        var overlay  = document.getElementById('modal-overlay');
        var titleEl  = document.getElementById('modal-title');
        var contentEl= document.getElementById('modal-content');
        var btnsEl   = document.getElementById('modal-buttons');

        titleEl.innerHTML  = options.title   || '';
        contentEl.innerHTML= options.content || '';
        btnsEl.innerHTML   = '';

        var buttons = options.buttons || { Aceptar: function () {} };
        Object.keys(buttons).forEach(function (name) {
            var cfg = buttons[name];
            var btn = document.createElement('button');
            btn.textContent = name;
            btn.className   = 'modal-btn';
            if (cfg && cfg.btnClass) btn.classList.add(cfg.btnClass);
            btn.addEventListener('click', function () {
                Modal.hide();
                Sonido.unlock();
                var action = typeof cfg === 'function' ? cfg : (cfg && cfg.action);
                if (action) action();
            });
            btnsEl.appendChild(btn);
        });

        if (overlay.classList.contains('hidden')) juego.enDialogo++;
        overlay.classList.remove('hidden');

        if (options.autoClose) {
            var parts  = options.autoClose.split('|');
            var btnKey = parts[0];
            var delay  = parseInt(parts[1], 10) || 3000;
            Modal._timer = setTimeout(function () {
                Modal.hide();
                var cfg    = buttons[btnKey];
                var action = typeof cfg === 'function' ? cfg : (cfg && cfg.action);
                if (action) action();
            }, delay);
        }
    },

    hide: function () {
        Modal._clearTimer();
        var overlay = document.getElementById('modal-overlay');
        if (!overlay.classList.contains('hidden')) juego.enDialogo = Math.max(0, juego.enDialogo - 1);
        overlay.classList.add('hidden');
    },

    _clearTimer: function () {
        if (Modal._timer) { clearTimeout(Modal._timer); Modal._timer = null; }
    }
};

// ─── Audio (Web Audio API) ───────────────────────────────────────────────────

var Sonido = {
    ctx: null,

    init: function () {
        try {
            Sonido.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) { return; }
    },

    unlock: function () {
        if (Sonido.ctx && Sonido.ctx.state === 'suspended') {
            Sonido.ctx.resume();
        }
    },

    // id 0-7: colores; 8: acierto; 9: fallo
    play: function (id) {
        if (!juego.conAudio || !Sonido.ctx) return;
        if (Sonido.ctx.state !== 'running') {
            // Sin un gesto del usuario el navegador deja el audio suspendido. Se pide
            // reanudarlo y este tono se pierde: si se guardara para después, todos los
            // acumulados sonarían a la vez al reanudarse.
            var reanudado = Sonido.ctx.resume();
            if (reanudado && reanudado.catch) reanudado.catch(function () {});
            return;
        }

        var freq = function (idx) { return 392 + 62 * idx; };
        if (id < 8) {
            Sonido._tono(freq(id), 0.45, 'sine', 0);
        } else if (id === 8) {
            Sonido._tono(262, 0.12, 'sine', 0.00);
            Sonido._tono(330, 0.12, 'sine', 0.12);
            Sonido._tono(392, 0.12, 'sine', 0.24);
            Sonido._tono(523, 0.30, 'sine', 0.36);
        } else {
            Sonido._fallo();
        }
    },

    _tono: function (freq, dur, tipo, retardo) {
        var ctx  = Sonido.ctx;
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        var t0   = ctx.currentTime + retardo + 0.05;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = tipo;
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.45, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.start(t0);
        osc.stop(t0 + dur + 0.05);
    },

    _fallo: function () {
        var ctx  = Sonido.ctx;
        var osc  = ctx.createOscillator();
        var gain = ctx.createGain();
        var t0   = ctx.currentTime + 0.05;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, t0);
        osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.5);
        gain.gain.setValueAtTime(0.5, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
        osc.start(t0);
        osc.stop(t0 + 0.55);
    }
};

// ─── Game ────────────────────────────────────────────────────────────────────

var juego = {
    //            Azul      Amarillo  Verde     Rojo      Naranja   Cian      Rosa      Morado
    colores2: ['#7777FF', '#FFFF77', '#338833', '#FF3333', '#FF8833', '#33BBBB', '#FF66BB', '#9933FF'],

    numCuadrantes: 4,
    numCuadrantesProx: 4,

    Secuencia: [],
    // De quién es el turno. Solo en 'turno' cuentan los toques sobre el tablero.
    //   espera     partida preparada, aún no ha empezado
    //   demo       se enseñan los cuadrantes uno a uno
    //   mostrando  se reproduce la secuencia
    //   turno      el jugador repite la secuencia
    //   acierto    nivel completado, hasta que empieza la secuencia siguiente
    //   fin        ha fallado, hasta que empieza otra partida
    estado: 'espera',
    Indice: -1,

    pausa: false,
    conAudio: false,
    ayudaAlIniciar: true,

    centroX: 0,
    centroY: 0,
    radio: 0,
    ancho: 0,
    alto: 0,

    enDialogo: 0,
    // Tiempos de la reproducción de la secuencia, en milisegundos.
    msInicial: 300,         // apagado antes del primer color
    msEncendido: 450,       // cada color encendido
    msApagado: 150,         // apagado entre colores
    msTrasAcierto: 400,     // del último acierto a la animación de nivel superado

    record: 0,

    // PWA only
    _installPrompt: null,
    _audioLabel: '',
    _audioLabelTimer: null,

    // Fuente del sistema para el texto del canvas (el CSS usa la misma).
    fuente: 'system-ui, "Segoe UI", Roboto, Arial, sans-serif',

    // La dirección que se comparte, la misma en la PWA y en Android.
    urlPublica: 'https://angeldice.angelgf.com.es/',

    msAntesDeEmpezar: 400,  // de «Jugar otra vez» a que empiece la partida siguiente
    _demoVista: false,      // la demo de los cuadrantes se enseña una vez por sesión

    msToque: 250,       // lo que queda encendido el color que toca el jugador
    _encendido: -1,     // lo último que pintó draw: índice, -1 ninguno, -2 todos
    _tApagado: null,    // el único apagado pendiente de encender()
    _rCen: 0,           // radio del círculo central, lo calcula draw

    // Android / AdMob only
    adModBannerId:       'ca-app-pub-8600791204816041/4844265247',
    adModInterstitialId: 'ca-app-pub-8600791204816041/7753322005',
    _banner:             null,
    _interstitial:       null,
    _derrotasSinAnuncio: 0,     // derrotas desde el último intersticial
    _ultimoAnuncio:      0,     // instante (ms) del último intersticial o del arranque

    inicializar: function () {
        if (!_isAndroid) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js');
            }
        }

        Sonido.init();

        // Sin valor guardado el sonido va activado: el tono de cada color ayuda a recordar.
        var savedAudio        = juego.leer('conaudio');
        juego.conAudio        = savedAudio === null ? true : savedAudio === 'true';
        var savedAyuda        = juego.leer('ayudaaliniciar');
        juego.record          = parseInt(juego.leer('record'), 10) || 0;
        juego.numCuadrantes   = Math.max(3, Math.min(8, parseInt(juego.leer('numcuadrantes'), 10) || 4));
        juego.numCuadrantesProx = juego.numCuadrantes;

        if (savedAyuda === null) {
            juego.ayudaAlIniciar = true;
            juego.guardar('ayudaaliniciar', 'true');
        } else {
            juego.ayudaAlIniciar = savedAyuda === 'true';
        }

        document.addEventListener('visibilitychange', function () {
            juego.pausa = document.hidden;
        });

        var canvas = document.getElementById('t1');

        // Un solo evento para ratón, dedo y lápiz, y cuenta al bajar, no al soltar.
        // Las coordenadas van en píxeles CSS relativos al canvas; el CSS ya le pone
        // touch-action: none, así que no hace falta preventDefault.
        canvas.addEventListener('pointerdown', function (e) {
            var rect = canvas.getBoundingClientRect();
            juego.handleClick(e.clientX - rect.left, e.clientY - rect.top);
        });

        juego.ajustarCanvas();
        window.addEventListener('resize', function () {
            juego.ajustarCanvas();
            juego.redibujar();
        });

        if (!_isAndroid) {
            window.addEventListener('beforeinstallprompt', function (e) {
                e.preventDefault();
                juego._installPrompt = e;
            });
            window.addEventListener('appinstalled', function () {
                juego._installPrompt = null;
            });
        } else {
            // Siempre en deviceready: antes, el plugin puede no estar listo. Cordova llama
            // al instante a quien se registra después de que el evento haya ocurrido.
            juego._ultimoAnuncio = Date.now();
            document.addEventListener('deviceready', function () { juego.InicializaPubli(); }, false);
        }

        setTimeout(function () {
            juego.mostrarSplash(function () {
                juego.iniciarSecuencia(true);
            });
        }, 100);
    },

    // ── AdMob (Android only) ─────────────────────────────────────────────────

    InicializaPubli: async function () {
        // Política de familias de Google Play: anuncios aptos para menores.
        // Debe aplicarse antes de pedir ningún anuncio.
        try {
            await admob.configure({
                tagForChildDirectedTreatment: true,
                tagForUnderAgeOfConsent: true,
                maxAdContentRating: 'G',
            });
        } catch (e) {
            console.warn('AdMob configure error:', e);
        }
        try {
            await juego.MostrarPubliBanner();
        } catch (e) {
            console.warn('AdMob banner error:', e);
        }
        juego.CargarInterstitial();
    },

    MostrarPubliBanner: async function () {
        juego._banner = new admob.BannerAd({
            adUnitId: juego.adModBannerId,
            position: 'top',
        });
        await juego._banner.show();
    },

    CargarInterstitial: async function () {
        try {
            juego._interstitial = new admob.InterstitialAd({
                adUnitId: juego.adModInterstitialId,
            });
            await juego._interstitial.load();
        } catch (e) {
            console.warn('AdMob interstitial load error:', e);
        }
    },

    MostrarPubliInterstitial: async function () {
        if (juego._interstitial) {
            try {
                await juego._interstitial.show();
            } catch (e) {
                console.warn('AdMob interstitial show error:', e);
            }
        }
        juego.CargarInterstitial();
    },

    // Límite del intersticial. Cuenta esta derrota y dice si toca anuncio: solo con 3
    // niveles superados o más, cada 3 derrotas como mínimo y con 90 s desde el anterior
    // (o desde el arranque). Si toca, pone el contador a cero.
    tocaIntersticial: function (superados, ahora) {
        juego._derrotasSinAnuncio++;
        if (superados < 3) return false;
        if (juego._derrotasSinAnuncio < 3) return false;
        if (ahora - juego._ultimoAnuncio < 90000) return false;
        juego._derrotasSinAnuncio = 0;
        juego._ultimoAnuncio      = ahora;
        return true;
    },

    // ── UI handlers ──────────────────────────────────────────────────────────

    handleClick: function (x, y) {
        Sonido.unlock();
        if (juego.enDialogo > 0) return;

        var W    = juego.ancho;
        var H    = juego.alto;
        var cx   = juego.centroX;
        var cy   = juego.centroY;
        var r    = juego.radio;
        var desp = juego._desp || 0;
        var pad      = Math.min(W, H) * 0.04;
        var botH     = pad * 3;
        var iconSize = Math.min(botH * 0.75, 34);
        var slot     = iconSize * 1.4;  // ancho de zona por botón lateral (igual que en draw)

        // Botón ayuda (abajo-izquierda)
        if (y > H - botH && x < slot) {
            juego.mostrarAyuda();
            return;
        }
        // Botón configuración (abajo-izquierda, segundo)
        if (y > H - botH && x >= slot && x < slot * 2) {
            juego.mostrarConfiguracion();
            return;
        }
        // Toggle audio (abajo-derecha)
        if (y > H - botH && x > W - slot) {
            juego.setConAudio(!juego.conAudio);
            juego.redibujar();
            return;
        }

        // Récord (centro-inferior)
        if (!juego._installPrompt && juego.record > 0 && y > H - botH && x >= slot * 2 && x < W - slot) {
            juego.mostrarRecord();
            return;
        }

        // Instalar PWA (centro-inferior, solo PWA)
        if (juego._installPrompt && y > H - botH && x >= slot * 2 && x < W - slot) {
            var p = juego._installPrompt;
            p.prompt();
            p.userChoice.then(function () {
                juego._installPrompt = null;
                juego.redibujar();
            });
            return;
        }

        // El círculo central muestra el nivel: no es de ningún color.
        if (juego.distancia(x, y, cx, cy) < juego._rCen) return;

        var N    = juego.numCuadrantes;
        var ang  = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
        var norm = (ang + 360) % 360;
        var idx  = Math.floor(norm / (360 / N));
        var a0   = idx * (360 / N);
        var am   = (a0 + (360 / N) / 2) * Math.PI / 180;
        var cx2  = cx + desp * Math.cos(am);
        var cy2  = cy + desp * Math.sin(am);

        if (juego.distancia(x, y, cx2, cy2) <= r) {
            juego.toque(idx);
        }
    },

    mostrarConfiguracion: function () {
        var sel = juego.numCuadrantesProx;
        var html = [
            '<p style="margin-bottom:12px">Número de cuadrantes por partida:</p>',
            '<div id="nq-sel" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">'
        ];
        for (var n = 3; n <= 8; n++) {
            html.push('<button class="nq-btn' + (n === sel ? ' nq-active' : '') + '" data-n="' + n + '">' + n + '</button>');
        }
        html.push('</div>');
        html.push('<p style="margin-top:10px;color:#666;font-size:0.82rem;text-align:center">Se aplica en la siguiente partida.</p>');
        Modal.show({
            title: '⚙️ Configuración',
            content: html.join(''),
            buttons: { Cerrar: function () {} }
        });
        Array.prototype.forEach.call(document.querySelectorAll('.nq-btn'), function (btn) {
            btn.addEventListener('click', function () {
                var n = parseInt(this.getAttribute('data-n'), 10);
                juego.setNumCuadrantes(n);
                Array.prototype.forEach.call(document.querySelectorAll('.nq-btn'), function (b) {
                    b.classList.toggle('nq-active', parseInt(b.getAttribute('data-n'), 10) === n);
                });
            });
        });
    },

    mostrarRecord: function () {
        Modal.show({
            title: '🏆 Récord',
            content: [
                '<div style="text-align:center;padding:12px 0">',
                '<p style="font-size:4rem;font-weight:bold;line-height:1;color:#004CB3;margin:0 0 10px">',
                juego.record + '</p>',
                '<p style="color:#555;margin:0">niveles superados</p>',
                '</div>'
            ].join(''),
            buttons: { Cerrar: function () {} }
        });
    },

    mostrarAyuda: function (alCerrar) {
        Modal.show({
            title: '❓ Ayuda',
            content: [
                '<p><em>Memoriza y repite la secuencia de colores.</em></p>',
                '<ul>',
                '<li>El juego enciende los cuadrantes uno a uno, cada uno con su propio sonido.</li>',
                '<li>Cuando termine, repite la secuencia pulsando los cuadrantes en el mismo orden.</li>',
                '<li>Cada ronda se añade un nuevo color al final de la secuencia.</li>',
                '<li>Si te equivocas, la partida termina. Se guarda tu récord automáticamente.</li>',
                '<li>Arriba verás «Observa» o «Tu turno».</li>',
                '</ul>',
                '<p><strong>Pantalla</strong></p>',
                '<ul>',
                '<li><b>Número central</b> — nivel actual (longitud de la secuencia).</li>',
                '<li><b>Arco azul</b> — solo durante tu turno: pasos completados&nbsp;/&nbsp;total.</li>',
                '</ul>',
                '<p><strong>Barra inferior</strong></p>',
                '<ul>',
                '<li><b>❓</b> — muestra esta ayuda.</li>',
                '<li><b>⚙️</b> — elige cuántos cuadrantes usar (3–8). No se puede cambiar durante una partida.</li>',
                '<li><b>🏆 número</b> — récord actual. Tócalo para verlo en detalle.</li>',
                '<li><b>🔔&nbsp;/&nbsp;🔕</b> — activa o desactiva el sonido.</li>',
                '</ul>',
                '<br><small>Desarrollado por Ángel Galán Fernández</small>'
            ].join(''),
            buttons: {
                Cerrar: function () {
                    if (alCerrar) alCerrar();
                }
            }
        });
    },

    // localStorage puede estar bloqueado (modo privado, ajustes del navegador) y lanzar
    // al leer o al escribir: el juego sigue con los valores por defecto.
    leer: function (clave) {
        try { return localStorage.getItem(clave); } catch (e) { return null; }
    },

    guardar: function (clave, valor) {
        try { localStorage.setItem(clave, valor); } catch (e) { /* no se guarda */ }
    },

    setNumCuadrantes: function (n) {
        juego.numCuadrantesProx = n;
        juego.guardar('numcuadrantes', n);
    },

    setConAudio: function (valor) {
        juego.conAudio = valor;
        juego.guardar('conaudio', valor);
        juego._audioLabel = valor ? 'Sonido ON' : 'Sonido OFF';
        if (juego._audioLabelTimer) clearTimeout(juego._audioLabelTimer);
        juego._audioLabelTimer = setTimeout(function () {
            juego._audioLabel = '';
            juego._audioLabelTimer = null;
            juego.redibujar();
        }, 2000);
    },

    distancia: function (x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    },

    // ── Canvas rendering ─────────────────────────────────────────────────────

    DibArco: function (ctx, centerX, centerY, radius, color, startAngle, endAngle, encendido) {
        // Las sombras del canvas no siguen la escala del contexto: van en píxeles reales.
        var k = juego.radio * (juego.dpr || 1);
        ctx.beginPath();
        ctx.fillStyle = color;
        if (encendido) {
            // Halo del propio color.
            ctx.shadowColor   = color;
            ctx.shadowBlur    = k * 0.15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else {
            ctx.shadowColor   = 'rgba(0,0,0,0.35)';
            ctx.shadowBlur    = k * 0.06;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = k * 0.02;
        }
        ctx.moveTo(centerX, centerY);
        ctx.ellipse(centerX, centerY, radius, radius, 0,
            startAngle * Math.PI / 180, endAngle * Math.PI / 180, false);
        ctx.closePath();
        ctx.fill();
    },

    // Solo pinta. color: índice del cuadrante encendido, -1 ninguno, -2 todos.
    // Quien enciende un color pide antes su sonido con juego.play(id).
    draw: function (color) {
        juego._encendido = color;

        var canvas = document.getElementById('t1');
        var W = juego.ancho;
        var H = juego.alto;

        var ctx = canvas.getContext('2d');
        // El tamaño ya no se reasigna en cada pintado, así que el estado del contexto
        // no se borra solo: se guarda aquí y se repone al final.
        ctx.save();

        // Fondo degradado
        var bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#8ED6FF');
        bg.addColorStop(1, '#004CB3');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Layout: reservar zona para título (arriba) e iconos (abajo)
        var pad    = Math.min(W, H) * 0.04;
        var titleH = pad * 5;       // título arriba y texto de estado debajo
        var botH   = pad * 3;
        var boardH = H - titleH - botH;

        var cMin = Math.min(W / 2, boardH / 2);
        var r    = cMin * 0.88;
        var desp = cMin * 0.07;

        var cx = W / 2;
        var cy = titleH + boardH / 2;

        juego.centroX = cx;
        juego.centroY = cy;
        juego.radio   = r;
        juego._desp   = desp;

        var N = juego.numCuadrantes;
        var angPer = 360 / N;
        // El sector qi va de qi × 360/N a (qi + 1) × 360/N grados, desde las 3 en punto y
        // en el sentido de las agujas del reloj: con 4, igual que el logo (verde arriba
        // a la izquierda). Primero los apagados y después los encendidos, que son algo
        // mayores y llevan halo, para que queden encima.
        for (var pasada = 0; pasada < 2; pasada++) {
            for (var qi = 0; qi < N; qi++) {
                var encendido = (color === -2 || color === qi);
                if (encendido !== (pasada === 1)) continue;
                var a0 = qi * angPer;
                var am = (a0 + angPer / 2) * Math.PI / 180;
                juego.DibArco(ctx, cx + desp * Math.cos(am), cy + desp * Math.sin(am),
                    encendido ? r * 1.03 : r, juego.SelColor(color, qi),
                    a0, a0 + angPer, encendido);
            }
        }

        // Restablecer sombra
        ctx.shadowColor   = 'transparent';
        ctx.shadowBlur    = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // ── Círculo central con nivel ─────────────────────────────────────────
        var rCen = Math.max(r * 0.20, 24);
        juego._rCen = rCen;

        ctx.beginPath();
        ctx.arc(cx, cy, rCen, 0, Math.PI * 2);
        var cg = ctx.createRadialGradient(cx, cy - rCen * 0.3, 2, cx, cy, rCen);
        cg.addColorStop(0, '#1a3060');
        cg.addColorStop(1, '#0a1830');
        ctx.fillStyle   = cg;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur  = 10;
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur  = 0;
        ctx.strokeStyle = 'rgba(140,200,255,0.35)';
        ctx.lineWidth   = 2;
        ctx.stroke();

        // Número de nivel
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = 'bold ' + Math.floor(rCen * 1.05) + 'px ' + juego.fuente;
        ctx.fillStyle    = '#ffffff';
        ctx.fillText(juego.Secuencia.length.toString(), cx, cy - rCen * 0.05);

        // Arco de progreso + paso (solo durante turno del jugador)
        if (juego.Indice >= 0 && juego.Secuencia.length > 0) {
            var progress  = (juego.Indice + 1) / juego.Secuencia.length;
            var arcR      = rCen + Math.max(r * 0.05, 7);
            var lw        = Math.max(r * 0.025, 4);

            // Track de fondo
            ctx.beginPath();
            ctx.arc(cx, cy, arcR, -Math.PI / 2, Math.PI * 1.5);
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth   = lw;
            ctx.lineCap     = 'round';
            ctx.stroke();

            // Arco completado
            ctx.beginPath();
            ctx.arc(cx, cy, arcR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            ctx.strokeStyle = 'rgba(100,200,255,0.90)';
            ctx.stroke();
            ctx.lineCap = 'butt';

            // Texto del paso debajo del número
            ctx.font      = 'bold ' + Math.floor(rCen * 0.38) + 'px ' + juego.fuente;
            ctx.fillStyle = 'rgba(160,215,255,0.85)';
            ctx.fillText((juego.Indice + 1) + ' / ' + juego.Secuencia.length,
                         cx, cy + rCen * 0.62);
        }

        // ── Título ────────────────────────────────────────────────────────────
        ctx.textBaseline  = 'middle';
        ctx.textAlign     = 'left';
        var titleFontSize = Math.min(pad * 2.38, 56);
        ctx.font          = 'bold ' + titleFontSize + 'px ' + juego.fuente;
        var ty            = pad * 1.75;

        var wAngel = ctx.measureText('Angel').width;
        var wSpc   = titleFontSize * 0.22;
        var wDice  = ctx.measureText('Dice').width;
        var startX = cx - (wAngel + wSpc + wDice) / 2;

        ctx.lineJoin    = 'round';
        ctx.lineWidth   = Math.max(titleFontSize * 0.065, 2.5);
        ctx.strokeStyle = 'rgba(0,10,50,0.8)';

        ctx.shadowColor   = 'rgba(0,10,80,0.9)';
        ctx.shadowBlur    = 18;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle     = '#FFFFFF';
        ctx.strokeText('Angel', startX, ty);
        ctx.fillText('Angel', startX, ty);

        ctx.shadowColor   = 'rgba(100,50,0,0.75)';
        ctx.fillStyle     = '#FFD700';
        ctx.strokeText('Dice', startX + wAngel + wSpc, ty);
        ctx.fillText('Dice', startX + wAngel + wSpc, ty);

        ctx.shadowColor   = 'transparent';
        ctx.shadowBlur    = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.lineWidth     = 1;

        // ── Texto de estado: de quién es el turno ─────────────────────────────
        var textoEstado = juego.textoEstado();
        if (textoEstado) {
            ctx.font      = 'bold ' + Math.min(Math.max(16, Math.floor(pad * 1.1)), 28) + 'px ' + juego.fuente;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(textoEstado, cx, pad * 4);
        }

        // ── Barra inferior ────────────────────────────────────────────────────
        var botY     = H - botH / 2;
        var iconSize = Math.min(botH * 0.75, 34);

        if (juego._installPrompt) {
            ctx.font      = Math.max(16, Math.floor(botH * 0.30)) + 'px ' + juego.fuente;
            ctx.fillStyle = 'rgba(200,240,255,0.95)';
            ctx.textAlign = 'center';
            ctx.fillText('⬇ Instalar', cx, botY);
        } else if (juego.record > 0) {
            ctx.font      = Math.max(16, Math.floor(botH * 0.30)) + 'px ' + juego.fuente;
            ctx.fillStyle = 'rgba(255,230,100,0.9)';
            ctx.textAlign = 'center';
            ctx.fillText('🏆 ' + juego.record, cx, botY);
        }

        ctx.font      = iconSize + 'px ' + juego.fuente;
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(juego.conAudio ? '🔔' : '🔕', W - pad * 0.4, botY);

        if (juego._audioLabel) {
            ctx.font      = Math.floor(botH * 0.28) + 'px ' + juego.fuente;
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.textAlign = 'right';
            ctx.fillText(juego._audioLabel, W - pad * 0.4 - iconSize * 1.3, botY);
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,160,0.9)';
        ctx.fillText('❓', pad * 0.4, botY);
        ctx.fillStyle = 'rgba(200,220,255,0.85)';
        ctx.fillText('⚙️', pad * 0.4 + iconSize * 1.4, botY);

        ctx.restore();
    },

    // Único sitio que fija el tamaño del canvas: al arrancar y al redimensionar.
    ajustarCanvas: function () {
        var canvas = document.getElementById('t1');
        var W = window.innerWidth;
        var H = window.innerHeight;
        // El canvas tiene tantos píxeles como la pantalla (hasta 3 por píxel CSS, para
        // no gastar memoria de más) y se pinta escalado: todo el código de dibujo y de
        // toques trabaja en píxeles CSS, con juego.ancho y juego.alto.
        var dpr = Math.min(window.devicePixelRatio || 1, 3);
        juego.dpr = dpr;
        canvas.width        = Math.round(W * dpr);
        canvas.height       = Math.round(H * dpr);
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';
        canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
        juego.ancho = W;
        juego.alto  = H;
    },

    // Enciende un color durante ms. Solo hay un apagado pendiente: el anterior se cancela.
    encender: function (color, ms) {
        if (juego._tApagado) clearTimeout(juego._tApagado);
        juego.draw(color);
        juego._tApagado = setTimeout(function () {
            juego._tApagado = null;
            juego.draw(-1);
        }, ms);
    },

    // Repinta sin cambiar lo que está encendido (giro de pantalla, texto de sonido...).
    redibujar: function () {
        juego.draw(juego._encendido);
    },

    // Color de un sector: pleno si está encendido, oscurecido si no.
    SelColor: function (colSecuencia, colPosicion) {
        var color = juego.colores2[colPosicion];
        var encendido = (colSecuencia === -2 || colSecuencia === colPosicion);
        return encendido ? color : juego.oscurecer(color, 0.55);
    },

    // '#RRGGBB' con cada canal multiplicado por factor (0 negro, 1 igual), en minúsculas.
    oscurecer: function (hex, factor) {
        var n = parseInt(hex.slice(1), 16);
        var canal = function (v) {
            var h = Math.round(v * factor).toString(16);
            return h.length < 2 ? '0' + h : h;
        };
        return '#' + canal(n >> 16 & 255) + canal(n >> 8 & 255) + canal(n & 255);
    },

    // Hay un diálogo abierto o la página está en segundo plano.
    bloqueado: function () {
        return juego.pausa || juego.enDialogo > 0;
    },

    // Enseña la secuencia paso a paso; el tono de cada color suena al encenderse.
    // Si al terminar un paso el juego está bloqueado, apaga y espera; al desbloquearse
    // empieza otra vez por el primer color.
    reproducirSecuencia: function () {
        juego.estado = 'mostrando';
        juego.redibujar();

        function esperar() {
            if (juego.bloqueado()) { setTimeout(esperar, 100); } else { empezar(); }
        }
        function tras(ms, siguiente) {
            setTimeout(function () {
                if (juego.bloqueado()) { juego.draw(-1); esperar(); } else { siguiente(); }
            }, ms);
        }
        function empezar() {
            tras(juego.msInicial, function () { color(0); });
        }
        function color(i) {
            juego.play(juego.Secuencia[i]);
            juego.draw(juego.Secuencia[i]);
            tras(juego.msEncendido, function () {
                juego.draw(-1);
                if (i + 1 < juego.Secuencia.length) {
                    tras(juego.msApagado, function () { color(i + 1); });
                } else {
                    // El turno empieza en cuanto se apaga el último color.
                    juego.estado = 'turno';
                    juego.redibujar();
                }
            });
        }

        empezar();
    },

    // Lo que se lee bajo el título: quién tiene el turno.
    textoEstado: function () {
        switch (juego.estado) {
            case 'demo':
            case 'mostrando': return 'Observa';
            case 'turno':     return 'Tu turno';
            case 'acierto':   return '¡Bien!';
            default:          return '';
        }
    },

    play: function (id) {
        if (!juego.conAudio) return;
        Sonido.play(id);
    },

    demoCuadrantes: function (callback) {
        juego.estado = 'demo';
        var N = juego.numCuadrantes;
        var i = 0;
        function paso() {
            if (i >= N) {
                juego.draw(-1);
                if (callback) callback();
                return;
            }
            juego.play(i);
            juego.draw(i);
            setTimeout(function () {
                juego.draw(-1);
                setTimeout(function () { i++; paso(); }, 100);
            }, 400);
        }
        paso();
    },

    // Prepara una partida nueva. Con conDialogo espera a que el jugador pulse «Jugar»
    // (al arrancar la aplicación y después de un anuncio): ese toque es además el gesto
    // que el navegador exige para dejar sonar el audio. Sin él, empieza sola enseguida.
    iniciarSecuencia: function (conDialogo) {
        juego.numCuadrantes = juego.numCuadrantesProx;
        juego.Secuencia = [juego.Random3()];
        juego.Indice    = -1;
        juego.estado    = 'espera';
        juego.draw(-1);

        if (!conDialogo) {
            setTimeout(juego.empezar, juego.msAntesDeEmpezar);
            return;
        }

        var primeraVez = juego.ayudaAlIniciar;
        if (primeraVez) {
            juego.ayudaAlIniciar = false;
            juego.guardar('ayudaaliniciar', 'false');
        }
        Modal.show({
            title: primeraVez ? 'Cómo se juega' : 'Angel Dice',
            content: primeraVez
                ? [
                    '<ul>',
                    '<li>Mira qué colores se encienden y en qué orden.</li>',
                    '<li>Cuando ponga «Tu turno», tócalos en el mismo orden.</li>',
                    '<li>Cada nivel añade un color más.</li>',
                    '</ul>'
                ].join('')
                : '<p>Repite la secuencia de colores.</p>',
            buttons: { Jugar: { action: juego.empezar, btnClass: 'btn-green' } }
        });
    },

    // Arranca la partida preparada. La demo de los cuadrantes se ve una vez por sesión.
    empezar: function () {
        if (juego.estado !== 'espera') return;
        if (juego._demoVista) {
            juego.reproducirSecuencia();
        } else {
            juego._demoVista = true;
            juego.demoCuadrantes(juego.reproducirSecuencia);
        }
    },

    toque: function (color) {
        if (juego.estado !== 'turno') return;

        juego.Indice++;
        juego.play(color);
        juego.encender(color, juego.msToque);

        if (juego.Secuencia[juego.Indice] !== color) {
            juego.fallo();
            return;
        }

        if (juego.Indice + 1 >= juego.Secuencia.length) {
            juego.estado = 'acierto';
            juego.redibujar();
            setTimeout(function () {
                juego.Secuencia.push(juego.Random3());
                juego.Indice = -1;
                juego.animarAcierto(function () {
                    juego.reproducirSecuencia();
                });
            }, juego.msTrasAcierto);
        }
    },

    // El jugador se ha equivocado: sonido de fallo, tres parpadeos del color que tocaba
    // y diálogo de fin de partida. El resultado es siempre «niveles superados».
    fallo: function () {
        juego.estado = 'fin';
        if (juego._tApagado) { clearTimeout(juego._tApagado); juego._tApagado = null; }

        var correcto  = juego.Secuencia[juego.Indice];
        var superados = juego.Secuencia.length - 1;
        var esRecord  = superados > juego.record;
        if (esRecord) {
            juego.record = superados;
            juego.guardar('record', juego.record);
        }
        juego.play(9);

        var veces = 0;
        function parpadeo() {
            if (veces === 3) { juego.mostrarFin(superados, esRecord); return; }
            veces++;
            juego.draw(correcto);
            setTimeout(function () {
                juego.draw(-1);
                setTimeout(parpadeo, 150);
            }, 200);
        }
        // El color equivocado se queda encendido lo mismo que cualquier toque.
        setTimeout(function () {
            juego.draw(-1);
            setTimeout(parpadeo, 150);
        }, juego.msToque);
    },

    textoSuperados: function (n) {
        if (n === 0) return 'No has superado ningún nivel';
        return 'Has superado <b>' + n + '</b> ' + (n === 1 ? 'nivel' : 'niveles');
    },

    mostrarFin: function (superados, esRecord) {
        var otra = function () { juego.reiniciar(superados); };
        var btns = {};
        if (navigator.share && superados > 0) {
            btns.Compartir = {
                btnClass: 'btn-share',
                action: function () {
                    // La partida siguiente espera a que se cierre la hoja de compartir.
                    var envio = null;
                    try {
                        envio = navigator.share({
                            title: 'Angel Dice',
                            text: '¡He superado ' + superados + (superados === 1 ? ' nivel' : ' niveles') +
                                  ' en Angel Dice! ¿Puedes superarme?',
                            url: juego.urlPublica
                        });
                    } catch (e) { envio = null; }
                    if (envio && envio.then) { envio.then(otra, otra); } else { otra(); }
                }
            };
        }
        btns['Jugar otra vez'] = { action: otra, btnClass: 'btn-green' };

        Modal.show({
            title: '😵 Fin de la partida',
            content: juego.textoSuperados(superados) +
                     (esRecord ? '<p class="nuevo-record">¡Nuevo récord!</p>' : ''),
            buttons: btns
        });
    },

    // «Jugar otra vez». En Android, si toca intersticial, se muestra aquí (nunca en el
    // momento del fallo) y la partida siguiente espera en el diálogo «Jugar», que queda
    // debajo del anuncio: así no empieza sola mientras el anuncio está en pantalla ni
    // depende de que el plugin avise de que se ha cerrado.
    reiniciar: function (superados) {
        if (_isAndroid && juego.tocaIntersticial(superados, Date.now())) {
            juego.MostrarPubliInterstitial();
            juego.iniciarSecuencia(true);
        } else {
            juego.iniciarSecuencia(false);
        }
    },

    Random3: function () {
        return Math.floor(Math.random() * juego.numCuadrantes);
    },

    mostrarSplash: function (callback) {
        var canvas = document.getElementById('t1');
        var W = juego.ancho;
        var H = juego.alto;

        juego.centroX = W / 2;
        juego.centroY = H / 2;

        var ctx = canvas.getContext('2d');
        ctx.save();
        var bg  = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#8ED6FF');
        bg.addColorStop(1, '#004CB3');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        var cx   = W / 2;
        var cy   = H * 0.42;
        var r    = Math.min(W, H) * 0.28;
        var desp = r * 0.07;
        var ang  = [[0, 90], [90, 180], [180, 270], [270, 360]];
        var off  = [[desp, desp], [-desp, desp], [-desp, -desp], [desp, -desp]];

        juego.colores2.slice(0, 4).forEach(function (col, i) {
            var g = ctx.createRadialGradient(cx, cy, 10, cx, cy, r * 1.2);
            g.addColorStop(0, '#cccccc');
            g.addColorStop(1, col);
            ctx.beginPath();
            ctx.fillStyle     = g;
            ctx.shadowColor   = 'rgba(10,10,10,0.6)';
            ctx.shadowBlur    = 10;
            ctx.shadowOffsetX = 10;
            ctx.shadowOffsetY = 10;
            ctx.moveTo(cx + off[i][0], cy + off[i][1]);
            ctx.ellipse(cx + off[i][0], cy + off[i][1], r, r, 0,
                ang[i][0] * Math.PI / 180, ang[i][1] * Math.PI / 180, false);
            ctx.closePath();
            ctx.fill();
        });

        ctx.shadowColor   = 'transparent';
        ctx.shadowBlur    = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        var titleSize = Math.min(W * 0.12, 58);
        ctx.font         = 'bold ' + titleSize + 'px ' + juego.fuente;
        ctx.textAlign    = 'left';
        ctx.textBaseline = 'middle';

        var tsy    = cy + r * 1.25;
        var tsA    = ctx.measureText('Angel').width;
        var tsSpc  = titleSize * 0.22;
        var tsD    = ctx.measureText('Dice').width;
        var tsX    = cx - (tsA + tsSpc + tsD) / 2;

        ctx.lineJoin    = 'round';
        ctx.lineWidth   = Math.max(titleSize * 0.065, 2.5);
        ctx.strokeStyle = 'rgba(0,10,50,0.8)';

        ctx.shadowColor   = 'rgba(0,10,80,0.9)';
        ctx.shadowBlur    = 18;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle     = '#FFFFFF';
        ctx.strokeText('Angel', tsX, tsy);
        ctx.fillText('Angel', tsX, tsy);

        ctx.shadowColor   = 'rgba(100,50,0,0.75)';
        ctx.fillStyle     = '#FFD700';
        ctx.strokeText('Dice', tsX + tsA + tsSpc, tsy);
        ctx.fillText('Dice', tsX + tsA + tsSpc, tsy);

        ctx.shadowColor   = 'transparent';
        ctx.shadowBlur    = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.lineWidth     = 1;
        ctx.font      = Math.floor(titleSize * 0.38) + 'px ' + juego.fuente;
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.textAlign = 'center';
        ctx.fillText('Juego de memoria', cx, cy + r * 1.62);

        ctx.restore();

        setTimeout(callback, 1400);
    },

    animarAcierto: function (callback) {
        juego.play(8);
        juego.draw(-2);
        var canvas = document.getElementById('t1');
        var ctx    = canvas.getContext('2d');
        var cx     = juego.centroX;
        var cy     = juego.centroY;
        var r      = juego.radio;
        var start  = null;
        var dur    = 700;

        function paso(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / dur, 1);

            juego.draw(-2);

            for (var i = 0; i < 3; i++) {
                var pi    = (p + i / 3) % 1;
                var rr    = r * 0.1 + r * 1.1 * pi;
                var alpha = (1 - pi) * 0.75;
                ctx.beginPath();
                ctx.arc(cx, cy, rr, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,255,255,' + alpha.toFixed(2) + ')';
                ctx.lineWidth   = Math.max(3, r * 0.04);
                ctx.lineCap     = 'butt';
                ctx.stroke();
            }

            if (p < 1) {
                requestAnimationFrame(paso);
            } else {
                if (callback) callback();
            }
        }

        requestAnimationFrame(paso);
    }
};

window.addEventListener('load', function () {
    juego.inicializar();
});
