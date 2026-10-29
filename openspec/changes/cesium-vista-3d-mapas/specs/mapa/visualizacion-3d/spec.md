## Purpose

Define la experiencia del modo de vista 3D geográfico ("Vista 3D real") sobre el
terreno real en los dos mapas del producto: el mapa interno `/mapas` y el enlace
público `/mapa/:slug`. Cubre la disponibilidad del modo, el dibujo de los lotes
apoyados sobre el terreno, la navegación, la iluminación, la actualización de
datos en vivo, la atribución obligatoria y la degradación cuando faltan
requisitos técnicos o de configuración.

## ADDED Requirements

### Requirement: El modo "Vista 3D real" está disponible en ambos mapas

El selector de modos de mapa SHALL ofrecer, junto a **Plano**, **Satélite** y
**Vista 3D**, un cuarto modo **Vista 3D real** tanto en el mapa interno como en
el enlace público, mostrando exactamente las mismas opciones en las dos pantallas.

#### Scenario: Mapa interno

- **WHEN** un usuario abre `/mapas`, elige un proyecto con plano y ubicación GPS
  y observa el selector de modos
- **THEN** el selector muestra **Plano**, **Satélite**, **Vista 3D** y
  **Vista 3D real**

#### Scenario: Mapa público

- **WHEN** un visitante abre `/mapa/<slug>` de un mapa publicado que tiene
  ubicación GPS
- **THEN** el selector de la pestaña Mapa muestra las mismas cuatro opciones

#### Scenario: Proyecto sin ubicación GPS

- **WHEN** el proyecto no tiene coordenadas GPS registradas
- **THEN** **Vista 3D real** aparece deshabilitado con una explicación de cómo
  cargarla, y los otros tres modos siguen funcionando

### Requirement: El mapa público no inicia la escena 3D automáticamente

El enlace público SHALL cargar el motor 3D y solicitar tiles SOLO cuando el
visitante elige activamente **Vista 3D real**; abrir el enlace, cambiar de
pestaña o recargar la página SHALL no generar ninguna petición de tiles.

#### Scenario: Abrir el enlace público

- **WHEN** un visitante abre `/mapa/<slug>` con la pestaña Mapa activa
- **THEN** no se carga el motor 3D ni se solicita ningún tile, y el resto de la
  página se comporta como hasta ahora

#### Scenario: El visitante elige el modo

- **WHEN** el visitante pulsa **Vista 3D real**
- **THEN** el motor 3D se carga en ese momento y la escena empieza a recibir tiles

#### Scenario: Cambiar de pestaña y volver

- **WHEN** el visitante cambia a otra pestaña y regresa a Mapa
- **THEN** la escena 3D no se vuelve a montar automáticamente si no estaba
  seleccionada

### Requirement: Los lotes se dibujan como polígonos apoyados sobre el terreno

Al entrar en **Vista 3D real**, el sistema SHALL proyectar a coordenadas
geográficas el contorno de cada lote ubicado en el plano y dibujarlo sobre el
terreno real, con el color de su estado comercial, de modo que el polígono
abrace la superficie sin hundirse ni flotar.

#### Scenario: Proyecto con lotes ubicados

- **WHEN** el visitante entra en **Vista 3D real** en un proyecto con 40 lotes
  con contorno trazado
- **THEN** los 40 polígonos aparecen sobre el terreno en su posición real,
  coloreados según su estado

#### Scenario: Lote sin contorno

- **WHEN** un lote no tiene polígono trazado en el plano
- **THEN** no se dibuja ningún polígono para ese lote y no se muestra un
  marcador de relleno

#### Scenario: Polígono sobre terreno con relieve

- **WHEN** el terreno de la zona tiene elevación
- **THEN** cada polígono sigue la superficie del terreno en todo su perímetro

### Requirement: Hacer clic en un lote abre su ficha

