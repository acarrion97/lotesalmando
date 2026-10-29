# Capa satélite del mapa Specification

## Purpose

Define la resolución y nitidez de la capa satélite georreferenciada que respalda
el modo Satélite y la capa aérea de la Vista 3D: qué nivel de detalle se pide al
proveedor de tiles según la escala real del plano, qué pasa cuando el proveedor
no alcanza ese nivel, y con qué sobremuestreo mínimo se dibuja.

## Requirements

### Requirement: El nivel de detalle pedido sigue la escala real del plano

La capa satélite SHALL pedir tiles al nivel de zoom cuya resolución en suelo
alcance la necesaria para mostrar la imagen del plano a su escala real,
determinada por el ancho real en metros y el tamaño en píxeles en que se dibuja
el plano, sin imponer un techo de zoom por debajo de esa necesidad.

#### Scenario: Plano pequeño en pantalla

- **WHEN** un plano de 240 m de ancho se dibuja en 600 px de la ventana satélite
- **THEN** se pide un nivel de tiles cuya resolución en suelo cubre esa escala
  (aproximadamente 0,10 m/px o mejor) en lugar de quedarse en el techo actual
  de ~0,60 m/px

#### Scenario: Plano que ocupa más pantalla

- **WHEN** la ventana de la capa crece o el visitante acerca la vista
- **THEN** el nivel de detalle pedido sube en lugar de permanecer fijo

#### Scenario: Cambio de tamaño de ventana

- **WHEN** la ventana cambia de tamaño
- **THEN** se recalcula el nivel pedido y se piden los tiles que corresponda,
  sin dejar la capa a resolución anterior

### Requirement: Tolerancia cuando el proveedor no alcanza esa resolución

Cuando el proveedor de tiles no tenga la resolución pedida para una zona, la
capa SHALL retroceder progresivamente a niveles inferiores hasta encontrar
imágenes, y SHALL seguir cubriendo toda la ventana geográfica sin dejar áreas
en blanco. La disponibilidad SHALL comprobarse con los metadatos de tiles del
proveedor, incluso si una tesela sin datos responde HTTP 200 con una imagen de
aviso.

#### Scenario: Proveedor con menor alcance máximo

- **WHEN** se pide un nivel superior al máximo que el proveedor sirve en esa zona
- **THEN** la capa se dibuja con el nivel más alto disponible y no muestra
  huecos ni baldosas vacías

#### Scenario: Tesela sin datos con respuesta HTTP 200

- **WHEN** el proveedor devuelve una imagen de aviso válida porque no tiene
  datos para la zona en ese nivel
- **THEN** la capa detecta que la tesela no está publicada y usa su ancestro
  con datos, en lugar de mostrar el aviso repetido

#### Scenario: Proveedor con buen alcance

- **WHEN** el proveedor sí sirve el nivel pedido
- **THEN** se usa ese nivel y la imagen se ve más nítida que con el techo actual

### Requirement: Sobremuestreo mínimo sobre el tamaño dibujado

La rejilla de tiles SHALL solicitar resolución para renderizarse con al menos
3× los píxeles que ocupará la capa en pantalla, de modo que el escalado y las
transformaciones de la escena 3D muestreen una fuente más densa que el destino.
El nivel de zoom SHALL estar limitado a 20; cuando ese límite impida alcanzar
3×, la capa SHALL usar el nivel 20 disponible en vez de pedir niveles mayores.

#### Scenario: Rendición plana

- **WHEN** la capa satélite se dibuja en modo plano
- **THEN** la rejilla de tiles se rasteriza a 3× el ancho de la caja destino
  antes de escalarse al tamaño final, hasta el límite de zoom 20

#### Scenario: Rendición bajo la escena 3D inclinada

- **WHEN** la misma capa se muestra bajo la escena 3D inclinada
- **THEN** el muestreo parte de la rejilla sobremuestreada en lugar del tamaño
  final, reduciendo el blanqueo en ángulo oblicuo, hasta el límite de zoom 20
