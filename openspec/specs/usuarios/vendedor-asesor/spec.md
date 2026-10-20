# usuarios/vendedor-asesor Specification

## Purpose

Que asignar el rol Vendedor a un usuario genere su registro de asesor vinculado, y que ese `id_asesor` sea el que se registre en prospectos y en la venta directa del mapa.

## Requirements

### Requirement: Roles al crear un usuario

El alta de usuario SHALL permitir seleccionar uno o más roles en el mismo formulario.

#### Scenario: Crear usuario con rol Vendedor

- **WHEN** el usuario crea una cuenta seleccionando el rol Vendedor
- **THEN** el sistema SHALL crear el usuario con ese rol asignado

#### Scenario: Crear usuario sin roles

- **WHEN** el usuario crea una cuenta sin seleccionar roles
- **THEN** el sistema SHALL crear el usuario sin roles y sin derivar asesor

### Requirement: Derivación automática del asesor

Asignar el rol Vendedor a un usuario SHALL crear (o reactivar) el asesor vinculado a ese usuario con código único dentro de la empresa y nombre comercial igual al del usuario.

#### Scenario: Asesor creado automáticamente

- **WHEN** se asigna el rol Vendedor a un usuario que todavía no es asesor
- **THEN** el sistema SHALL crear el asesor con `id_usuario` del usuario, código autogenerado sin colisiones en la empresa, nombre comercial igual al del usuario y estado `activo`

#### Scenario: Usuario que ya es asesor

- **WHEN** se vuelve a asignar el rol Vendedor a un usuario que ya tiene asesor vinculado
- **THEN** el sistema SHALL reutilizar el asesor existente sin crear duplicados

#### Scenario: Código en uso

- **WHEN** el código autogenerado ya está en uso por otro asesor de la misma empresa
- **THEN** el sistema SHALL generar el siguiente código disponible antes de crear el asesor

### Requirement: Desactivación al quitar el rol

Quitar el rol Vendedor a un usuario SHALL dejar su asesor en estado `inactivo`, sin eliminarlo.

#### Scenario: Rol removido

- **WHEN** se quita el rol Vendedor a un usuario
- **THEN** el sistema SHALL pasar su asesor a `inactivo` y conservar el registro

#### Scenario: Historial preservado

- **WHEN** el asesor inactivo tiene ventas o cotizaciones a su nombre
- **THEN** el sistema SHALL mantener esas ventas consultables con el nombre del asesor

### Requirement: Vínculo usuario ↔ asesor visible

El módulo de Asesores SHALL mostrar el usuario vinculado de cada asesor y permitir vincular y desvincular.

#### Scenario: Asesor sin usuario

- **WHEN** un asesor fue creado manualmente sin usuario
- **THEN** el sistema SHALL mostrar el marcador "Sin vincular"

#### Scenario: Vincular un asesor existente

- **WHEN** el usuario vincula un asesor a una cuenta con rol Vendedor
- **THEN** el sistema SHALL actualizar `id_usuario` y esa cuenta pasará a usar ese asesor de sesión

#### Scenario: Desvincular un asesor

- **WHEN** el usuario desvincula la cuenta de un asesor
- **THEN** el sistema SHALL dejar `id_usuario` vacío y el asesor quedará disponible para vincular a otra cuenta

### Requirement: Asesor de la sesión en el resto del flujo

Las operaciones que hoy registran `id_asesor` vacío SHALL usar el asesor de la sesión cuando la cuenta tenga uno vinculado y activo.

#### Scenario: Prospecto nuevo

- **WHEN** un usuario con asesor vinculado crea un prospecto
- **THEN** el prospecto SHALL quedar asociado a ese asesor

#### Scenario: Venta directa desde el mapa

- **WHEN** un usuario con asesor vinculado registra una venta directa desde el mapa
- **THEN** la cotización y la venta resultante SHALL conservar ese asesor

#### Scenario: Cuenta sin asesor

- **WHEN** la cuenta que realiza la operación no tiene asesor vinculado
- **THEN** el sistema SHALL registrar la operación sin asesor, sin bloquearla
