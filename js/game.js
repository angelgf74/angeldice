'use strict';

// ─── Modal dialog system (replaces jquery-confirm) ───────────────────────────

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
                var action = typeof cfg === 'function' ? cfg : (cfg && cfg.action);
                if (action) action();
            });
            btnsEl.appendChild(btn);
        });

        overlay.classList.remove('hidden');
        juego.enDialogo++;

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
        document.getElementById('modal-overlay').classList.add('hidden');
        juego.enDialogo = Math.max(0, juego.enDialogo - 1);
    },

    _clearTimer: function () {
        if (Modal._timer) { clearTimeout(Modal._timer); Modal._timer = null; }
    }
};

// ─── Game ────────────────────────────────────────────────────────────────────

var juego = {
    //            Azul       Amarillo   Verde      Rojo
    colores2: ['#7777FF', '#FFFF77', '#338833', '#FF3333'],

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

    audios: [],
    record: 0,

    inicializar: function () {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }

        juego.conAudio       = localStorage.getItem('conaudio') === 'true';
        var savedAyuda       = localStorage.getItem('ayudaaliniciar');
        juego.record         = parseInt(localStorage.getItem('record'), 10) || 0;

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

        setTimeout(function () { juego.draw(-1, 0); }, 100);

        if (juego.ayudaAlIniciar) {
            localStorage.setItem('ayudaaliniciar', 'false');
            juego.mostrarAyuda(function () { juego.iniciarSecuencia(true); });
        } else {
            juego.iniciarSecuencia(true);
        }
    },

    handleClick: function (x, y) {
        if (juego.enDialogo > 0) return;

        var ancho       = juego.ancho;
        var alto        = juego.alto;
        var cx          = ancho / 2;
        var cy          = alto  / 2;
        var cMinimo     = Math.min(cx, cy);
        var cMinimoRedu = cMinimo * 0.75;
        var desp        = (cMinimo - cMinimoRedu) * 0.4;

        // Botón ayuda (abajo-izquierda)
        if (y > alto - desp * 2.5 && x < desp * 2.5) {
            juego.mostrarAyuda();
            return;
        }
        // Toggle audio (abajo-derecha)
        if (y > alto - desp * 2.5 && x > ancho - desp * 2.5) {
            juego.setConAudio(!juego.conAudio);
            juego.draw(-1, 0);
            return;
        }

        var r   = cMinimoRedu;
        var idx = (y < cy) ? ((x < cx) ? 2 : 3) : ((x < cx) ? 1 : 0);
        var cy2 = cy + desp * (idx < 2 ?  1 : -1);
        var cx2 = cx + desp * ((((idx & 1) === 0) ^ ((idx & 2) === 0)) ? -1 : 1);

        if (juego.distancia(x, y, cx2, cy2) <= r) {
            juego.toque(idx);
        }
    },

    mostrarAyuda: function (alCerrar) {
        Modal.show({
            title: '❓ Ayuda',
            content: [
                '<p><strong>Angel Dice.</strong></p>',
                '<p><em>Sigue la secuencia</em></p>',
                '<ul>',
                '<li>El juego consta de cuatro botones, cada uno de un color diferente ',
                '(azul, amarillo, verde y rojo) que emite un sonido propio.</li>',
                '<li>El jugador debe pulsar los botones en la misma secuencia que el juego indique.</li>',
                '<li>La secuencia comienza con un único botón y se va incrementando con un nuevo botón aleatorio.</li>',
                '<li>El jugador pierde cuando comete un fallo.</li>',
                '<li>Cuando la secuencia es completada, el juego avisa encendiendo los cuatro botones simultáneamente.</li>',
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

    setConAudio: function (valor) {
        juego.conAudio = valor;
        localStorage.setItem('conaudio', valor);
    },

    distancia: function (x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    },

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

        var canvas    = document.getElementById('t1');
        var anchoReal = window.innerWidth;
        var altoReal  = window.innerHeight;

        canvas.width        = anchoReal;
        canvas.height       = altoReal;
        canvas.style.width  = anchoReal + 'px';
        canvas.style.height = altoReal  + 'px';

        juego.ancho = anchoReal;
        juego.alto  = altoReal;

        var ctx   = canvas.getContext('2d');
        var cx    = anchoReal / 2;
        var cy    = altoReal  / 2;
        var cMin  = Math.min(cx, cy);
        var r     = cMin * 0.85;
        var desp  = (cMin - r) * 0.4;

        juego.centroX = cx;
        juego.centroY = cy;
        juego.radio   = r;

        // Fondo degradado
        var bg = ctx.createLinearGradient(0, 0, anchoReal, altoReal);
        bg.addColorStop(0, '#8ED6FF');
        bg.addColorStop(1, '#004CB3');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, anchoReal, altoReal);

        // Cuatro cuadrantes
        juego.DibArco(ctx, cx + desp, cy + desp, r, juego.SelColor(color, 0, ctx),   0,  90);
        juego.DibArco(ctx, cx - desp, cy + desp, r, juego.SelColor(color, 1, ctx),  90, 180);
        juego.DibArco(ctx, cx - desp, cy - desp, r, juego.SelColor(color, 2, ctx), 180, 270);
        juego.DibArco(ctx, cx + desp, cy - desp, r, juego.SelColor(color, 3, ctx), 270, 360);

        // Restablecer sombra para texto
        ctx.shadowColor   = 'transparent';
        ctx.shadowBlur    = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        var grad = ctx.createLinearGradient(0, desp, anchoReal, desp * 4);
        grad.addColorStop(0, '#ff0000');
        grad.addColorStop(1, '#ffff77');

        ctx.fillStyle  = grad;
        ctx.textAlign  = 'center';
        ctx.font       = (desp * 6) + 'px Arial';
        ctx.fillText('Angel Dice', cx, desp * 5);

        if (juego.record > 0) {
            ctx.font = (desp * 4) + 'px Arial';
            ctx.fillText('Record: ' + juego.record, anchoReal / 2, altoReal - 1.75 * desp);
        }

        ctx.font = (desp * 1.5) + 'px Arial';
        ctx.fillText(juego.Secuencia.length.toString(),  cx + desp + r / 2, cy + 7);
        ctx.fillText((juego.Indice + 1).toString(),      cx - desp - r / 2, cy + 7);

        // Iconos de ayuda y audio
        ctx.font       = (desp * 2.8) + 'px Arial';
        ctx.fillStyle  = 'rgba(255,255,255,0.85)';
        ctx.textAlign  = 'right';
        ctx.fillText(juego.conAudio ? '🔔' : '🔕',
            anchoReal - 0.5 * desp, altoReal - 0.5 * desp);

        ctx.textAlign  = 'left';
        ctx.fillStyle  = 'rgba(255,255,160,0.9)';
        ctx.fillText('❓', 0.5 * desp, altoReal - 0.5 * desp);
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
        if (id === -2) id = 4;
        if (!juego.audios[id]) {
            juego.audios[id] = new Audio('audio/n' + id + '.ogg');
        }
        juego.audios[id].currentTime = 0;
        juego.audios[id].play().catch(function () {});
    },

    iniciarSecuencia: function (primera) {
        juego.Secuencia = [juego.Random3()];
        juego.Indice    = -1;
        Modal.show({
            title: '⚠️ Atento',
            content: '<center><h1>⚠️ ¡ATENTO!</h1><p>Va a empezar la partida</p></center>',
            autoClose: 'Aceptar|5000',
            buttons: {
                Aceptar: {
                    action: function () {
                        juego.reproducirSecuencia();
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
                    juego.draw(-2, 0);
                    juego.Secuencia.push(juego.Random3());
                    juego.Indice = -1;
                    juego.reproducirSecuencia();
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
            juego.play(5);
            Modal.show({
                title: '😵 Perdiste',
                content: 'Perdiste en el <b>nivel ' + nivel + '</b>',
                buttons: {
                    Aceptar: function () {
                        var f = function () {
                            if (juego.pausa) { setTimeout(f, 100); }
                            else             { juego.iniciarSecuencia(false); }
                        };
                        setTimeout(f, 750);
                    }
                }
            });
        }
    },

    Random3: function () {
        return Math.floor(Math.random() * 4);
    }
};

window.addEventListener('load', function () {
    juego.inicializar();
});
