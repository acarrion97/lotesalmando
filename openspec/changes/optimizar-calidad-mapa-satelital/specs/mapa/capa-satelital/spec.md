# Spec Delta

## Purpose

Establece cómo las vistas geográficas muestran imágenes satelitales con la resolución realmente disponible para su ubicación y con etiquetas de vía y de lugar legibles y superpuestas, preservando nitidez, alineación de los lotes y una interacción fluida en distintas densidades de pantalla.

## ADDED Requirements

### Requirement: Usar el detalle satelital realmente disponible
El sistema SHALL solicitar y representar el nivel de imagen satelital más detallado que esté publicado y disponible para la zona visible, sin aplicar filtros ni interpolaciones que simulen detalle ausente. Si la fuente solo ofrece una tesela de menor resolución, el sistema SHALL conservar una representación geográfica válida y no presentar el escalado como detalle adicional de la fuente.

#### Scenario: Teselas de alta resolución disponibles
- **WHEN** la fuente publica cobertura para la zona visible a niveles de detalle superiores
- **THEN** la vista satelital usa los niveles disponibles que correspondan a la escala visible, sin limitarse a un nivel inferior por una configuración conservadora innecesaria

#### Scenario: Sin cobertura en el nivel pedido
- **WHEN** una tesela de la zona no está disponible en el nivel solicitado
- **THEN** el sistema mantiene la cobertura geográfica mediante su degradación disponible, sin desplazar los límites ni aplicar realce artificial de imagen

#### Scenario: Sin cobertura satelital publicada
- **WHEN** la fuente no publica imagen para la zona
- **THEN** la vista conserva los polígonos y controles utilizables y no muestra una imagen inventada o presentada como satélite de mayor resolución

### Requirement: Mostrar nombres de vía y títulos de lugar
El sistema SHALL superponer sobre la imagen satelital una capa de etiquetas con los nombres de vía y los títulos de lugar publicados por el proveedor para la zona visible, sin sustituir la imagen base, sin desplazar la georreferenciación y con la atribución del proveedor de etiquetas visible. Cuando el proveedor no publique etiquetas para una zona, el sistema SHALL mostrar la imagen sin ellas y no inventar nombres.

#### Scenario: Nombres de vía sobre imagen satelital
- **WHEN** la zona visible tiene vías nombradas publicadas por el proveedor y la capa de etiquetas está activada
- **THEN** los nombres de calle se muestran sobre la imagen, legibles y alineados con sus vías

#### Scenario: Títulos de lugar en escalas medias
- **WHEN** la vista muestra una escala a la que el proveedor publica títulos de lugar
- **THEN** esos títulos aparecen sobre la imagen sin tapar los polígonos ni los controles

#### Scenario: Zona sin etiquetas publicadas
- **WHEN** la fuente no publica vías ni títulos para la zona visible, como el interior de un desarrollo nuevo
- **THEN** la vista conserva la imagen y los polígonos y no muestra nombres inventados

#### Scenario: Capa de etiquetas desactivada
- **WHEN** el usuario desactiva la capa de etiquetas
- **THEN** la imagen satelital y la interacción de los lotes permanecen intactas y no se solicitan teselas de etiquetas

#### Scenario: La interacción no queda bloqueada
- **WHEN** el usuario hace clic o arrastra sobre una zona con etiquetas visibles
- **THEN** los eventos llegan al visor y a los polígonos como lo harían sin la capa de etiquetas

### Requirement: Adaptar el renderizado a la pantalla sin distorsión
El sistema SHALL adaptar el tamaño y nivel de detalle de las teselas al tamaño medido del contenedor y a la densidad de píxeles del dispositivo, evitando escalados innecesarios que reduzcan la nitidez, sin modificar la extensión geográfica ni la relación espacial de los polígonos.

#### Scenario: Cambio de tamaño del visor
- **WHEN** el contenedor cambia de tamaño en un viewport compatible
- **THEN** la capa recalcula su cobertura visual y conserva la alineación con el plano y los lotes

#### Scenario: Diferentes densidades de pantalla
- **WHEN** la vista se renderiza con `devicePixelRatio` 1, 1.5, 2 o 3
- **THEN** los controles y overlays permanecen nítidos y la imagen se representa con la resolución de fuente adecuada, sin deformar la georreferenciación

#### Scenario: Navegación entre escalas
- **WHEN** el usuario acerca o aleja la vista
- **THEN** la transición entre niveles mantiene la posición relativa de la imagen y polígonos y no amplía innecesariamente una tesela de baja resolución

### Requirement: Preservar precisión y herramientas de lotes
La optimización de imagen SHALL preservar las coordenadas, geometrías, estilos y alineación de los polígonos existentes, así como la detección automática, dibujo, edición, selección y navegación de lotes.

#### Scenario: Visualización de lotes sobre satélite
- **WHEN** el mapa muestra polígonos sobre la capa satelital
- **THEN** sus bordes y rellenos permanecen legibles y geográficamente alineados durante zoom, desplazamiento y cambio de tamaño

#### Scenario: Operación de herramientas existentes
- **WHEN** el usuario detecta, dibuja, edita o selecciona lotes
- **THEN** esas operaciones conservan su comportamiento y geometría antes y después de la optimización

#### Scenario: Proyecto de referencia con 230 lotes
- **WHEN** se abre el proyecto de referencia Ciudadela San Lucas con sus 230 lotes
- **THEN** los lotes visibles se mantienen correctamente posicionados e interactivos en los modos de mapa geográfico existentes

### Requirement: Mantener fluidez y solicitudes acotadas
El sistema SHALL mantener la interacción fluida del visor y limitar las solicitudes de imagen a las teselas necesarias para la zona y escala visibles, evitando descargas duplicadas o crecimiento injustificado de memoria al optimizar la resolución.

#### Scenario: Desplazamiento y zoom con muchos lotes
- **WHEN** el usuario navega por un mapa con 230 lotes
- **THEN** el desplazamiento, zoom y selección de polígonos siguen respondiendo sin bloqueos perceptibles atribuibles a la capa satelital

#### Scenario: Rejilla de tiles del viewport
- **WHEN** se solicita imagen para un viewport y nivel de detalle determinados
- **THEN** las solicitudes se limitan a las teselas que cubren la zona visible y no se repiten innecesariamente para la misma tesela

#### Scenario: Solicitudes de la capa de etiquetas
- **WHEN** la capa de etiquetas está activada para una zona y escala visibles
- **THEN** sus solicitudes se limitan a las teselas visibles, se reutilizan al cambiar el tamaño del visor y no duplican las de imagen

### Requirement: Validar cambios visuales de forma comparable
El sistema SHALL permitir verificar la nitidez, alineación y rendimiento comparando el comportamiento previo y posterior bajo condiciones equivalentes, y los resultados SHALL distinguir la calidad de origen del proveedor de cualquier efecto del renderizado local.

#### Scenario: Comparación equivalente de capturas
- **WHEN** se capturan vistas antes y después con el mismo centro, zoom, tamaño de visor y densidad de píxeles
- **THEN** la comparación identifica cambios atribuibles al renderizado y no atribuye al código detalle que no existe en la imagen de origen

#### Scenario: Cobertura y densidad representativas
- **WHEN** se valida en 1366 × 768 y 1920 × 1080 con `devicePixelRatio` 1, 1.5, 2 y 3, zoom cercano y lejano y cada modo geográfico existente
- **THEN** se registran los tamaños, cobertura efectiva, alineación, solicitudes y limitaciones observadas, sin asumir que todos los niveles tienen cobertura para toda ubicación
