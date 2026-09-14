## Purpose

Gestión de usuarios del sistema con roles y asignación a empresas.

## ADDED Requirements

### Requirement: User CRUD

El sistema SHALL permitir crear, editar, listar y eliminar usuarios.

#### Scenario: Crear usuario

- WHEN el administrador crea un usuario con email, nombre y rol válido
- THEN el sistema SHALL persistir el usuario y enviar invitación de acceso

#### Scenario: Editar usuario

- WHEN el administrador edita datos de un usuario
- THEN el sistema SHALL actualizar los campos modificados

#### Scenario: Listar usuarios

- WHEN el administrador solicita el listado de usuarios
- THEN el sistema SHALL retornar los usuarios de la empresa activa

#### Scenario: Eliminar usuario

- WHEN el administrador elimina un usuario
- THEN el sistema SHALL desactivar el usuario sin eliminar físicamente

### Requirement: Role assignment

Cada usuario SHALL tener al menos un rol asignado.

#### Scenario: Asignación de rol

- WHEN se crea o edita un usuario
- THEN el sistema SHALL exigir al menos un rol válido (admin, gerente, asesor,etc.)

#### Scenario: Sin rol asignado

- WHEN se intenta guardar un usuario sin rol
- THEN el sistema SHALL rechazar la operación con error de validación

### Requirement: Empresa association

Cada usuario SHALL estar asociado a al menos una empresa.

#### Scenario: Asignación a empresa

- WHEN se crea un usuario
- THEN el sistema SHALL asociarlo a al menos una empresa activa

#### Scenario: Sin empresa asociada

- WHEN se intenta guardar un usuario sin empresa
- THEN el sistema SHALL rechazar la operación con error de validación

### Requirement: User status

Los usuarios SHALL tener estado activo o inactivo.

#### Scenario: Desactivar usuario

- WHEN un administrador desactiva un usuario
- THEN el sistema SHALL marcar estado como inactivo y bloquear acceso al sistema

#### Scenario: Reactivar usuario

- WHEN un administrador reactiva un usuario
- THEN el sistema SHALL marcar estado como activo y restaurar acceso

### Requirement: Email uniqueness

El email SHALL ser único por empresa.

#### Scenario: Email duplicado en empresa

- WHEN se intenta crear un usuario con email ya existente en la misma empresa
- THEN el sistema SHALL rechazar la operación con error de duplicidad

#### Scenario: Email en otra empresa

- WHEN se crea un usuario con email existente en otra empresa
- THEN el sistema SHALL permitir la operación normalmente
