## Purpose

Resolver automáticamente IDs de llaves foráneas a nombres legibles en tablas y modales del sistema, mejorando la experiencia de usuario al mostrar información comprensible.

## ADDED Requirements

### Requirement: Resolución de IDs a nombres en tablas
El sistema SHALL mostrar el nombre o label correspondiente en vez del ID numérico para todas las columnas de llaves foráneas.

#### Scenario: Tabla muestra nombre de empresa
- **WHEN** la tabla de proyectos muestra la columna "Empresa"
- **THEN** se muestra el nombre de la empresa en vez del ID numérico

#### Scenario: Tabla muestra nombre de lote
- **WHEN** la tabla de inventario muestra la columna "Lote"
- **THEN** se muestra el número o código del lote en vez del ID numérico

#### Scenario: Tabla muestra nombre de usuario
- **WHEN** la tabla de inventario muestra la columna "Usuario"
- **THEN** se muestra el nombre del usuario en vez del ID numérico

### Requirement: Fallback para IDs no encontrados
El sistema SHALL mostrar un fallback descriptivo cuando el ID no se encuentre en los datos cargados.

#### Scenario: ID no encontrado en memoria
- **WHEN** un ID de FK no existe en los datos cargados
- **THEN** se muestra el ID con un prefijo descriptivo (ej: "Lote #123", "Usuario #45")

### Requirement: Resolución en modales de vista
El sistema SHALL mostrar nombres legibles en los modales de detalle (vista).

#### Scenario: Modal muestra nombre de entidad relacionada
- **WHEN** el usuario abre el modal de vista de un registro
- **THEN** los campos de FK muestran el nombre en vez del ID

### Requirement: Hook genérico reutilizable
El sistema SHALL proveer un hook `useLookup` que pueda reutilizarse en cualquier componente.

#### Scenario: Uso del hook genérico
- **WHEN** un componente necesita resolver IDs a nombres
- **THEN** usa el hook `useLookup` con los parámetros apropiados
