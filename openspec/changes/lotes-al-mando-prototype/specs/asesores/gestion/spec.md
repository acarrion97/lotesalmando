## Purpose

Gestión de asesores comerciales como entidad independiente de usuarios, con código, metas y rendimiento.

## ADDED Requirements

### Requirement: Asesor entity

Los asesores SHALL ser entidad separada de usuarios con usuario_id FK.

#### Scenario: Crear asesor sin usuario

- WHEN se crea un asesor sin usuario_id
- THEN el sistema SHALL persistir el asesor como entidad independiente

#### Scenario: Vincular asesor a usuario

- WHEN se asigna usuario_id a un asesor
- THEN el sistema SHALL vincular ambas entidades manteniendo independencia

### Requirement: Asesor CRUD

El sistema SHALL permitir crear, editar y listar asesores.

#### Scenario: Crear asesor

- WHEN el usuario crea un asesor con código, nombre comercial y meta
- THEN el sistema SHALL persistir el asesor con estado activo

#### Scenario: Editar asesor

- WHEN el usuario edita datos de un asesor
- THEN el sistema SHALL actualizar los campos modificados

#### Scenario: Listar asesores

- WHEN el usuario solicita el listado de asesores
- THEN el sistema SHALL retornar los asesores de la empresa activa

### Requirement: Asesor code

Cada asesor SHALL tener código único dentro de la empresa.

#### Scenario: Código único

- WHEN se crea un asesor con código ya existente en la empresa
- THEN el sistema SHALL rechazar la operación con error de duplicidad

### Requirement: Commercial name

Los asesores SHALL tener nombre comercial para display.

#### Scenario: Nombre comercial visible

- WHEN se muestra un asesor en cualquier vista
- THEN el sistema SHALL usar el nombre comercial como etiqueta principal

### Requirement: Sales target

Los asesores SHALL tener meta de ventas mensual.

#### Scenario: Asignación de meta

- WHEN se crea o edita un asesor
- THEN el sistema SHALL registrar meta de ventas mensual en unidades monetarias

### Requirement: Asesor status

Los asesores SHALL tener estado activo o inactivo.

#### Scenario: Desactivar asesor

- WHEN se desactiva un asesor
- THEN el sistema SHALL marcar estado como inactivo y ocultar del flujo activo

#### Scenario: Reactivar asesor

- WHEN se reactiva un asesor
- THEN el sistema SHALL marcar estado como activo

### Requirement: Performance tracking

El sistema SHALL calcular ventas realizadas vs meta del asesor.

#### Scenario: Cálculo de rendimiento

- WHEN el usuario consulta rendimiento de un asesor
- THEN el sistema SHALL calcular: ventas realizadas, meta, porcentaje de cumplimiento
