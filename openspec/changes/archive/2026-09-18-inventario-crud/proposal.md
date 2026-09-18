## Why

La página de inventario actual es un placeholder sin conexión a datos reales. El botón "Nuevo" no tiene handler onClick, la tabla usa mockData vacía, y los botones de acciones (Ver, Editar, Eliminar) no funcionan. Se necesita implementar un CRUD completo que permita gestionar registros de inventario con datos reales de Supabase.

## What Changes

- Agregar métodos `getById`, `update`, `delete` a la interfaz `InventarioRepository`
- Implementar los 3 métodos en `SupabaseInventarioRepository` y `MockInventarioRepository`
- Crear 4 use cases: `GetInventarioUseCase`, `CreateInventarioUseCase`, `UpdateInventarioUseCase`, `DeleteInventarioUseCase`
- Registrar use cases en el container de dependencias
- Crear hook `useInventario` con TanStack Query
- Agregar query key `inventario` a `inventoryKeys`
- Reescribir `InventarioPage.tsx` con:
  - Conexión a datos reales via hook
  - Botón "Nuevo" funcional con modal de creación
  - Botones de acciones funcionales (Ver, Editar, Eliminar)
  - Modal genérico que muestra campos según la operación

## Capabilities

### New Capabilities
- `inventario/crud`: Gestión completa de registros de inventario (crear, leer, actualizar, eliminar) con interfaz de usuario y conexión a Supabase

### Modified Capabilities
<!-- No hay capacidades existentes que modifiquen sus requisitos -->

## Impact

- **Archivos modificados:**
  - `src/domain/inventario/repositories/InventarioRepository.ts`
  - `src/infrastructure/repositories/supabase/SupabaseInventarioRepository.ts`
  - `src/infrastructure/repositories/mock/MockInventarioRepository.ts`
  - `src/infrastructure/container/create-use-cases.ts`
  - `src/presentation/hooks/inventoryKeys.ts`
  - `src/presentation/hooks/index.ts`
  - `src/presentation/pages/inventario/InventarioPage.tsx`

- **Archivos creados:**
  - `src/application/inventario/use-cases/GetInventarioUseCase.ts`
  - `src/application/inventario/use-cases/CreateInventarioUseCase.ts`
  - `src/application/inventario/use-cases/UpdateInventarioUseCase.ts`
  - `src/application/inventario/use-cases/DeleteInventarioUseCase.ts`
  - `src/presentation/hooks/useInventario.ts`

- **Dependencias:** No se agregan dependencias nuevas, se usa TanStack Query y Ant Design que ya están en el proyecto

- **Base de datos:** Se trabaja con la tabla `inventario` existente (5 campos: id_inventario, id_lote, id_usuario, estado_anterior, estado_nuevo)
