## Purpose

Administración de proyectos inmobiliarios, etapas y manzanas como estructura base del inventario.

## ADDED Requirements

### Requirement: Project CRUD

El sistema SHALL permitir crear, editar, listar y eliminar proyectos.

#### Scenario: Crear proyecto

- WHEN el usuario crea un proyecto con nombre, ubicación y datos básicos
- THEN el sistema SHALL persistir el proyecto con estado activo

#### Scenario: Editar proyecto

- WHEN el usuario edita datos de un proyecto
- THEN el sistema SHALL actualizar los campos modificados

#### Scenario: Listar proyectos

- WHEN el usuario solicita el listado de proyectos
- THEN el sistema SHALL retornar los proyectos de la empresa activa

#### Scenario: Eliminar proyecto

- WHEN el usuario elimina un proyecto sin lotes asociados
- THEN el sistema SHALL eliminar el proyecto

#### Scenario: Eliminar proyecto con lotes

- WHEN el usuario intenta eliminar un proyecto con lotes asociados
- THEN el sistema SHALL rechazar la operación con advertencia

### Requirement: Stage management

Cada proyecto SHALL tener etapas ordenadas.

#### Scenario: Crear etapa

- WHEN el usuario agrega una etapa a un proyecto
- THEN el sistema SHALL asignar orden secuencial y persistir la etapa

#### Scenario: Reordenar etapas

- WHEN el usuario cambia el orden de las etapas
- THEN el sistema SHALL actualizar el campo de orden de todas las etapas afectadas

### Requirement: Block management

Cada etapa SHALL tener manzanas con código/nombre único.

#### Scenario: Crear manzana

- WHEN el usuario agrega una manzana a una etapa con código único
- THEN el sistema SHALL persistir la manzana

#### Scenario: Código duplicado en etapa

- WHEN se intenta crear una manzana con código duplicado en la misma etapa
- THEN el sistema SHALL rechazar la operación con error de duplicidad

### Requirement: Project status

Los proyectos SHALL tener estado activo o inactivo.

#### Scenario: Desactivar proyecto

- WHEN el usuario desactiva un proyecto
- THEN el sistema SHALL marcar estado como inactivo y ocultar lotes del flujo normal

#### Scenario: Reactivar proyecto

- WHEN el usuario reactiva un proyecto
- THEN el sistema SHALL marcar estado como activo y restaurar visibilidad

### Requirement: Hierarchical navigation

El usuario SHALL poder navegar la estructura proyecto → etapa → manzana.

#### Scenario: Navegación por proyecto

- WHEN el usuario selecciona un proyecto
- THEN el sistema SHALL mostrar sus etapas

#### Scenario: Navegación por etapa

- WHEN el usuario selecciona una etapa
- THEN el sistema SHALL mostrar sus manzanas

#### Scenario: Navegación por manzana

- WHEN el usuario selecciona una manzana
- THEN el sistema SHALL mostrar sus lotes
