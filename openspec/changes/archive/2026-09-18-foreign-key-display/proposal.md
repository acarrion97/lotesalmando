## Why

Las tablas del sistema muestran IDs numéricos crudos para llaves foráneas (ej: `id_empresa: 1` en vez de "Constructora del Norte"). Los usuarios no pueden identificar los registros sin memorizar los IDs. Se necesita resolver automáticamente los IDs a nombres legibles.

## What Changes

- Crear hook genérico `useLookup` que convierte IDs a nombres usando datos ya cargados
- Modificar 11 páginas para usar el hook y mostrar nombres en vez de IDs
- Los hooks de datos (useEmpresas, useLotes, etc.) ya existen y se reutilizan

## Capabilities

### New Capabilities
- `ui/foreign-key-display`: Resolución automática de IDs a nombres en tablas y modales

### Modified Capabilities
<!-- No hay capacidades existentes que modifiquen sus requisitos -->

## Impact

- **Archivos creados:**
  - `src/presentation/hooks/useLookup.ts`

- **Archivos modificados:**
  - `src/presentation/hooks/index.ts`
  - `src/presentation/pages/proyectos/ProyectosPage.tsx`
  - `src/presentation/pages/inventario/InventarioPage.tsx`
  - `src/presentation/pages/ventas/VentasPage.tsx`
  - `src/presentation/pages/cotizaciones/CotizacionesPage.tsx`
  - `src/presentation/pages/contratos/ContratosPage.tsx`
  - `src/presentation/pages/cobranzas/CobranzasPage.tsx`
  - `src/presentation/pages/pagos/PagosPage.tsx`
  - `src/presentation/pages/lotes/LotesPage.tsx`
  - `src/presentation/pages/manzanas/ManzanasPage.tsx`
  - `src/presentation/pages/etapas/EtapasPage.tsx`
  - `src/presentation/pages/usuarios/UsuariosPage.tsx`

- **Dependencias:** No se agregan dependencias nuevas
