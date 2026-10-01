## Why

Aceptar una cotización desde el módulo de Cotizaciones solo cambia el campo `estado`: no crea venta, no mueve el lote, no genera contrato ni cuotas. En producción hay 5 cotizaciones en `aceptada` y solo 3 ventas (los lotes 6 y 8 siguen en `reservado`), lo que confirma que la venta automática no ocurre. La única ruta que hoy crea ventas es el mapa público, que lo hace de forma explícita y sin plan de pago. Además, una cotización no registra quién la hizo ni las condiciones de financiamiento (entrada y número de cuotas), y Ventas no permite filtrar por fechas.

## What Changes

- La aceptación de una cotización pasa a ser una acción confirmada en modal que muestra el plan de pago (entrada, número de cuotas y la tabla de cuotas calculada) y, al confirmar, genera automáticamente la venta, marca el lote como vendido, registra el movimiento de inventario, crea el contrato y genera las cuotas de cobranza — todo en una sola operación atómica (RPC versionada en migración).
- **BREAKING**: `aceptada` deja de ser un valor seleccionable libremente en el `Select` de estado del modal de edición; se alcanza únicamente desde la acción "Aceptar" con su confirmación. `rechazada` sigue disponible directamente.
- La cotización incorpora asesor (`asesores`, anulable solo cuando la venta no la registra un asesor), valor de la entrada y número de cuotas; estos datos se capturan al crear/editar y se muestran en la vista detalle.
- El plan de pago deja de estar hardcodeado (`12` cuotas fijas en `SupabaseCreateSaleTransaction`) y pasa a calcularse desde entrada y número de cuotas, manteniendo la práctica actual: sin interés, precio puro, primera cuota a un mes de la aceptación, la última cuota absorbe el redondeo.
- La venta hereda el asesor de la cotización (`ventas.id_asesor`, anulable) y corrige el cálculo de ventas por asesor del módulo de Asesores, que hoy cruza `id_usuario` con `id_asesor`.
- El wizard del mapa público agrega entrada y número de cuotas con valores por defecto precargados (entrada 0, 12 cuotas) y deja el asesor en `NULL`.
- Ventas incorpora filtro por fechas con presets (mes actual, mes pasado, últimos 30 días, este año) y rango libre, con los indicadores de la página recalculados sobre el rango seleccionado.
- Nuevas garantías de integridad: `UNIQUE (ventas.id_cotizacion)` y una guarda que impide que una cotización quede en `aceptada` sin venta asociada (cubre importación masiva y escrituras directas en SQL).
- Migración de reconciliación del schema real (por ejemplo `ventas.created_at`, no contemplado en las migraciones del repo) antes de agregar columnas nuevas.
- Reparación de datos: las cotizaciones #4 y #5 se devuelven a `enviada` para ser re-aceptadas por el flujo nuevo con su entrada y cuotas reales.

## Capabilities

### New Capabilities

- `cotizaciones/plan-de-pago`: datos de la cotización (asesor, entrada, número de cuotas) y visualización del plan de cuotas calculado.
- `cotizaciones/aceptacion`: confirmación en modal y generación atómica de la venta con sus artefactos (lote, inventario, contrato, cuotas), incluyendo la aceptación desde el mapa público.
- `ventas/consulta`: filtrado de ventas por fechas (presets y rango libre) y recálculo de sus indicadores.
- `mapa-publico/venta-directa`: condiciones de financiamiento capturadas en el wizard de venta del mapa público.

### Modified Capabilities

<!-- No hay capacidades existentes en openspec/specs todavía. -->

## Impact

- **Base de datos**: migración nueva (reconciliación + columnas `cotizador.id_asesor`, `cotizador.monto_entrada`, `cotizador.num_cuotas`, `ventas.id_asesor`, `UNIQUE(ventas.id_cotizacion)`, RPC `aceptar_cotizacion`, guarda de integridad). Requiere verificación previa contra el schema real de producción.
- **Backend/lógica**: `SupabaseCreateSaleTransaction` y `MockCreateSaleTransaction` (dejan de hardcodear 12 cuotas), nuevos casos de uso de aceptación y cálculo de plan, contenedor de dependencias (`create-use-cases.ts`), repositorios de cotización y venta, `database.types.ts`.
- **UI**: `CotizacionesPage` (acción Aceptar + modal de confirmación + detalle con plan), `NuevaCotizacionPage` (campos de entrada/cuotas y plan en el resumen), `VentasPage` (filtro de fechas + KPIs), `MapasPage` (entrada/cuotas en el wizard), `AsesoresPage` (métrica por asesor), `ContratosPage` (mostrar entrada/financiado).
- **Integración**: wizard de importación (`importarFilas.ts`) no debe poder crear cotizaciones en `aceptada`; exportación/exportTableCatalog por columnas nuevas.
- **Datos**: actualización de las cotizaciones #4 y #5 en producción.
- **Offline/PWA**: el filtro de ventas debe operar sobre datos cacheados (coherente con `pwa-offline-support`).
