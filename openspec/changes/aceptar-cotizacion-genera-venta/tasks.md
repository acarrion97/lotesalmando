## 1. Verificación previa y esquema (Base de datos)

> **Registro 1.1 — verificación de solo lectura contra producción (30/09/2026):**
>
> | Tabla | Columnas reales | vs migraciones |
> |---|---|---|
> | `cotizador` | id_cotizacion, id_cliente, id_lote, precio_ofertado, estado | ✅ igual a 001 |
> | `ventas` | id_venta, id_cliente, id_lote, id_cotizacion, id_usuario, precio_final, estado, **created_at** | ⚠️ `created_at` no está en 001 ni en `database.types.ts` |
> | `contratos` | id_contrato, id_venta, numero_contrato, monto_total, **created_at** | ⚠️ `created_at` no está en 001 ni en `database.types.ts` |
> | `cobranzas` | id_cobranza, id_contrato, numero_cuota, monto_cuota, estado, created_at, fecha_vencimiento | ✅ 001 + 005 |
> | `asesores` | id_asesor, id_empresa, id_usuario, codigo, nombre_comercial, meta_ventas_mensual, estado, created_at | ✅ 004 |
> | `usuario` | id_usuario, id_empresa, nombres, email, estado | ✅ 001 |
>
> - Volúmenes: 5 cotizaciones (todas `aceptada`), 3 ventas (id_cotizacion 1, 2 y 3 — **sin duplicados**, el `UNIQUE` es viable), 3 contratos, 36 cobranzas, 1 asesor, 5 usuarios.
> - Funciones/trigger de `cotizador`: confirmado por el usuario que no existe ninguno; además ninguna RPC candidata responde y el comportamiento observado (cotizaciones #4 y #5 aceptadas sin venta) es consistente con la ausencia de trigger. `pg_trigger`/`pg_proc` no son consultables sin SQL (sin CLI ni service key en este entorno), por lo que la verificación definitiva queda al aplicar 011 en el SQL Editor.

- [x] 1.1 Verificar en producción, en solo lectura, el schema real de `cotizador`, `ventas`, `contratos`, `cobranzas`, `asesores` y `usuario`, y confirmar que no queda ninguna función ni trigger residual de `cotizador`; anotar las diferencias encontradas
- [x] 1.2 Escribir la migración del cambio con el bloque de reconciliación (`ventas.created_at`, `contratos.created_at` y cualquier otra diferencia detectada en 1.1) usando `IF NOT EXISTS`/`ADD COLUMN IF NOT EXISTS` → `supabase/migrations/012_aceptar_cotizacion_venta.sql` (el número 011 ya lo usa `011_proyecto_medios.sql` del cambio paralelo `public-map-gallery-financing`)
- [x] 1.3 Agregar a la migración las columnas nuevas: `cotizador.id_asesor` (FK `asesores`, anulable), `cotizador.monto_entrada` (DEFAULT 0), `cotizador.num_cuotas` (DEFAULT 12) y `ventas.id_asesor` (FK `asesores`, anulable)
- [x] 1.4 Crear `UNIQUE INDEX` sobre `ventas(id_cotizacion)` y verificar que no haya duplicados previos que lo impidan (verificado en 1.1: cotizaciones 1, 2 y 3, sin duplicados)
- [x] 1.5 Crear el trigger validador que rechaza que una cotización quede en `aceptada` sin venta asociada, con un mensaje que indique usar el flujo de aceptación (`trg_cotizador_aceptada_requiere_venta`, CONSTRAINT + DEFERRED)
- [x] 1.6 Crear la función RPC `aceptar_cotizacion(...)` que en una sola transacción valida la cotización, la pone en `aceptada`, inserta la venta (con asesor heredado), marca el lote `vendido`, registra inventario, crea el contrato y genera las cuotas del plan, devolviendo `id_venta`, `id_contrato` y `cuotas_generadas`
- [x] 1.7 Ajustar los permisos de `EXECUTE` de la RPC según el uso del mapa público y verificar el esquema de llamada desde la app (`GRANT ... TO anon, authenticated`)
- [x] 1.8 Probar la RPC con una cotización de prueba y comprobar venta, contrato, cuotas, lote e inventario; verificar además que un `UPDATE` directo a `aceptada` sin venta es rechazado — verificado contra producción: RPC responde (error "no existe" con id inexistente), aceptación de #4 creó venta 4, contrato `C-1790883525347`, lote 6 → `vendido`, 2 trazas de inventario (disponible→reservado→vendido) y 12 cuotas (11 × 5.167 + 5.163 = 62.000, primera 01/11/2026); el `UPDATE` directo a `aceptada` sobre #4 fue rechazado por el trigger con el mensaje esperado y el estado quedó intacto

## 2. Núcleo de dominio y aplicación

- [x] 2.1 Regenerar/actualizar `database.types.ts` con el schema nuevo y sincronizarlo con la BD real (actualizado a mano: `cotizador` + `id_asesor`/`monto_entrada`/`num_cuotas`, `ventas` + `id_asesor`/`created_at`, `contratos` + `created_at`; sin CLI de Supabase para regenerarlo)
- [x] 2.2 Ampliar la entidad y DTO de cotización con `id_asesor`, `monto_entrada` y `num_cuotas`, e incluir `id_asesor` y `created_at` en la entidad/DTO de venta
- [x] 2.3 Actualizar los repositorios de cotización y venta (Supabase y Mock) para persistir y mapear los campos nuevos (los de Supabase usan `select("*")` y casteo, así que toman las columnas nuevas solos; se ajustaron `toDto` de los casos de uso con defaults defensivos para filas previas a la migración)
- [x] 2.4 Implementar la función pura compartida `calcularPlanCuotas(precio, entrada, numCuotas, fechaBase)` con la regla aprobada (sin interés, cuota redondeada hacia arriba, última cuota absorve el resto, primera cuota a un mes) y probarla con el caso 62.000 / 10.000 / 24 → `src/domain/cotizacion/services/calcularPlanCuotas.ts`, verificada con `node scripts/verificar-plan-cuotas.ts`
- [x] 2.5 Crear el puerto y las implementaciones (Supabase y Mock) de la aceptación que invocan la RPC, y registrarlos en el contenedor de dependencias (`AceptarCotizacionPort`, `SupabaseAceptarCotizacion`, `MockAceptarCotizacion`, `AceptarCotizacionUseCase`, `useAceptarCotizacion`; registrado en `create-repositories`/`create-use-cases`)
- [x] 2.6 Reemplazar la generación hardcodeada de 12 cuotas en `SupabaseCreateSaleTransaction` y `MockCreateSaleTransaction` por el flujo de aceptación (o retirarlos si la RPC los absorbe por completo) → retirados: port `CreateSaleTransaction`, `CreateVentaUseCase`, ambos transactions y `useCreateVenta`
- [x] 2.7 Agregar las validaciones de entrada y número de cuotas (entrada menor al precio ofertado, cuotas ≥ 1) a los casos de uso de crear y editar cotización → `validaciones/condicionesFinanciamiento.ts`

## 3. Interfaz de Cotizaciones

- [x] 3.1 `NuevaCotizacionPage`: agregar asesor (con "Sin asesor" permitido), entrada y número de cuotas al wizard, con validaciones y plan de cuotas calculado en el paso de confirmación
- [x] 3.2 `CotizacionesPage` modal de edición: agregar asesor, entrada y número de cuotas, y quitar `aceptada` del selector de estado (además, la edición queda deshabilitada para cotizaciones ya aceptadas, que abren el detalle)
- [x] 3.3 `CotizacionesPage` modal de detalle: mostrar asesor, entrada, número de cuotas y la tabla completa de cuotas
- [x] 3.4 Agregar la acción "Aceptar" con su modal de confirmación que muestra cliente, lote, precio, asesor, entrada, cuotas y el plan, con Cancelar/Confirmar
- [x] 3.5 Conectar el confirmar con el caso de aceptación e invalidar las queries de cotizaciones, ventas, contratos, cobranzas, lotes e inventario (invalidación en `useAceptarCotizacion`)
- [x] 3.6 Manejar el fallo de la aceptación mostrando el error y permitiendo reintentar, sin dejar la interfaz en estado contradictorio (el modal queda abierto con el error de la RPC; el estado lo decide la BD)

## 4. Mapa público

- [x] 4.1 Agregar al wizard de venta del mapa el paso de financiamiento con entrada `0` y `12` cuotas precargados y editables, con las mismas validaciones del flujo interno (antes se llamaba "Pago" y tenía un anticipo que no se usaba)
- [x] 4.2 Mostrar el plan de cuotas calculado en el resumen del wizard antes de confirmar
- [x] 4.3 Reemplazar la secuencia actual (crear cotización aceptada + llamar createVenta) por la misma RPC del flujo interno, con asesor `NULL` (la cotización nace en borrador y la RPC la pone en `aceptada` junto con la venta)
- [x] 4.4 Verificar que un fallo en la confirmación no deja la cotización aceptada sin venta ni lotes a medias — aceptar la #5 con un `p_id_usuario` inexistente falló en la FK **antes** de commit: la cotización siguió en `enviada`, el lote 8 siguió `reservado`, sin registro de inventario nuevo, sin contrato y sin cuotas (48 cuotas en total, sin incremento); la interfaz muestra el error y permite reintentar (`CotizacionesPage` modal de aceptación y `MapasPage` en su `catch` invalidan `cotizaciones`/`clientes`)

## 5. Interfaz de Ventas: filtro por fechas

- [x] 5.1 Crear el componente compartido de filtro de fechas (presets mes actual, mes pasado, últimos 30 días, este año + rango libre) con cálculo en la zona horaria de la empresa → `FiltroRangoFechas` + `src/utils/dates/rangoFechas.ts`, verificado con `node scripts/verificar-rango-fechas.ts`
- [x] 5.2 Integrarlo en la barra de `VentasPage`, combinado con la búsqueda de texto y el filtro de estado existentes
- [x] 5.3 Derivar los indicadores (total, completadas, pendientes, valor total) de la lista ya filtrada
- [x] 5.4 Verificar el comportamiento sin conexión, aplicando el filtro sobre las ventas en caché (el filtro es puro en cliente: no dispara consultas, así que opera sobre el listado persistido de react-query)

## 6. Módulos y herramientas afectados

- [x] 6.1 `AsesoresPage`: calcular las ventas del mes por `id_asesor` en lugar de `id_usuario` (y solo del mes en curso, que es lo que compara con la meta mensual)
- [x] 6.2 `ContratosPage`: mostrar la entrada y el monto financiado en el detalle del contrato, obtenidos de la cotización asociada
- [x] 6.3 Importación de datos: impedir que la tabla `cotizador` se importe con estado `aceptada` y añadir las columnas nuevas al catálogo de exportación (`exportTableCatalog`)
- [x] 6.4 Actualizar los mocks de cotizaciones y ventas para reflejar los campos nuevos

## 7. Reparación de datos y verificación final

- [x] 7.1 Mover las cotizaciones #4 y #5 de producción a estado `enviada` (reparación aprobada en D7) — aplicado por REST (PATCH 204); ambas quedaron en `enviada`
- [x] 7.2 Verificar que no queda ninguna cotización en `aceptada` sin venta asociada — `aceptadas = {1,2,3,4}` y `con venta = {1,2,3,4}`; la #4 se re-aceptó como parte de la reparación y la #5 quedó `enviada` para que se acepte desde la UI (su intento fallido con un usuario inexistente no dejó ningún estado parcial: lote 8 sigue `reservado`, sin inventario nuevo, sin contrato ni cuotas)
- [x] 7.3 Validar los escenarios de `cotizaciones/plan-de-pago` (cálculo, visibilidad en detalle y resumen, validaciones) — cálculo: `node scripts/verificar-plan-cuotas.ts` (62.000/10.000/24 → financiado 52.000, cuota 2.167, última 2.159, recorte 28/02/2027); asesor en lista (columna "Asesor" con "Sin asesor"), en detalle y por defecto = asesor de la sesión; entrada inválida ahora bloquea el guardado con regla del formulario (no solo un aviso) y num_cuotas < 1 igual; plan visible en el resumen del wizard, en el detalle, en el modal de aceptación y recalculado en vivo
- [x] 7.4 Validar los escenarios de `cotizaciones/aceptacion` (confirmación, cancelación, atomicidad, idempotencia, guarda de BD) — confirmación: modal con cliente/lote/precio/asesor/entrada/cuotas/plan (runtime: aceptación de #4 → venta 4, contrato `C-1790883525347`, 12 cuotas, lote 6 `vendido`, 2 trazas de inventario); cancelación: `closeModal` no ejecuta mutación; atomicidad: fallo de FK no dejó artefactos; idempotencia: segundo intento → "La cotizacion 4 ya fue aceptada"; guarda de BD: `UPDATE` directo a `aceptada` rechazado por el trigger y segunda venta rechazada por `uq_ventas_cotizacion` (23505); reparación: 7.1/7.2
- [x] 7.5 Validar los escenarios de `ventas/consulta` (presets, rango libre, zona horaria, KPIs, sin conexión) — presets y límites inclusivos verificados por `node scripts/verificar-rango-fechas.ts` (incluye 01:30 UTC = día anterior en la empresa y venta del último día del mes contabilizada en ese mes); combinación con búsqueda y estado: el `filter` encadena `dentroDelRango` + texto; indicadores derivan de `filteredData`; sin conexión: el filtro es puro en cliente sobre la lista de react-query (sin fetch)
- [x] 7.6 Validar los escenarios de `mapa-publico/venta-directa` (defaults, plan visible, asesor vacío, fallo parcial) — defaults entrada 0 / 12 cuotas precargados y editables; condiciones inválidas bloquean "Siguiente" con mensaje; plan visible en el resumen antes de confirmar; la cotización se crea sin asesor y en `borrador`, la RPC la pasa a `aceptada` con la venta (mismo camino validado en runtime con la #4, con asesor `NULL`); fallo parcial = escenario de 4.4
- [x] 7.7 Ejecutar `npm run lint`, `npm run format:check` y `npm run build` sin errores — `lint` ✓ (0 problemas), `build` ✓ (requirió subir `workbox.maximumFileSizeToCacheInBytes` a 3 MiB: el bundle pasó de 1,96 MB en HEAD a 2,13 MB y el default de 2 MiB rompía la precarga del PWA; decisión del usuario), `format:check` ✗ **preexistente**: falla en 160 archivos que no toca este cambio (también los WIP del usuario); todos los archivos del cambio fueron formateados con `prettier --write` y pasan `--check`; el usuario decidió no reformatear el repo