Hacer clic sobre el polígono de un lote en **Vista 3D real** SHALL abrir la
misma ficha de lote que los demás modos, con los mismos datos y con los botones
**Anterior**/**Siguiente** operativos.

#### Scenario: Abrir la ficha

- **WHEN** el visitante hace clic en el polígono de un lote
- **THEN** se abre la ficha de ese lote con número, manzana, estado y datos
  aplicables a la pantalla donde está

#### Scenario: Recorrer lotes desde la ficha

- **WHEN** el visitante pulsa **Siguiente** en la ficha abierta desde la vista 3D
- **THEN** se muestra el lote siguiente y la cámara se desplaza a su ubicación

### Requirement: La cámara vuela sobre todos los lotes al entrar

Al cargar la escena con datos, el sistema SHALL situar la cámara cubriendo la
extensión de todos los lotes con una inclinación de −35°.

#### Scenario: Vuelo de entrada

- **WHEN** la escena termina de cargar y hay lotes con coordenadas
- **THEN** la cámara vuela hasta encuadrar todos los lotes con inclinación −35°

#### Scenario: Seleccionar un lote desde la lista o un marcador

- **WHEN** el visitante selecciona un lote o marcador concreto
- **THEN** la cámara vuela hasta esa ubicación y queda visible el panel con sus
  datos

### Requirement: Capa base conmutable entre fotográfica y terreno con edificios

El modo SHALL permitir alternar entre una capa base **fotográfica** (malla
fotogramétrica de imágenes reales) y una capa base **terreno + edificios**
(relieve real con volúmenes de edificio), y SHALL usar terreno + edificios como
respaldo automático cuando la capa fotográfica no esté disponible, cuota agotada
o zona fuera de cobertura, sin perder el modo ni la vista de los lotes. La capa
de imágenes satelitales SHALL evitar niveles sin cobertura en la ventana del
proyecto y SHALL usar terreno sin imágenes antes que mosaicos de aviso del
proveedor.

#### Scenario: Capa fotográfica disponible

- **WHEN** el visitante selecciona la capa fotográfica y hay cuota y cobertura
- **THEN** la escena muestra la malla de imágenes reales

#### Scenario: Zona fuera de cobertura fotográfica

- **WHEN** la ubicación del proyecto cae fuera de la cobertura fotográfica
- **THEN** la escena se muestra igualmente con terreno + edificios y el sistema
  indica el motivo del respaldo

#### Scenario: Cuota agotada

- **WHEN** se agota la cuota mensual de la capa fotográfica
- **THEN** el modo sigue operativo con terreno + edificios y los lotes siguen
  visibles y clicables

#### Scenario: Teselas satelitales no disponibles al acercar

- **WHEN** la fuente satelital no tiene imágenes para el nivel de zoom de la
  ubicación del proyecto
- **THEN** la vista conserva el nivel más alto con cobertura, sin mostrar
  avisos de falta de datos repetidos sobre el mapa

### Requirement: Iluminación, sombras, atmósfera y hora del día

El modo SHALL ofrecer iluminación solar sobre la escena, sombras, atmósfera y
un control de hora del día que mueva la posición del sol, siendo efectivo en el
sombreado de terreno y edificios en la capa base terreno + edificios.

#### Scenario: Mover el control de hora

- **WHEN** el visitante mueve el control de hora del día con la capa base
  terreno + edificios activa
- **THEN** cambia la posición del sol, el cielo y el sombreado de terreno y
  edificios

#### Scenario: Hora del día sobre la capa fotográfica

- **WHEN** el visitante mueve el control de hora con la capa fotográfica activa
- **THEN** cambian el cielo y la atmósfera, y se indica que la malla
  fotogramétrica conserva su iluminación original

### Requirement: Controles de calidad ajustables

El modo SHALL exponer controles de calidad — HDR, antialiasing, escala de
resolución y error de pantalla máximo — y SHALL reflejar su valor en la escena
de forma observable.

#### Scenario: Bajar la escala de resolución

- **WHEN** el visitante baja la escala de resolución
- **THEN** la escena se renderiza a menor resolución interna y el rendimiento
  mejora

#### Scenario: Subir la nitidez

- **WHEN** el visitante disminuye el error de pantalla máximo
- **THEN** la escena pide tiles de mayor detalle y se ve más nítida, consumiendo
  más ancho de banda

### Requirement: Los datos se actualizan sin recrear la escena

El sistema SHALL poder refrescar los puntos y polígonos por intervalo
configurable o por canal en vivo, actualizando las entidades existentes por su
identificador SIN recrear el visor, conservando cámara, controles y estado.

#### Scenario: Refresco con cambios

- **WHEN** llega un refresco que modifica el estado de tres lotes
- **THEN** los tres polígonos cambian de color y el visor no se destruye ni se
  recrea, y la posición de la cámara no se altera

#### Scenario: Alta y baja de entidades

- **WHEN** el refresco trae un lote nuevo y otro que ya no existe
- **THEN** se añade el primero y se elimina el segundo, sin parpadeo general
  ni reinicio de la escena

#### Scenario: Refresco sin conexión

- **WHEN** el dispositivo está sin conexión
- **THEN** no se programa ningún refresco y la escena se queda en el último
  estado conocido con el aviso de frescura correspondiente

### Requirement: La atribución de los proveedores de datos es siempre visible

El sistema SHALL mantener visibles los créditos de atribución de los proveedores
de imágenes y datos de la escena (incluida la marca de Google cuando corresponda)
en todas las vistas del modo, y la interfaz SHALL no permitir ocultarlos.

#### Scenario: Navegación normal

- **WHEN** el visitante navega, hace zoom o cambia de capa base
- **THEN** los créditos permanecen visibles en pantalla

#### Scenario: Cambio a capa terreno + edificios

- **WHEN** el visitante cambia a la capa base terreno + edificios
- **THEN** se siguen mostrando los créditos de los proveedores de esa capa

### Requirement: El modo degrada cuando faltan requisitos

Si falta el token de configuración, el navegador no soporta el WebGL
necesario, o no hay conexión, el sistema SHALL ocultar o deshabilitar el modo
**Vista 3D real** con un mensaje claro, SHALL mantener operativos los demás
modos del mapa, y SHALL preservar el arranque offline de la aplicación.

#### Scenario: Sin token configurado

- **WHEN** la aplicación no tiene configurado el token de datos 3D
- **THEN** **Vista 3D real** no está disponible con una nota de configuración y
  los otros modos funcionan con normalidad

#### Scenario: Navegador sin soporte gráfico necesario

- **WHEN** el navegador no ofrece WebGL2 ni las extensiones requeridas
- **THEN** el modo se muestra deshabilitado indicando el motivo y no se produce
  pantalla en blanco

#### Scenario: Sin conexión

- **WHEN** el dispositivo pierde la conexión
- **THEN** el modo muestra un aviso de indisponibilidad offline y el resto de
  la aplicación sigue funcionando desde la caché

#### Scenario: Arranque offline de la aplicación

- **WHEN** un usuario recarga la aplicación sin conexión
- **THEN** la aplicación arranca desde el precache con normalidad, sin que el
  peso del motor 3D lo haya impedido

### Requirement: El motor 3D no ensucia el paquete de la aplicación

Los archivos del motor 3D SHALL quedar fuera del bundle inicial y fuera del
precache del service worker, cargándose de forma diferida solo cuando se
selecciona el modo.

#### Scenario: Arranque de la aplicación

- **WHEN** se abre la aplicación en el modo Plano o Satélite
- **THEN** no se descarga el código del motor 3D

#### Scenario: Instalación del service worker

- **WHEN** se instala la aplicación como PWA
- **THEN** el precache se genera dentro de su límite de tamaño y el arranque
  sin conexión sigue garantizado

### Requirement: Los datos del mapa siguen disponibles tras una recarga offline

Los datos leídos correctamente de un mapa público o interno SHALL conservarse
en IndexedDB durante un máximo de una hora, de forma separada del caché general
de inventario. Si la actualización falla sin conexión, SHALL mostrarse la
última lectura correcta y SHALL seguir disponible el selector de modos no-3D.
Los datos internos SHALL estar aislados por empresa y proyecto; el contexto
offline de autenticación SHALL limitarse a identidad, empresa y permiso
`ver_mapas`, sin guardar credenciales ni permisos de otros módulos. El cierre
de sesión o el cambio de empresa SHALL purgar estos datos.

#### Scenario: Mapa público recargado sin conexión

- **WHEN** un visitante ya abrió un mapa público y recarga la ruta sin conexión
  dentro de la hora siguiente
- **THEN** se muestra el último mapa sincronizado, sin reemplazarlo por el error
  de carga, y Plano/Satélite/Vista 3D siguen disponibles

#### Scenario: Mapa interno recargado sin conexión

- **WHEN** una sesión autorizada ya abrió el mapa interno y recarga `/mapas`
  sin conexión dentro de la hora siguiente
- **THEN** se muestra el último mapa de la misma empresa en modo de solo lectura,
  con el permiso `ver_mapas` y sin conceder permisos de otros módulos

#### Scenario: Caducidad y limpieza de datos internos

- **WHEN** los datos del mapa superan una hora, el usuario cierra sesión o cambia
  de empresa
- **THEN** los datos internos ya no se muestran; después de cerrar sesión o
  cambiar de empresa no queda su caché disponible en el dispositivo
