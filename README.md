# PeixeScan Web

Landing local de una sola pantalla para PeixeScan. La insignia de App Store enlaza a la ficha publicada de la aplicación. Google Play muestra «Próximamente» y no tiene enlace.

La tipografía Plus Jakarta Sans se incluye en `assets/fonts` con su licencia OFL.

La página está disponible en español, inglés y gallego. El selector recuerda el idioma elegido en el navegador.

## Vista previa

Desde esta carpeta, ejecuta `python3 -m http.server 8000` y abre `http://localhost:8000`.

## Animación de entrada

Al entrar, el pez del icono nada en curva desde la esquina superior derecha hasta el centro, dejando burbujas. El encuadre y un destello dan paso al logo y al resto de la página. Si el dispositivo tiene activada la opción de reducir movimiento, se muestra la página directamente.

Las tarjetas del catálogo salen de detrás del logo y orbitan lentamente. Se pueden arrastrar con el ratón o mover con las flechas del teclado; después vuelven suavemente a la órbita.

Las siluetas del fondo son de especies distintas. El arpón se dirige al punto pulsado con el ratón o con la pantalla táctil y solo descubre una tarjeta si alcanza allí a un pez. La acción también está disponible desde el teclado mediante el botón «Descubrir un pez» al navegar con Tab.
