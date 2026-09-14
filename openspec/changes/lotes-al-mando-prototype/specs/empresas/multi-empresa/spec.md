## Purpose

Gestión multi-empresa con aislamiento de datos garantizado por RLS, permitiendo que cada empresa vea únicamente sus propios datos.

## ADDED Requirements

### Requirement: Empresa selection

El usuario SHALL poder seleccionar entre sus empresas activas.

#### Scenario: Selección de empresa

- WHEN el usuario tiene más de una empresa asociada
- THEN el sistema SHALL mostrar selector de empresas y permitir cambiar entre ellas

#### Scenario: Empresa por defecto

- WHEN el usuario tiene una sola empresa asociada
- THEN el sistema SHALL seleccionar automáticamente dicha empresa como contexto activo

### Requirement: Data isolation

Cada query SHALL filtrar por empresa_id del contexto activo.

#### Scenario: Query a tabla con RLS

- WHEN el sistema ejecuta una query a cualquier tabla principal
- THEN la query SHALL incluir filtro por empresa_id del contexto activo

#### Scenario: Cambio de contexto

- WHEN el usuario cambia de empresa activa
- THEN todas las consultas subsiguientes SHALL usar el nuevo empresa_id

### Requirement: RLS policies

Todas las tablas principales SHALL tener RLS basado en empresa_id.

#### Scenario: Tabla con RLS habilitado

- WHEN una tabla principal es creada o verificada
- THEN SHALL tener RLS habilitado con política basada en empresa_id

#### Scenario: Acceso cross-empresa bloqueado

- WHEN un usuario intenta acceder a datos de otra empresa
- THEN RLS SHALL bloquear el acceso y retornar conjunto vacío

### Requirement: Empresa CRUD

El sistema SHALL permitir crear, editar y listar empresas.

#### Scenario: Crear empresa

- WHEN el usuario crea una nueva empresa con datos válidos
- THEN el sistema SHALL persistir la empresa y asignar al usuario como administrador

#### Scenario: Editar empresa

- WHEN el usuario edita datos de su empresa activa
- THEN el sistema SHALL actualizar los campos modificados

#### Scenario: Listar empresas

- WHEN el usuario solicita el listado de empresas
- THEN el sistema SHALL retornar únicamente las empresas asociadas al usuario
