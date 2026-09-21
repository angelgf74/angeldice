# Lista de mejoras — Angel Dice

> Estado: `[ ]` pendiente · `[x]` implementado · `[-]` descartado

---

## Jugabilidad

- [ ] **Dificultad progresiva** — reducir `tIntervalo` y/o `pasosEncendido` cada N niveles para que la secuencia se reproduzca más rápido conforme avanza la partida. Actualmente son constantes (100 ms y 8 pasos).
- [ ] **Modos de dificultad** — permitir elegir al inicio entre Fácil / Normal / Difícil, con distintos valores de velocidad inicial y pendiente de aceleración.
- [ ] **Top 5 locales** — guardar en `localStorage` los 5 mejores récords (nivel + fecha) en lugar de un único récord. Mostrarlo en una pantalla de estadísticas.
- [ ] **Feedback háptico** — llamar a `navigator.vibrate()` al acertar (pulso corto) y al fallar (pulso largo) en dispositivos móviles que soporten la Vibration API.
- [ ] **Pausa explícita** — añadir un botón/gesto de pausa visible que permita interrumpir la partida además del cierre automático por `visibilitychange`.

---

## Accesibilidad

- [ ] **Modo daltónico** — superponer un símbolo o número distinto en cada cuadrante además del color, para jugadores con daltonismo. Activable desde ajustes.
- [ ] **Soporte teclado/gamepad** — mapear las cuatro teclas de cursor o los botones ABXY de un gamepad a los cuatro cuadrantes, usando la Gamepad API.

---

## Experiencia de usuario

- [x] **Pantalla de inicio** — splash breve con el logo antes de mostrar el diálogo de "¡Atento!" para dar tiempo a que el audio se inicialice.
- [x] **Animación de acierto completo** — efecto visual más llamativo cuando se completa la secuencia (actualmente solo se encienden los cuatro cuadrantes), por ejemplo una onda de luz o partículas sobre el canvas.
- [x] **Prompt de instalación PWA** — capturar el evento `beforeinstallprompt` y ofrecer un botón "Instalar app" en la barra inferior cuando esté disponible.
- [x] **Compartir récord** — botón que use la Web Share API (`navigator.share`) para compartir el récord alcanzado cuando la partida termina.
- [x] **Indicador de audio más claro** — mostrar texto breve ("Sonido ON/OFF") junto al icono de campana, al menos durante 2 s tras pulsarlo, para que el cambio de estado sea inequívoco.

---

## Técnico / Infraestructura

- [x] **Versión de caché automática en deploy** — añadir en `deploy.sh` un paso que actualice la constante `CACHE` en `sw.js` con la fecha/hora del despliegue, eliminando el paso manual propenso a errores.
- [x] **HTTPS en servidor** — ya resuelto en el servidor.
- [x] **Meta `og:` y Twitter Card** — añadir etiquetas Open Graph en `index.html` para que al compartir el enlace se muestre una vista previa correcta.
- [x] **Favicon SVG** — añadir un `favicon.svg` escalable para navegadores modernos, en lugar de depender solo de los PNG de 192 px.
