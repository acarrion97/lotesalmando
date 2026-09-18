## Context

La página de inventario actual es un placeholder sin conexión a datos. El proyecto sigue una arquitectura hexagonal con capas: Domain, Application, Infrastructure, Presentation. Los módulos existentes (Proyectos, Lotes, Clientes) tienen CRUD funcional que sirve como patrón de referencia.

## Goals / Non-Goals

**Goals:**
- Implementar CRUD completo para registros de inventario
- Conectar la página a datos reales de Supabase
- Seguir los patrones existentes del proyecto (use cases, hooks, container)
- Crear modal genérico reutilizable para las operaciones

**Non-Goals:**
- Agregar campos nuevos a la tabla de inventario (fecha_cambio, observacion)
- Modificar la lógica de negocio existente de otros módulos que crean registros
- Implementar paginación (los registros de inventario suelen ser pocos)

## Decisions

### 1. Repository Interface Extension
**Decisión:** Agregar métodos `getById`, `update`, `delete` a `InventarioRepository`.
**Razón:** Necesarios para las operaciones de lectura individual, actualización y eliminación.
**Alternativa:** Crear una nueva interfaz separada - rechazado porque violaría el principio de单一 responsabilidad.

### 2. Use Cases Pattern
**Decisión:** Crear 4 use cases independientes (Get, Create, Update, Delete).
**Razón:** Sigue el patrón establecido en Proyectos, Lotes, Clientes. Cada use case tiene un solo método `execute()`.
**Alternativa:** Un solo use case CRUD - rechazado porque dificulta el testing y viola单一 responsabilidad.

### 3. Modal Genérico
**Decisión:** Un solo componente Modal que muestra diferentes campos según la operación (create, edit, view, delete).
**Razón:** Reduce duplicación de código, mantiene consistencia visual, es más fácil de mantener.
**Alternativa:** Modales separados para cada operación - rechazado porque crearía 4 componentes similares.

### 4. Hook Pattern
**Decisión:** Crear hook `useInventario` que usa `useQuery` de TanStack Query.
**Razón:** Sigue el patrón existente (useProyectos, useLotes, useClientes). Maneja cache y re-fetch automático.
**Alternativa:** Estado local con useState - rechazado porque no maneja cache ni sincronización.

### 5. Query Keys
**Decisión:** Agregar `inventario: () => ["inventario"]` a `inventoryKeys`.
**Razón:** Tenant-aware pattern, pero inventario no depende de empresa_id directamente.
**Alternativa:** `inventario: (empresaId) => ["inventario", empresaId]` - no aplica porque la tabla inventario no tiene campo id_empresa.

## Risks / Trade-offs

### Risk: Performance con muchos registros
**Mitigación:** La tabla inventario típicamente tiene pocos registros por lote. Si crece, se puede agregar paginación después.

### Risk: Conflictos de concurrencia
**Mitigación:** Los registros de inventario se crean típicamente desde otros módulos. La edición manual es poco frecuente. Se puede agregar optimistic locking si es necesario.

### Risk: Validación de integridad referencial
**Mitigación:** Los campos id_lote e id_usuario son foráneos. La validación se hace en Supabase con foreign keys. El frontend puede mostrar selects con opciones válidas.

## Migration Plan

1. Deploy cambios al repository (sin break changes)
2. Deploy use cases y container
3. Deploy hook y página
4. Testing: verificar CRUD completo con datos reales
5. Rollback: revertir cambios de página (los use cases no rompen nada)

## Open Questions

- ¿Se deben agregar selects para Lote y Usuario en el formulario de creación, o solo campos numéricos?
- ¿Se debe validar que id_lote e id_usuario existan antes de guardar?
