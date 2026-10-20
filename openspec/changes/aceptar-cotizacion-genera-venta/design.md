## Context

Ver `proposal.md` para la motivación. Solo el estado actual necesario para decidir el cómo:

- **No existe ninguna función ni trigger** de `cotizador` (confirmado por el usuario en producción y ausente en todas las migraciones del repo). La única ruta que crea ventas hoy es `MapasPage`, que inserta la cotización con `estado: "aceptada"` y luego llama por separado a `useCreateVenta`.
- `SupabaseCreateSaleTransaction` hace la "transacción" con llamadas REST secuenciales (venta → lote → inventario → contrato → 12 cuotas): **no es atómica**, y el número de cuotas está hardcodeado en `12`.
- `cotizador` tiene solo 5 columnas en la BD real: `id_cotizacion`, `id_cliente`, `id_lote`, `precio_ofertado`, `estado`.
- **El repo está desincronizado de producción**: `ventas.created_at` existe y está poblado en la BD real, pero no aparece en `supabase/migrations/` ni en `database.types.ts` (mismo caso que `cobranzas.created_at`, documentado en 001). Hay que reconciliar antes de agregar columnas.
- `ventas.id_cotizacion` es nullable y **sin unique**: se pueden crear ventas duplicadas para la misma cotización.
- `AsesoresPage.getVentasMes` cruza `v.id_usuario === asesorId`: compara ids de `usuario` con ids de `asesores`, métrica inválida hoy.
- El wizard de importación (`importarFilas.ts`) acepta la tabla `cotizador` y podría escribir `estado = 'aceptada'` por fuera del flujo.
- No hay `DatePicker` en toda la aplicación; el filtro de fechas será el primero.
- La app es PWA con soporte offline en curso (`pwa-offline-support`), con React Query + persistencia.

## Goals / Non-Goals

**Goals:**

- Que aceptar una cotización genere la venta completa en una sola operación atómica e idempotente, ejecutada desde la app (interfaz + mapa público).
- Versionar en el repo toda la lógica de negocio de aceptación, para que no se vuelva a perder como se perdió la función que se recuerda.
- Dejar condiciones de financiamiento (asesor, entrada, cuotas) como datos de primera clase en cotización y venta.
- Filtro de fechas en Ventas usable también sin conexión.

**Non-Goals:**

- Interés, subsidios, mora o cualquier cálculo financiero distinto del modelo actual (precio − entrada) / N cuotas.
- PDF/imprimible de la cotización: el plan se muestra en pantalla (detalle, resumen y modal de aceptación), la impresión queda fuera.
- Migrar el resto de la app a server-side filtering; el filtro aplica solo a Ventas por ahora.
- Repensar el modelo de RLS (sigue deshabilitado por la migración 008) o corregir la causa raíz de ese problema.
- Alterar la mecánica de reservas del mapa público (solo su wizard de venta).

## Decisions

### D1. La aceptación se ejecuta en una RPC, no en un use-case de N llamadas REST

**Decisión:** crear la función `aceptar_cotizacion(p_id_cotizacion, p_id_usuario)` en una migración, que en una sola transacción: valida la cotización, actualiza `estado` a `aceptada`, inserta la venta (heredando asesor, entrada y cuotas de la cotización), cambia el lote a `vendido`, registra inventario, crea el contrato y genera las `cobranzas`; devuelve `id_venta`, `id_contrato` y la cantidad de cuotas. La app la invoca con `supabase.rpc(...)`.

- El asesor **no es parámetro**: se hereda de la cotización (lo exige el escenario "Confirmación exitosa" de `cotizaciones/aceptacion`), de modo que el mapa público queda con `id_asesor = NULL` por tener la cotización sin asesor. Si más adelante el modal de aceptación permite ajustar entrada/cuotas, se agregan parámetros opcionales que actualizan la cotización antes de continuar (open question de D5).

- **Por qué:** el flujo escribe en 5 tablas; con llamadas secuenciales un fallo a mitad deja estados imposibles de detectar (lote vendido sin venta). Una transacción lo garantiza.
- **Por qué en BD versionada:** la alternativa "otra función perdida en el SQL Editor" ya ocurrió. Al estar en `supabase/migrations/` queda en git, en code review y reproducible.
- **Alternativa descartada:** use-case en la app con las mismas 5 llamadas (status quo, no atómico); Edge Function (otro artefacto a desplegar y sin transacción sobre Postgres salvo retornar a SQL).
- **Nota:** con RLS deshabilitado y anon key, la RPC es invocable por quien tenga la clave, igual que el resto de la API actual; se revoca `EXECUTE` de `anon` si el mapa público no la usa directamente (el mapa público puede pasar por la misma RPC si su venta es pública, ver D6).

### D2. Red de seguridad en base de datos además de la RPC

