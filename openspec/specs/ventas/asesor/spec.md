# ventas/asesor Specification

## Purpose

Identificar qué asesor vendió cada lote en el módulo de Ventas, en listado, filtro y detalle.

## Requirements

### Requirement: Asesor en el listado de ventas

El listado de ventas SHALL mostrar una columna "Asesor" con el nombre del asesor que participó en la venta.

#### Scenario: Venta con asesor

- **WHEN** la venta proviene de una cotización con asesor
- **THEN** el sistema SHALL mostrar el nombre del asesor en la columna

#### Scenario: Venta sin asesor

- **WHEN** la venta no tiene asesor registrado
- **THEN** el sistema SHALL mostrar el marcador "Sin asesor" en lugar de una celda vacía

#### Scenario: Asesor eliminado

- **WHEN** el asesor de la venta ya no existe
- **THEN** el sistema SHALL mostrar un identificador de respaldo sin romper el listado

### Requirement: Filtro por asesor

El listado de ventas SHALL permitir filtrar por asesor.

#### Scenario: Filtrar por asesor

- **WHEN** el usuario selecciona un asesor en el filtro
- **THEN** el sistema SHALL mostrar únicamente las ventas de ese asesor

#### Scenario: Filtrar ventas sin asesor

- **WHEN** el usuario selecciona el filtro "Sin asesor"
- **THEN** el sistema SHALL mostrar solo las ventas sin asesor registrado

### Requirement: Asesor en el detalle de venta

El detalle de una venta SHALL mostrar el asesor junto a los demás datos, diferenciándolo del usuario que registró la venta.

#### Scenario: Ver detalle de una venta

- **WHEN** el usuario abre el detalle de una venta
- **THEN** el sistema SHALL mostrar el asesor y, por separado, el usuario que la registró

#### Scenario: Venta sin asesor en el detalle

- **WHEN** la venta no tiene asesor
- **THEN** el sistema SHALL mostrar el marcador "Sin asesor" en el detalle
