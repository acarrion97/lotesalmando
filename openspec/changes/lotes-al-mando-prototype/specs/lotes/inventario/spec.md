## Purpose

Gestión del inventario de lotes con estados visibles, mapa interactivo SVG y control de disponibilidad.

## ADDED Requirements

### Requirement: Lot states

Los lotes SHALL tener estados: disponible, reservado, en negociación, vendido, bloqueado, nodisponible.

#### Scenario: Estado por defecto

- WHEN se crea un lote nuevo
- THEN su estado SHALL ser "disponible"

#### Scenario: Transición de estado válida

- WHEN se cambia el estado de un lote a uno válido
- THEN el sistema SHALL actualizar el estado y registrar el cambio

### Requirement: Lot CRUD

El sistema SHALL permitir crear, editar y eliminar lotes.

#### Scenario: Crear lote

- WHEN el usuario crea un lote con manzana, número, metraje y precio
- THEN el sistema SHALL persistir el lote con estado "disponible"

#### Scenario: Editar lote

- WHEN el usuario edita datos de un lote
- THEN el sistema SHALL actualizar los campos modificados

#### Scenario: Eliminar lote

- WHEN el usuario elimina un lote sin transacciones asociadas
- THEN el sistema SHALL eliminar el lote

### Requirement: Visual map

El sistema SHALL renderizar mapa SVG con lotes coloreados por estado.

#### Scenario: Renderizado de mapa

- WHEN el usuario navega a una manzana
- THEN el sistema SHALL mostrar mapa SVG con lotes coloreados según estado

#### Scenario: Hover en lote

- WHEN el usuario pasa el cursor sobre un lote en el mapa
- THEN el sistema SHALL mostrar tooltip con información básica del lote

### Requirement: State legend

Cada estado SHALL tener color + texto + icono para accesibilidad.

#### Scenario: Leyenda visible

- WHEN se muestra el mapa de lotes
- THEN el sistema SHALL mostrar leyenda con todos los estados, colores, textos e iconos

### Requirement: Lot details

El usuario SHALL poder ver detalles de cada lote (precio, metraje, estado).

#### Scenario: Vista de detalles

- WHEN el usuario selecciona un lote
- THEN el sistema SHALL mostrar panel con precio, metraje, estado y datos relevantes

### Requirement: Availability filter

El sistema SHALL filtrar lotes por estado y manzana.

#### Scenario: Filtro por estado

- WHEN el usuario selecciona filtro de estado
- THEN el sistema SHALL mostrar únicamente lotes con dicho estado

#### Scenario: Filtro por manzana

- WHEN el usuario selecciona filtro de manzana
- THEN el sistema SHALL mostrar únicamente lotes de dicha manzana

### Requirement: Price management

Los lotes SHALL tener precio de lista y precio de venta.

#### Scenario: Precio de lista

- WHEN se crea o edita un lote
- THEN el sistema SHALL almacenar precio de lista

#### Scenario: Precio de venta

- WHEN se registra una venta
- THEN el sistema SHALL registrar precio de venta (puede diferir de lista)
