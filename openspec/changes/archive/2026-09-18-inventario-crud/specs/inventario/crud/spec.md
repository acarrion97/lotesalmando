## Purpose

Gestión completa de registros de inventario que permite a los usuarios crear, consultar, actualizar y eliminar registros del historial de cambios de estado de lotes, utilizando datos reales de Supabase.

## ADDED Requirements

### Requirement: Listar registros de inventario
El sistema SHALL mostrar todos los registros de inventario en una tabla con las columnas: Lote, Usuario, Estado Anterior, Estado Nuevo, y Acciones.

#### Scenario: Tabla muestra datos reales
- **WHEN** el usuario accede a la página de inventario
- **THEN** la tabla muestra los registros existentes en la base de datos

#### Scenario: Filtrado por texto
- **WHEN** el usuario ingresa texto en el campo de búsqueda
- **THEN** la tabla filtra registros que contengan el texto en id_lote, estado_anterior o estado_nuevo

#### Scenario: Ordenamiento por columna
- **WHEN** el usuario hace clic en el encabezado de una columna ordenable
- **THEN** la tabla se ordena por esa columna

### Requirement: Crear registro de inventario
El sistema SHALL permitir crear un nuevo registro de inventario mediante un modal con los campos: Lote, Usuario, Estado Anterior, Estado Nuevo.

#### Scenario: Abrir modal de creación
- **WHEN** el usuario hace clic en el botón "Nuevo"
- **THEN** se abre un modal con un formulario vacío para crear un registro

#### Scenario: Crear registro exitoso
- **WHEN** el usuario completa el formulario y hace clic en "Aceptar"
- **THEN** se crea el registro en la base de datos y se muestra mensaje de éxito

#### Scenario: Validación de campos requeridos
- **WHEN** el usuario intenta guardar sin completar campos requeridos
- **THEN** se muestran mensajes de error indicando los campos faltantes

### Requirement: Ver detalle de registro
El sistema SHALL permitir ver el detalle de un registro de inventario en modo solo lectura.

#### Scenario: Abrir modal de vista
- **WHEN** el usuario hace clic en el botón "Ver" de una fila
- **THEN** se abre un modal mostrando todos los campos del registro en modo solo lectura

### Requirement: Editar registro de inventario
El sistema SHALL permitir editar el campo "Estado Nuevo" de un registro de inventario existente.

#### Scenario: Abrir modal de edición
- **WHEN** el usuario hace clic en el botón "Editar" de una fila
- **THEN** se abre un modal con el campo "Estado Nuevo" prellenado con el valor actual

#### Scenario: Actualizar registro exitoso
- **WHEN** el usuario modifica el estado y hace clic en "Aceptar"
- **THEN** se actualiza el registro en la base de datos y se muestra mensaje de éxito

### Requirement: Eliminar registro de inventario
El sistema SHALL permitir eliminar un registro de inventario con confirmación del usuario.

#### Scenario: Abrir modal de confirmación
- **WHEN** el usuario hace clic en el botón "Eliminar" de una fila
- **THEN** se abre un modal de confirmación preguntando si desea eliminar el registro

#### Scenario: Confirmar eliminación
- **WHEN** el usuario confirma la eliminación
- **THEN** se elimina el registro de la base de datos y se muestra mensaje de éxito

#### Scenario: Cancelar eliminación
- **WHEN** el usuario cancela la eliminación
- **THEN** se cierra el modal sin eliminar el registro

### Requirement: Manejo de errores
El sistema SHALL manejar errores de conexión y mostrar mensajes informativos al usuario.

#### Scenario: Error de conexión
- **WHEN** ocurre un error al conectar con la base de datos
- **THEN** se muestra un mensaje de error al usuario

### Requirement: Actualización de datos
El sistema SHALL actualizar la tabla automáticamente después de crear, editar o eliminar un registro.

#### Scenario: Refresco automático
- **WHEN** se completa una operación de crear, editar o eliminar
- **THEN** la tabla se actualiza mostrando los datos más recientes
