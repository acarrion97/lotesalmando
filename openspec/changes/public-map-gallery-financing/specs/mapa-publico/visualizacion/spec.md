## Purpose

Define la experiencia del visitante en el enlace público `/mapa/:slug`: pestañas de Galería, Mapa y Financiamiento en la misma URL, un carrusel de recursos multimedia con flechas y la ficha de detalle del lote al hacer clic sobre el plano.

## ADDED Requirements

### Requirement: Pestañas del enlace público
El enlace público `/mapa/:slug` SHALL mostrar en la misma URL tres pestañas: **Galería**, **Mapa** y **Financiamiento**. Al abrir el enlace se muestra la pestaña Galería si el proyecto tiene medios; si no tiene, se muestra Mapa. La pestaña activa SHALL quedar reflejada en la URL para que un enlace copiado abra directamente esa pestaña.

#### Scenario: Proyecto con galería
- **WHEN** un visitante abre `/mapa/<slug>` de un proyecto que tiene al menos un medio
- **THEN** se muestra la pestaña Galería con el primer recurso y las pestañas Mapa y Financiamiento están disponibles

#### Scenario: Proyecto sin galería
- **WHEN** el visitante abre `/mapa/<slug>` de un proyecto sin medios
- **THEN** se muestra la pestaña Mapa y la galería no ocupa el primer plano

#### Scenario: Compartir el enlace de una pestaña
- **WHEN** el visitante cambia a la pestaña Mapa y copia la URL del navegador
- **THEN** al abrirla en otra sesión se muestra directamente la pestaña Mapa

### Requirement: Carrusel de medios con flechas
La pestaña Galería SHALL mostrar un recurso multimedia a la vez (imagen o video) acompañado de flechas **anterior**/**siguiente**, un contador con la posición actual y el total, y miniaturas navegables. Las flechas SHALL envolver (de la última al primero y viceversa) y las teclas izquierda/derecha del teclado SHALL navegar igual.

#### Scenario: Navegar con flechas
- **WHEN** el visitante pulsa la flecha "siguiente" con 3 recursos cargados
- **THEN** se muestra el segundo recurso, el contador pasa a 2 de 3 y la miniatura activa cambia

#### Scenario: Envolver en los extremos
- **WHEN** el visitante pulsa "siguiente" estando en el último recurso
- **THEN** se muestra el primer recurso

#### Scenario: Navegar con el teclado
- **WHEN** el visitante presiona la tecla flecha izquierda o derecha mientras la pestaña Galería está activa
- **THEN** se muestra el recurso anterior o siguiente, sin mover el resto de la página

#### Scenario: Recurso de video
- **WHEN** el recurso activo es un video
- **THEN** se muestra un reproductor con controles nativos, se pausa el video anterior y no se inicia reproducción automática al cambiar de recurso

#### Scenario: Galería sin recursos
- **WHEN** el proyecto no tiene medios cargados
- **THEN** la pestaña Galería muestra un estado vacío explicando que todavía no hay fotos ni videos

### Requirement: Ficha del lote al hacer clic en el mapa
En la pestaña Mapa, hacer clic sobre un polígono de lote SHALL abrir su ficha con el número de lote, la manzana, el estado y el precio de lista, más los botones **Anterior**/**Siguiente** para recorrer los lotes, con el mismo patrón de detalle que ya usan las pantallas internas de lotes.

#### Scenario: Abrir la ficha
- **WHEN** el visitante hace clic en un lote del plano
- **THEN** se abre la ficha con sus datos y el estado del lote

#### Scenario: Recorrer lotes desde la ficha
- **WHEN** el visitante pulsa "Siguiente" en la ficha
- **THEN** se muestra el lote siguiente del plano y sus datos se actualizan

#### Scenario: Cerrar la ficha
- **WHEN** el visitante cierra la ficha
- **THEN** vuelve a la pestaña Mapa sin perder la pestaña activa ni el zoom aplicado

### Requirement: El precio no aparece en los tooltips del plano
Los tooltips que aparecen al pasar el cursor sobre un lote del plano SHALL mostrar solo el estado, la manzana y el número; el precio de lista SHALL mostrarse únicamente dentro de la ficha del lote y en la calculadora de financiamiento una vez que el visitante abre o selecciona ese lote.

#### Scenario: Cursor sobre un lote
- **WHEN** el visitante pasa el cursor sobre un polígono del plano
- **THEN** el tooltip muestra estado, manzana y número de lote, sin importe alguno

#### Scenario: Precio al abrir la ficha
- **WHEN** el visitante hace clic en ese mismo lote
- **THEN** la ficha muestra el precio de lista del lote

### Requirement: Estados vacíos y errores del enlace público
El sistema SHALL mostrar resultados claros cuando el enlace no existe, el mapa todavía no tiene plano o la carga falla, sin exponer datos internos del proyecto.

#### Scenario: Slug inexistente
- **WHEN** se abre un enlace con un slug que no corresponde a ningún mapa publicado
- **THEN** se muestra un resultado de "mapa no encontrado"

#### Scenario: Proyecto sin plano
- **WHEN** el mapa está publicado pero el proyecto no tiene imagen de plano
- **THEN** la pestaña Mapa muestra un estado vacío indicando que todavía no hay plano