**Decisión:**
1. `UNIQUE (ventas(id_cotizacion))` — hace imposible la venta duplicada.
2. Trigger `AFTER INSERT OR UPDATE ON cotizador` que lance excepción si `estado = 'aceptada'` y no existe venta con ese `id_cotizacion`.

- **Por qué:** la RPC cumple el flujo feliz, pero la importación masiva, el wizard de datos y el SQL directo se le siguen saltando. Es el mismo argumento por el que el trigger recordado "se perdió": sin guarda en BD, cualquier otra ruta rompe la regla.
- **Trigger derivado, no fuente de verdad:** la lógica de negocio vive en la RPC; el trigger solo valida (no crea ventas), para que no existan dos implementaciones del cálculo de cuotas.

### D3. Esquema nuevo, con reconciliación previa

**Decisión:** migración `011_...` en dos bloques:

```
-- Bloque A: reconciliar el schema real con el repo
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
-- (verificar también el resto del schema real antes de escribir la migración)

-- Bloque B: cambios del cambio
ALTER TABLE cotizador ADD COLUMN id_asesor INTEGER REFERENCES asesores(id_asesor),
                      ADD COLUMN monto_entrada DECIMAL(15,2) NOT NULL DEFAULT 0,
                      ADD COLUMN num_cuotas INTEGER NOT NULL DEFAULT 12;
ALTER TABLE ventas    ADD COLUMN id_asesor INTEGER REFERENCES asesores(id_asesor);
CREATE UNIQUE INDEX uq_ventas_cotizacion ON ventas(id_cotizacion);
-- + trigger validador, + funcion aceptar_cotizacion, + índices de fecha
```

- **Por qué `DEFAULT` en `monto_entrada`/`num_cuotas`:** las 5 cotizaciones existentes no pueden quedar con NULL y los datos a reparar (ver D7) necesitan un plan.
- **Por qué asesor en ambas tablas:** en `cotizador` para saber quién cotizó; en `ventas` para métricas (corrige el cruce inválido de `AsesoresPage`) y para que la venta conserve al asesor aunque la cotización cambie. La RPC **hereda** el asesor de la cotización en lugar de recibirlo como parámetro.
- **Anulable:** `NULL` significa "no lo registró un asesor" (mapa público, administrador).
- Se agregan además `CHECK (monto_entrada >= 0)`, `CHECK (num_cuotas >= 1)` e índice sobre `ventas(created_at)` para el filtro de fechas.
- **Alternativa descartada:** tabla `cotizacion_cuotas` que persista el plan en la cotización. Se descarta por ahora porque el plan es una función determinista de (precio, entrada, cuotas, fecha de aceptación); si más adelante se necesita "lo que se le ofreció ese día", se agrega sin romper nada.

### D4. El plan de cuotas vive en un módulo compartido de cálculo puro

**Decisión:** una función pura `calcularPlanCuotas(precio, entrada, numCuotas, fechaBase)` que devuelve `[{numero, fecha_vencimiento, monto}]`, usada por el modal de aceptación, el detalle, el resumen del wizard, el mapa público y por la RPC (misma fórmula en SQL: `ceil`, última cuota con el resto).

- **Por qué:** si la UI calcula una cosa y la RPC otra, el cliente ve un plan que no coincide con lo facturado — es el bug clásico de este tipo de sistema.
- **Reglas fijas (práctica actual):** sin intereses; financiado = precio − entrada; cuota = `ceil(financiado / N)`; última cuota absorbe la diferencia; primera cuota = un mes después de la aceptación, luego mensualidades consecutivas.

### D5. Captura de datos y momento de la aceptación

**Decisión:** asesor, entrada y número de cuotas se capturan al **crear o editar** la cotización (wizard `NuevaCotizacionPage` y modal de edición). El botón "Aceptar" abre el modal de confirmación que **muestra** el plan y confirma; "aceptada" sale del `Select` de estado.

- **Por qué:** mantiene la captura donde ya hay formulario y deja la aceptación como un acto de una sola confirmación, que es el requisito aprobado.
- **Riesgo de diseño asumido:** si al aceptar hace falta ajustar la entrada, se debe editar la cotización primero (o habilitar los campos dentro del modal de aceptación, decisión de UI reversible al implementar).

### D6. El mapa público reutiliza el mismo camino, con defaults precargados

**Decisión:** el wizard de venta del mapa público gana un paso de financiamiento con entrada `0` y `12` cuotas precargados y editables; su confirmación ejecuta la **misma** RPC, con `p_id_asesor = NULL`.

- **Por qué:** dos caminos distintos = dos formas de romper la regla de integridad. Compartir la RPC garantiza que la venta del mapa tenga contrato y cuotas iguales a las del flujo interno (hoy ya los tiene, pero por código duplicado en `MockCreateSaleTransaction`/`SupabaseCreateSaleTransaction`).
- **Constantes por defecto centralizadas** (entrada 0, 12 cuotas) para que la app y el mapa no diverjan.

