## MODIFIED Requirements

### Requirement: Capa base conmutable entre fotográfica y terreno con edificios

El modo SHALL permitir alternar entre una capa base **fotográfica** (malla
fotogramétrica de imágenes reales) y una capa base **terreno + edificios**
(relieve real con volúmenes de edificio), y SHALL usar terreno + edificios como
respaldo automático cuando la capa fotográfica no esté disponible, cuota agotada
o zona fuera de cobertura, sin perder el modo ni la vista de los lotes. La capa
de imágenes satelitales SHALL evitar niveles sin cobertura en la ventana del
proyecto y SHALL usar terreno sin imágenes antes que mosaicos de aviso del
proveedor.

#### Scenario: Capa fotográfica inicial

- **WHEN** el visitante abre el modo Cesium con token disponible
- **THEN** la escena inicia con Google Photorealistic 3D vía Cesium ion como
  capa activa, sin solicitar primero la capa Esri

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
