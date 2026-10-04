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
        if (Sonido.ctx.state === 'suspended') {
            Sonido.ctx.resume().then(function () { Sonido.play(id); });
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
    ReproduciendoSecuencia: false,
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
    tIntervalo: 100,
    pasosEncendido: 8,
    pasosApagado: 2,

    record: 0,

    // PWA only
    _installPrompt: null,
    _audioLabel: '',
    _audioLabelTimer: null,

    // Android / AdMob only
    adModBannerId:       'ca-app-pub-8600791204816041/4844265247',
    adModInterstitialId: 'ca-app-pub-8600791204816041/7753322005',
    _banner:             null,
    _interstitial:       null,

    inicializar: function () {
        if (!_isAndroid) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js');
            }
        }

        Sonido.init();

        juego.conAudio        = localStorage.getItem('conaudio') === 'true';
        var savedAyuda        = localStorage.getItem('ayudaaliniciar');
        juego.record          = parseInt(localStorage.getItem('record'), 10) || 0;
        juego.numCuadrantes   = Math.max(3, Math.min(8, parseInt(localStorage.getItem('numcuadrantes'), 10) || 4));
        juego.numCuadrantesProx = juego.numCuadrantes;

        if (savedAyuda === null) {
            juego.ayudaAlIniciar = true;
            localStorage.setItem('ayudaaliniciar', 'true');
        } else {
            juego.ayudaAlIniciar = savedAyuda === 'true';
        }

        document.addEventListener('visibilitychange', function () {
            juego.pausa = document.hidden;
        });

        var canvas = document.getElementById('t1');

        canvas.addEventListener('click', function (e) {
            var rect = canvas.getBoundingClientRect();
            var sx   = canvas.width  / rect.width;
            var sy   = canvas.height / rect.height;
            juego.handleClick((e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy);
        });

        canvas.addEventListener('touchstart', function (e) {
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', function (e) {
            e.preventDefault();
            var touch = e.changedTouches[0];
            var rect  = canvas.getBoundingClientRect();
            var sx    = canvas.width  / rect.width;
            var sy    = canvas.height / rect.height;
            juego.handleClick((touch.clientX - rect.left) * sx, (touch.clientY - rect.top) * sy);
        }, { passive: false });

        window.addEventListener('resize', function () {
            juego.draw(-1, 0);
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
            var initAdMob = function () { juego.InicializaPubli(); };
            if (window.admob) {
                initAdMob();
            } else {
                document.addEventListener('deviceready', initAdMob, false);
            }
        }

        setTimeout(function () {
            juego.mostrarSplash(function () {
                if (juego.ayudaAlIniciar) {
                    localStorage.setItem('ayudaaliniciar', 'false');
                    juego.mostrarAyuda(function () { juego.iniciarSecuencia(true); });
                } else {
                    juego.iniciarSecuencia(true);
                }
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
            juego.draw(-1, 0);
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
                juego.draw(-1, 0);
            });
            return;
        }

        var N    = juego.numCuadrantes;
        var ang  = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
        var norm = (ang + 90 + 360) % 360;
        var idx  = Math.floor(norm / (360 / N));
        var a0   = -90 + idx * (360 / N);
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
                '<p style="color:#555;margin:0">nivel más alto alcanzado</p>',
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
                '<li>Al completar la secuencia, todos los cuadrantes se iluminan con una animación de ondas.</li>',
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

    setNumCuadrantes: function (n) {
        juego.numCuadrantesProx = n;
        localStorage.setItem('numcuadrantes', n);
    },

    setConAudio: function (valor) {
        juego.conAudio = valor;
        localStorage.setItem('conaudio', valor);
        juego._audioLabel = valor ? 'Sonido ON' : 'Sonido OFF';
        if (juego._audioLabelTimer) clearTimeout(juego._audioLabelTimer);
        juego._audioLabelTimer = setTimeout(function () {
            juego._audioLabel = '';
            juego._audioLabelTimer = null;
            juego.draw(-1, 0);
        }, 2000);
    },

    distancia: function (x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    },

    // ── Canvas rendering ─────────────────────────────────────────────────────

    DibArco: function (ctx, centerX, centerY, radius, color, startAngle, endAngle) {
        ctx.beginPath();
        ctx.fillStyle   = color;
        ctx.lineWidth   = juego.radio * 0.03;
        ctx.shadowColor   = 'rgba(10,10,10,0.7)';
        ctx.shadowBlur    = 10;
        ctx.shadowOffsetX = 15;
        ctx.shadowOffsetY = 15;
        ctx.moveTo(centerX, centerY);
        ctx.ellipse(centerX, centerY, radius, radius, 0,
            startAngle * Math.PI / 180, endAngle * Math.PI / 180, false);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    },

    draw: function (color, paso) {
        if (paso === 0) {
            if (color !== null && color !== undefined && color !== -1) {
                juego.play(color);
            }
        }

        var canvas = document.getElementById('t1');
        var W = window.innerWidth;
        var H = window.innerHeight;

        canvas.width        = W;
        canvas.height       = H;
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';

        juego.ancho = W;
        juego.alto  = H;

        var ctx = canvas.getContext('2d');

        // Fondo degradado
        var bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#8ED6FF');
        bg.addColorStop(1, '#004CB3');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Layout: reservar zona para título (arriba) e iconos (abajo)
        var pad    = Math.min(W, H) * 0.04;
        var titleH = pad * 3.5;
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
        for (var qi = 0; qi < N; qi++) {
            var a0  = -90 + qi * angPer;
            var am  = (a0 + angPer / 2) * Math.PI / 180;
            juego.DibArco(ctx, cx + desp * Math.cos(am), cy + desp * Math.sin(am), r,
                juego.SelColor(color, qi, ctx), a0, a0 + angPer);
        }

        // Restablecer sombra
        ctx.shadowColor   = 'transparent';
        ctx.shadowBlur    = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // ── Círculo central con nivel ─────────────────────────────────────────
        var rCen = Math.max(r * 0.20, 24);

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
        ctx.font         = 'bold ' + Math.floor(rCen * 1.05) + 'px Arial';
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
            ctx.font      = 'bold ' + Math.floor(rCen * 0.38) + 'px Arial';
            ctx.fillStyle = 'rgba(160,215,255,0.85)';
            ctx.fillText((juego.Indice + 1) + ' / ' + juego.Secuencia.length,
                         cx, cy + rCen * 0.62);
        }

        // ── Título ────────────────────────────────────────────────────────────
        ctx.textBaseline  = 'middle';
        ctx.textAlign     = 'left';
        var titleFontSize = Math.min(titleH * 0.68, 56);
        ctx.font          = 'bold ' + titleFontSize + 'px Arial';
        var ty            = titleH / 2;

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

        // ── Barra inferior ────────────────────────────────────────────────────
        var botY     = H - botH / 2;
        var iconSize = Math.min(botH * 0.75, 34);

        if (juego._installPrompt) {
            ctx.font      = Math.floor(botH * 0.30) + 'px Arial';
            ctx.fillStyle = 'rgba(200,240,255,0.95)';
            ctx.textAlign = 'center';
            ctx.fillText('⬇ Instalar', cx, botY);
        } else if (juego.record > 0) {
            ctx.font      = Math.floor(botH * 0.30) + 'px Arial';
            ctx.fillStyle = 'rgba(255,230,100,0.9)';
            ctx.textAlign = 'center';
            ctx.fillText('🏆 ' + juego.record, cx, botY);
        }

        ctx.font      = iconSize + 'px Arial';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(juego.conAudio ? '🔔' : '🔕', W - pad * 0.4, botY);

        if (juego._audioLabel) {
            ctx.font      = Math.floor(botH * 0.28) + 'px Arial';
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.textAlign = 'right';
            ctx.fillText(juego._audioLabel, W - pad * 0.4 - iconSize * 1.3, botY);
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,160,0.9)';
        ctx.fillText('❓', pad * 0.4, botY);
        ctx.fillStyle = 'rgba(200,220,255,0.85)';
        ctx.fillText('⚙️', pad * 0.4 + iconSize * 1.4, botY);

        ctx.textBaseline = 'alphabetic';
    },

    SelColor: function (colSecuencia, colPosicion, ctx) {
        var g = ctx.createRadialGradient(
            juego.centroX, juego.centroY, 10,
            juego.centroX, juego.centroY, juego.radio * 1.2
        );
        var centro = (colSecuencia === -2 || colSecuencia === colPosicion) ? '#ddd' : '#000';
        g.addColorStop(0, centro);
        g.addColorStop(1, juego.colores2[colPosicion]);
        return g;
    },

    reproducirSecuencia: function () {
        juego.ReproduciendoSecuencia = true;
        var idx  = 0;
        var paso = 0;
        var tid  = setInterval(function () {
            if (juego.pausa) return;

            var encendido = paso > juego.pasosApagado;
            var c = encendido ? juego.Secuencia[idx] : -1;
            paso++;

            if (paso >= juego.pasosEncendido + juego.pasosApagado) {
                paso = 0;
                idx++;
            }
            if (idx === juego.Secuencia.length + 1) c = -2;

            juego.draw(c, paso);

            if (idx > juego.Secuencia.length + 1) {
                juego.draw(-1, paso);
                clearInterval(tid);
                juego.ReproduciendoSecuencia = false;
            }
        }, juego.tIntervalo);
    },

    play: function (id) {
        if (!juego.conAudio) return;
        if (id === -2) id = 8;
        Sonido.play(id);
    },

    demoCuadrantes: function (callback) {
        var N = juego.numCuadrantes;
        var i = 0;
        function paso() {
            if (i >= N) {
                juego.draw(-1, 1);
                if (callback) callback();
                return;
            }
            juego.draw(i, 0);
            setTimeout(function () {
                juego.draw(-1, 1);
                setTimeout(function () { i++; paso(); }, 100);
            }, 400);
        }
        paso();
    },

    iniciarSecuencia: function (primera) {
        juego.numCuadrantes = juego.numCuadrantesProx;
        juego.Secuencia = [juego.Random3()];
        juego.Indice    = -1;
        juego.draw(-1, 0);
        Modal.show({
            title: '⚠️ Atento',
            content: '<center><h1>⚠️ ¡ATENTO!</h1><p>Va a empezar la partida</p></center>',
            autoClose: 'Aceptar|5000',
            buttons: {
                Aceptar: {
                    action: function () {
                        juego.demoCuadrantes(function () {
                            juego.reproducirSecuencia();
                        });
                    },
                    btnClass: 'btn-green'
                }
            }
        });
    },

    toque: function (color) {
        if (juego.ReproduciendoSecuencia) return;

        juego.Indice++;
        var correcto = juego.Secuencia[juego.Indice] === color;
        juego.draw(color, 0);

        if (correcto) {
            if (juego.Indice + 1 >= juego.Secuencia.length) {
                setTimeout(function () {
                    juego.Secuencia.push(juego.Random3());
                    juego.Indice = -1;
                    juego.animarAcierto(function () {
                        juego.reproducirSecuencia();
                    });
                }, 1000);
            } else {
                setTimeout(function () { juego.draw(-1, 0); }, 1000);
            }
        } else {
            var nivel = juego.Secuencia.length;
            if (nivel - 1 > juego.record) {
                juego.record = nivel - 1;
                localStorage.setItem('record', juego.record);
            }
            juego.play(9);

            if (_isAndroid) juego.MostrarPubliInterstitial();

            var reiniciar = function () {
                var f = function () {
                    if (juego.pausa || juego.enDialogo > 0) { setTimeout(f, 100); }
                    else             { juego.iniciarSecuencia(false); }
                };
                setTimeout(f, 750);
            };
            var shareUrl = _isAndroid ? 'https://angelgf.com.es/angeldice/' : window.location.href;
            var btns = { Aceptar: reiniciar };
            if (navigator.share) {
                btns = {
                    Compartir: {
                        btnClass: 'btn-share',
                        action: function () {
                            navigator.share({
                                title: 'Angel Dice',
                                text: '¡He llegado al nivel ' + (nivel - 1) + ' en Angel Dice! ¿Puedes superarme?',
                                url: shareUrl
                            }).catch(function () {});
                            reiniciar();
                        }
                    },
                    Aceptar: reiniciar
                };
            }
            Modal.show({
                title: '😵 Perdiste',
                content: 'Perdiste en el <b>nivel ' + nivel + '</b>',
                buttons: btns
            });
        }
    },

    Random3: function () {
        return Math.floor(Math.random() * juego.numCuadrantes);
    },

    mostrarSplash: function (callback) {
        var canvas = document.getElementById('t1');
        var W = window.innerWidth;
        var H = window.innerHeight;
        canvas.width        = W;
        canvas.height       = H;
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';

        juego.ancho   = W;
        juego.alto    = H;
        juego.centroX = W / 2;
        juego.centroY = H / 2;

        var ctx = canvas.getContext('2d');
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
        ctx.font         = 'bold ' + titleSize + 'px Arial';
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
        ctx.font      = Math.floor(titleSize * 0.38) + 'px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.textAlign = 'center';
        ctx.fillText('Juego de memoria', cx, cy + r * 1.62);

        setTimeout(callback, 1400);
    },

    animarAcierto: function (callback) {
        juego.draw(-2, 0);
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

            juego.draw(-2, 1);

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
