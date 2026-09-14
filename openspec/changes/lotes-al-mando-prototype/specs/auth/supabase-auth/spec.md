## Purpose

Autenticación y autorización usando Supabase Auth para login, logout, sesiones y protección de rutas en Lotes al Mando.

## ADDED Requirements

### Requirement: Login con email/password

El sistema SHALL autenticar usuarios con credenciales válidas de email y password.

#### Scenario: Login exitoso

- WHEN un usuario ingresa email y password válidos
- THEN el sistema SHALL crear una sesión válida y redirigir al dashboard

#### Scenario: Login con credenciales inválidas

- WHEN un usuario ingresa email o password incorrectos
- THEN el sistema SHALL mostrar error de autenticación y NO crear sesión

### Requirement: Logout

El sistema SHALL cerrar sesión y limpiar tokens de acceso.

#### Scenario: Logout exitoso

- WHEN un usuario autenticado presiona logout
- THEN el sistema SHALL destruir la sesión, limpiar tokens y redirigir a /login

### Requirement: Sesión persistente

El sistema SHALL mantener la sesión activa entre recargas de página.

#### Scenario: Recarga con sesión activa

- WHEN el usuario recarga la página con sesión activa
- THEN el sistema SHALL restaurar la sesión sin requerir login nuevamente

#### Scenario: Sesión expirada

- WHEN la sesión ha expirado según Supabase
- THEN el sistema SHALL redirigir a /login automáticamente

### Requirement: Protected routes

El sistema SHALL redirigir a /login si no hay sesión activa.

#### Scenario: Acceso sin sesión

- WHEN un usuario intenta acceder a una ruta protegida sin sesión
- THEN el sistema SHALL redirigir a /login

#### Scenario: Acceso con sesión

- WHEN un usuario accede a una ruta protegida con sesión válida
- THEN el sistema SHALL permitir el acceso normalmente

### Requirement: Empresas association

Cada usuario SHALL tener al menos una empresa asociada.

#### Scenario: Usuario con empresa

- WHEN un usuario inicia sesión
- THEN el sistema SHALL cargar la empresa asociada al usuario como contexto activo

#### Scenario: Usuario sin empresa

- WHEN un usuario inicia sesión sin empresa asociada
- THEN el sistema SHALL mostrar error y no permitir acceso al sistema

### Requirement: RLS enforcement

Todas las queries SHALL estar protegidas por Row Level Security en Supabase.

#### Scenario: Query con RLS activo

- WHEN el sistema ejecuta una query a Supabase
- THEN la query SHALL filtrar automáticamente por empresa_id según políticas RLS

#### Scenario: Query con RLS desactivado

- WHEN se detecta que RLS está desactivado en una tabla
- THEN el sistema SHALL bloquear la operación y registrar alerta de seguridad
