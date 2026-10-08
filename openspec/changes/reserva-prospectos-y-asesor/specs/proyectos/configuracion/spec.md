## Purpose

La configuración propia de un proyecto (plano del mapa, galería y enlace público) disponible también desde el módulo de Proyectos, además de Configuración.

## ADDED Requirements

### Requirement: Configuración de proyecto desde Proyectos

El módulo de Proyectos SHALL permitir acceder a la configuración del proyecto seleccionado (plano, galería y enlace público) sin pasar por Configuración.

#### Scenario: Abrir configuración de un proyecto

- **WHEN** el usuario abre la configuración de un proyecto desde su fila o detalle
- **THEN** el sistema SHALL mostrar el plano, la galería y el enlace público de ese proyecto sin requerir volver a elegir proyecto

#### Scenario: Proyecto sin plano

- **WHEN** el proyecto aún no tiene plano cargado
- **THEN** el sistema SHALL mostrar el estado vacío con la acción para subir un plano

### Requirement: Misma operación desde Configuración y Proyectos

Configuración SHALL mantener su acceso a la configuración de proyectos con selector global, y ambas rutas SHALL operar sobre los mismos datos.

#### Scenario: Subir un plano desde Proyectos

- **WHEN** el usuario sube un plano desde el módulo de Proyectos
- **THEN** el sistema SHALL guardarlo y reflejarlo también en Configuración y en el mapa público

#### Scenario: Quitar un plano desde Configuración

- **WHEN** el usuario quita el plano de un proyecto desde Configuración
- **THEN** el sistema SHALL dejar el proyecto sin plano y sin enlace público activo

#### Scenario: Cambiar de proyecto en Configuración

- **WHEN** el usuario cambia el proyecto en el selector de Configuración
- **THEN** el sistema SHALL cargar el plano, la galería y el enlace público del proyecto elegido