### D7. Reparación de datos inconsistentes

**Decisión:** al aplicar el cambio, las cotizaciones aceptadas sin venta (#4 y #5 en producción) se devuelven a `enviada`, para que un asesor las re-acepte con su entrada y cuotas reales. Los lotes correspondientes conservan su estado actual hasta esa re-aceptación.

- **Por qué:** crearles ventas retroactivas obligaría a inventar un plan de pagos que el cliente no acordó. La re-aceptación captura datos reales y deja una trazabilidad limpia.
- **Alternativa descartada:** insertar ventas con defaults (entrada 0, 12 cuotas) — datos plausibles pero falsos.

### D8. Filtro de fechas en Ventas: client-side sobre `created_at`

**Decisión:** filtro en el cliente (presets + `RangePicker`), sobre `created_at`, con ajuste a la zona horaria de la empresa (UTC-5); los KPIs se derivan de la lista ya filtrada. Implementado como componente de filtro de fechas compartido en `presentation/components`.

- **Por qué client-side:** `useVentas` ya descarga el conjunto completo y el módulo debe funcionar offline (PWA en curso); un `.gte()/.lte()` a Postgres rompería el filtro sin conexión.
- **Por qué componente compartido:** será el primer `DatePicker` de la app y Cobranzas/Pagos/Alertas van a pedir lo mismo.
- **Alternativa descartada:** filtro server-side con parámetros en la query — correcto con miles de filas, pero incompatible con offline hoy. Si el volumen lo exige, se migrará manteniendo la misma interfaz.

## Risks / Trade-offs

- **[Repo desincronizado con producción]** → Mitigación: la migración 011 empieza con `IF NOT EXISTS` reconciliadores y con una verificación previa del schema real (columnas de `cotizador`, `ventas`, `usuario`, etc.) antes de escribirla; sin eso, se puede pisar trabajo que existe solo en la BD.
- **[RPC invocable con anon key]** → Mitigación: `REVOKE EXECUTE ... FROM anon` si el mapa público no la necesita directamente; validar siempre `p_id_cotizacion` dentro de la función. Se documenta que el modelo de seguridad actual es el heredado de 008 (RLS off), no algo nuevo de este cambio.
- **[Doble implementación del cálculo de cuotas (TS y SQL)]** → Mitigación: una sola fórmula documentada en D4, escenarios de prueba que comparan la tabla mostrada por la UI contra las `cobranzas` insertadas.
- **[Trigger validador bloquea una importación legítima]** → Mitigación: la importación se ajusta para no marcar `aceptada` directamente; el mensaje de error del trigger debe ser explícito ("use el flujo de aceptación").
- **[Cambio *breaking* en el `Select` de estado]** → Mitigación: los usuarios que hoy marcan `aceptada` a mano pasan por el nuevo botón; se verifica que ninguna otra pantalla (importación, edición masiva) dependa de ese valor.
- **[Dos cotizaciones de producción en estado inconsistente]** → Mitigación: tarea de reparación explícita (D7) con verificación de que no quede ninguna aceptada sin venta.
- **[Zona horaria en el filtro]** → Mitigación: decidirlo de forma explícita en D8 y probar con ventas creadas cerca de fin de mes.

## Migration Plan

1. **Verificación previa (solo lectura):** ✅ hecha el 30/09/2026 (registro en `tasks.md`, grupo 1). Diferencias reales encontradas: `ventas.created_at` y `contratos.created_at` existen en producción y no en el repo; sin duplicados en `ventas(id_cotizacion)`; sin función/trigger de `cotizador`.
2. **Migración 011:** bloque A de reconciliación (`created_at` y lo que haga falta) + bloque B (columnas, unique, trigger validador, RPC).
3. **Verificación de la RPC** con una cotización de prueba, comprobando venta + contrato + cuotas + estado del lote.
4. **Reparación de datos:** mover #4 y #5 a `enviada`.
5. **Deploy de la app** (frontend + use cases + UI); la app anterior sigue funcionando contra el schema nuevo (las columnas tienen default).
6. **Rollback:** revert del deploy de la app; en BD, `DROP` de la función, trigger e índices nuevos y `ALTER ... DROP COLUMN` — las ventas ya creadas no se tocan (el cambio es aditivo salvo el `UNIQUE`).

## Open Questions

- ¿Conviene permitir editar entrada/cuotas **dentro** del modal de aceptación (D5) o mantener la edición solo en el formulario? No cambia specs ni arquitectura; se resuelve al implementar la UI.
- ¿El preset "Este año" y el rango libre deben reflejarse en la URL para poder compartir vistas? Comodidad de uso, no afecta el comportamiento del filtro.
- Si más adelante se agregan intereses, ¿la tabla `cotizacion_cuotas` (D3) pasa a ser necesaria? Se evalúa en ese momento; no bloquea nada hoy.
