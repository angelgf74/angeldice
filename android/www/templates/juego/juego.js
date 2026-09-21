/*

AngelDiceBanner:        ca-app-pub-8600791204816041/4844265247
AngelDiceIntersticial:  ca-app-pub-8600791204816041/7753322005
*/
juego = {
    //          Azul      Amarillo   Verde      Rojo
    colores1: ["#000088","#BBBB33", "#336633", "#BB3333"], // apagado
    colores2: ["#7777FF","#FFFF00", "#008800", "#FF0000"], // encendido

    Secuencia: [],
    Indice: -1,
    ultimoColor:"",

    adModBannerId: "ca-app-pub-8600791204816041/4844265247",
    adModInterstitialId: "ca-app-pub-8600791204816041/7753322005",

    _banner: null,
    _interstitial: null,

    inicializar:function()
    {
        $("#t1").on("click",function(a,b)
        {
            var canvas =document.getElementById("t1");
            var ctx = canvas.getContext('2d', { willReadFrequently: true });
            var c = ctx.getImageData(a.offsetX, a.offsetY, 1, 1).data;
            juego.ultimoColor = c;
            var colorCad = juego.colorHexadecimal(c);

            var idx1 = juego.buscar(juego.colores1, colorCad);
            var idx2 = juego.buscar(juego.colores2, colorCad);
            var idx = idx1>=0 ? idx1 : idx2;
            if(idx>=0)
                juego.toque(idx)
        });
        window.addEventListener('orientationchange',  (a,b)=>{ juego.draw(a.target.innerHeight , a.target.innerWidth);}, false);
        juego.iniciarSecuencia(1);

        // admob-plus-cordova: el objeto admob está disponible tras deviceready
        if (window.admob) {
            juego.InicializaPubli();
        } else {
            document.addEventListener('deviceready', function() {
                juego.InicializaPubli();
            }, false);
        }
    },

    InicializaPubli: async function()
    {
        try {
            await juego.MostrarPubliBanner();
        } catch(e) {
            console.warn("AdMob banner error:", e);
        }
        juego.CargarInterstitial();
    },

    MostrarPubliBanner: async function()
    {
        juego._banner = new admob.BannerAd({
            adUnitId: juego.adModBannerId,
            position: 'top',
        });
        await juego._banner.show();
    },

    CargarInterstitial: async function()
    {
        try {
            juego._interstitial = new admob.InterstitialAd({
                adUnitId: juego.adModInterstitialId,
            });
            await juego._interstitial.load();
        } catch(e) {
            console.warn("AdMob interstitial load error:", e);
        }
    },

    MostrarPubliInterstitial: async function()
    {
        if (juego._interstitial) {
            try {
                await juego._interstitial.show();
            } catch(e) {
                console.warn("AdMob interstitial show error:", e);
            }
        }
        juego.CargarInterstitial();
    },

    buscar: function(lista, valor)
    {
        var idx = 0;
        while(idx<lista.length && lista[idx]!== valor)
        {
            idx++;
        }
        return idx < lista.length ? idx : -1;
    },
    colorHexadecimal:function(color)
    {
        var res = "#";
        for(var i=0;i<color.length && i<3;i++)
        {
            var c = color[i].toString(16)
            while(c.length<2)
                c = '0' + c;
            res += c;
        }
        if(res === "#")
            res = "#000000";
        return res.toUpperCase();
    },
    DivArco: function (ctx, centerX, centerY, radius, color, startAngle, endAngle)
    {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(centerX,centerY);
        ctx.ellipse(centerX, centerY, radius, radius,0, startAngle* Math.PI /180, endAngle* Math.PI /180, false);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    },
    draw: function (color)
    {
        var anchoReal =  $("body").width();
        var altoReal =  $("body").height() - 60;
        $("#t1").width(anchoReal);
        $("#t1").height(altoReal);
        $("#t1").attr({"width":anchoReal , "height": altoReal});

        var canvas =document.getElementById("t1");

        if (canvas.getContext)
        {
            var ctx = canvas.getContext('2d', { willReadFrequently: true });

            var anchoCanvas = canvas.width;
            var altoCanvas = canvas.height;

            var tamaTexto = altoCanvas / 100;
            var cx = anchoCanvas / 2;
            var cy =  altoCanvas / 2;
            var cMinimo = Math.min(cx,cy);
            cMinimoRedu = Math.min(cx,cy) * 0.75;
            var desp  = (cMinimo - cMinimoRedu) * 0.4;
            var r = cMinimoRedu;

            var GradientFondo = ctx.createLinearGradient(0,0,anchoCanvas, altoCanvas);
            GradientFondo.addColorStop(0, "#00ffff");
            GradientFondo.addColorStop(1, "#7700ff");
            ctx.fillStyle = GradientFondo;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            juego.DivArco(ctx, cx + desp, cy + desp, r, juego.SelColor(color , 0), 0, 90);
            juego.DivArco(ctx, cx - desp, cy + desp, r, juego.SelColor(color , 1), 90, 180);
            juego.DivArco(ctx, cx - desp, cy - desp, r, juego.SelColor(color , 2), 180, 270);
            juego.DivArco(ctx, cx + desp, cy - desp, r, juego.SelColor(color , 3), 270, 360);

            ctx.textAlign = "center";

            var nivel = juego.Secuencia.length.toString();
            var indice =  (juego.Indice +1).toString();

            var GradientTexto = ctx.createLinearGradient(0,desp,anchoCanvas, desp*4);
            GradientTexto.addColorStop(0, "#ff0000");
            GradientTexto.addColorStop(1, "#ffff77");

            ctx.fillStyle = GradientTexto;
            ctx.font =  (desp*3.5).toString() + "px Arial";
            ctx.fillText("Angel Dice", cx,desp*3.5);

            ctx.font =  (desp*1.5).toString() + "px Arial";
            ctx.fillText(nivel, cx + desp + r / 2 ,cy + 10);
            ctx.fillText(indice, cx - desp - r / 2, cy + 10);

        }
    },
    SelColor: function(colSecuencia, colPosicion)
    {
        return colSecuencia === -2 || colSecuencia === colPosicion ?
        juego.colores2[colPosicion] :
        juego.colores1[colPosicion]
    },

    reproducirSecuencia: function()
    {
        console.log("ini reproducirSecuencia");
        juego.ReproduciendoSecuencia = true;
        var idx = 0;
        var encendido = false;
        var tid = setInterval(function()
        {
            var c = encendido ? juego.Secuencia[idx] : -1;
            juego.draw(c);
            if(encendido)
            {
                idx++;
                if(c>=0)
                {
                    if( window.plugins && window.plugins.frequency )
                    {
                        var frequency = 440*Math.pow(2, 4+(c-10)/12);
                        console.log("sonido",idx, c,frequency);
                        var sampleRate = 44100;
                        window.plugins.frequency.play(frequency, sampleRate);
                    }
                }
            }
            else
            {
                console.log("stop");
                if( window.plugins && window.plugins.frequency )
                    window.plugins.frequency.stop();
            }
            encendido = !encendido;

            if(idx > juego.Secuencia.length)
            {
                juego.draw( -1);
                clearInterval(tid)
                juego.ReproduciendoSecuencia = false;
                if( window.plugins && window.plugins.frequency )
                    window.plugins.frequency.stop();
            };
        }, 1000);
    },
    iniciarSecuencia: function(N)
    {
        juego.Secuencia = [];
        juego.Indice = -1;
        for(var i=0; i< N;i++)
            juego.Secuencia[i] = juego.Random3();
        juego.reproducirSecuencia();
    },
    toque: function(color) // color 0..3
    {
        console.log("I toque","color",color,"indice", juego.Indice,"secuencia",juego.Secuencia);
        if(juego.ReproduciendoSecuencia === true)
            return;
        juego.Indice++;
        console.log(juego.Indice, juego.Secuencia[juego.Indice] , color, juego.Secuencia[juego.Indice] === color)
        var correcto = juego.Secuencia[juego.Indice] === color;
        console.log("correcto",correcto);
        juego.draw(color);
        if(correcto === true)
        {
            console.log(juego.Indice , juego.Secuencia.length , juego.indice >= juego.Secuencia.length );
            if(juego.Indice+1 >= juego.Secuencia.length )
            {
                console.log("secuenci completa");
                setTimeout(() => {
                    juego.draw(-2);
                    juego.Secuencia[juego.Secuencia.length] = juego.Random3();
                    juego.Indice = -1;
                    juego.reproducirSecuencia();

                }, 1000);
            }
            else{
                setTimeout(() => {
                    juego.draw(-1);
                }, 1000);

            }
        }
        else
        {
            juego.MostrarPubliInterstitial();
            $.confirm({
                title: "Perdiste",
                content: "Perdiste en el nivel "+juego.Secuencia.length,
                buttons:
                {
                    Aceptar: function()
                    {
                        juego.iniciarSecuencia(1);
                    }
                }
            });
        }
        console.log("F toque",juego.Indice, juego.Secuencia);
    },
    Random3: function()
    {
        return Math.round(Math.random()*3);
    }

}
