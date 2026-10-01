## Purpose

Consultar las ventas filtrándolas por fechas —por mes o por un rango libre— y que los indicadores del módulo reflejen siempre el período seleccionado.

## ADDED Requirements

### Requirement: Filtro de fechas con presets y rango libre

Ventas SHALL ofrecer un filtro por fecha con presets (mes actual, mes pasado, últimos 30 días y este año) y la selección de un rango libre de fechas, aplicándose de forma combinada con la búsqueda de texto y los filtros de estado ya existentes.

#### Scenario: Preset de mes actual

- **WHEN** el usuario selecciona el preset "Mes actual"
- **THEN** solo se muestran las ventas creadas dentro del mes en curso

#### Scenario: Preset de mes pasado

- **WHEN** el usuario selecciona el preset "Mes pasado"
- **THEN** solo se muestran las ventas creadas dentro del mes anterior completo

#### Scenario: Rango libre

- **WHEN** el usuario selecciona un rango del 01/09/2026 al 15/09/2026
- **THEN** solo se muestran las ventas creadas entre ambas fechas, incluyendo los extremos

#### Scenario: Combinación con otros filtros

- **WHEN** hay un filtro de fecha activo junto con una búsqueda de texto o un filtro de estado
- **THEN** la lista muestra las ventas que cumplen todas las condiciones a la vez

#### Scenario: Zona horaria

- **WHEN** se determina el día y el mes al que pertenece una venta
- **THEN** se usa la zona horaria de la empresa, no UTC, de modo que una venta registrada el último día del mes a hora local se contabiliza en ese mes

### Requirement: Los indicadores reflejan el período filtrado

Los indicadores del módulo (total de ventas, completadas, pendientes y valor total) SHALL calcularse sobre las ventas que cumplen el filtro de fecha activo y, en ausencia de filtro, sobre todas las ventas.

#### Scenario: Indicadores con filtro activo

- **WHEN** hay un rango de fechas seleccionado
- **THEN** total, completadas, pendientes y valor total se recalculan solo con las ventas de ese rango

#### Scenario: Indicadores sin filtro

- **WHEN** no hay filtro de fecha
- **THEN** los indicadores consideran todas las ventas, como hasta ahora

### Requirement: El filtro funciona sin conexión

El filtrado SHALL resolverse sobre los datos disponibles localmente para que el módulo sea utilizable sin conexión con el mismo resultado que en línea.

#### Scenario: Uso sin conexión

- **WHEN** la aplicación está sin conexión y el usuario cambia el filtro de fecha
- **THEN** el filtro se aplica sobre las ventas en caché y la lista y los indicadores se actualizan normalmente
