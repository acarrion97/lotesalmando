## Context

Ver `proposal.md` (Why). Contexto técnico mínimo:

- `ReservarProspectoUseCase` (creado en `reserva-prospectos-y-asesor`) orquestaba: crear/reusar cliente → `ReservarLoteUseCase` → entrada opcional → oportunidad (etapa `reserva`) → actualizar prospecto. El paso "crear/reusar cliente" escribía directo en `cliente`.
- La reserva **ya** crea una `oportunidad` que liga prospecto ↔ lote (`oportunidades` desde la migración `003`), con `etapa`, `valor_estimado`, `notas`. Es el registro natural de "quién reservó qué lote".
- `ReservasPage` reconstruía el cliente casando `prospecto.email` / `prospecto.telefono` contra `cliente`, y bloqueaba la venta si no coincidía.
- La venta pasa por `createCotizacion` + la RPC `aceptar_cotizacion` (migración `012`), que exige un `id_cliente` real **antes** de aceptar.
- `CancelarReservaUseCase` solo revierta lote + inventario; **no** borraba la oportunidad, por lo que reservar → cancelar → reservar dejaba dos oportunidades `reserva` para el mismo lote.
- El proveedor de datos es `supabase` en producción y `mock` para desarrollo; todo caso de uso debe funcionar con ambos. El mock de oportunidades es un literal dentro de `create-repositories.ts`.

## Goals / Non-Goals

**Goals:**

- Que reservar **no** cree `cliente`: el snapshot del cliente vive en la oportunidad de la reserva.
- Que al pasar a `vendido` ese snapshot se copie a `cliente` (reusando uno existente para no duplicar).
- Que el módulo de Reservas muestre al reservante sin depender de un match frágil de email/teléfono.
- Que un lote reservado tenga **una sola** oportunidad activa (la cancelación la limpia).

**Non-Goals:**

- No se toca la RPC `aceptar_cotizacion` ni el esquema de `ventas`/`cotizador`/`contratos`/`cobranzas`.
- No se cambia la venta directa desde el mapa (sigue creando `cliente`).
- No se rediseña el pipeline de prospectos ni el modal de reserva.
- No se resetea `prospectos.estado` al cancelar (hueco preexistente, fuera de alcance).
- No se agrega un `UNIQUE` en BD para "una reserva por lote" (se garantiza en la app; ver riesgos).

## Decisions

### D1 · Snapshot del cliente en la propia oportunidad de la reserva

**Decisión:** agregar cuatro columnas anulables a `oportunidades` (`cliente_nombres`, `cliente_cedula_ruc`, `cliente_email`, `cliente_telefono`) y escribir ahí los datos capturados al reservar. Son opcionales en la entidad (`?: string | null`) porque otras etapas (p. ej. `interesado` del mapa público) no las llenan.

- **Por qué reutilizar `oportunidad`**: la reserva ya liga prospecto ↔ lote en `oportunidades`; no hace falta tabla ni concepto nuevos. `ReservasPage` ya descarga `useOportunidades()`, así que leer el snapshot evita tabla, dominio, repositorio, hook y casos de uso extra.
- **Por qué un snapshot y no depender del `prospecto`**: el prospecto no tiene cédula y la reserva permite editar nombre/email/teléfono; guardar lo capturado respeta lo que el vendedor tipeó en ese momento.
- **Alternativa A (tabla nueva `cliente_reserva`)**: más superficie (tabla + dominio + repo + hook + 2 casos de uso) para guardar lo mismo; descartada por el usuario.
- **Alternativa B (columnas en `lotes`)**: contamina el esquema de lotes con datos de persona y mezcla concerns.

### D2 · Una reserva activa por lote: la cancelación borra la oportunidad

**Decisión:** `CancelarReservaUseCase` borra la oportunidad con `etapa = 'reserva'` del lote (usa el nuevo `OportunidadRepository.getByLoteId`). Así el snapshot desaparece con la reserva y re-reservar crea una oportunidad nueva limpia.

- **Por qué**: con el snapshot dentro, si quedaran dos oportunidades `reserva` para el mismo lote sería ambiguo cuál leer/sobreescribir. Borrar al cancelar garantiza una sola fila activa. También corrige un bug latente (oportunidades huérfanas tras cancelar).

### D3 · Toda reserva guarda snapshot (incluso si ya es cliente)

**Decisión:** al reservar se guarda **siempre** el snapshot en la oportunidad, aunque la persona ya exista como `cliente`. La reusar/no-duplicar se resuelve al materializar (D4), no en la reserva.

- **Por qué**: mantiene la reserva simple (un insert, sin escanear `cliente`) y concentra el dedupe en un solo lugar.

### D4 · Materializar en el flujo de venta de ReservasPage (no en la RPC)

**Decisión:** `MaterializarClienteReservaUseCase(id_empresa, nombres, cedula, email, telefono)` corre en `ReservasPage.handleRealizarVenta`, justo antes de `createCotizacion`: hace find-or-create en `cliente` por cédula/email dentro de la empresa y devuelve el `id_cliente` para la cotización. La RPC no se toca.

- **Por qué no en la RPC**: `aceptar_cotizacion` es compartida con la venta directa del mapa y la aceptación de cotizaciones; meterle la materialización la acoplaría al snapshot y obligaría a pasarle el lote. El usuario eligió el flujo de ReservasPage.
- **Idempotencia**: find-or-create ⇒ si la venta falla tras materializar y se reintenta, no se duplica el `cliente`.

### D5 · Backfill conservador por email

**Decisión:** la migración `039` rellena el snapshot desde el `cliente` que solo existía por la reserva (match por `lower(email)` con el prospecto de la oportunidad `reserva`, lote aún `reservado`, sin `ventas` ni `cotizador`) y borra ese `cliente`. Sentencia CTE atómica e idempotente, con guarda `cliente_nombres IS NULL` para no pisar snapshots ya llenos.

- **Por qué email**: única clave compartida entre `cliente` y `prospecto` en el flujo viejo (el prospecto no tiene cédula).
- **Por qué no mover a todos**: un cliente con ventas/cotizaciones es real; uno sin email no se identifica con seguridad. Conservador, sin pérdida.

## Risks / Trade-offs

- **Backfill por email (D5)** → no mueve reservas sin email ni clientes con ventas; deliberadamente conservador. Un cliente real nunca se pierde.
- **Sin `UNIQUE` en BD para "una reserva por lote"** → se garantiza en la app (D2). No se agregó la constraint parcial porque datos previos podrían tener varias oportunidades `reserva` por lote y rompería el `ALTER`; se deja como mejora futura una vez limpio el histórico.
- **Reserva no transaccional (patrón del repo)** → la compensación de `ReservarProspectoUseCase` borra la oportunidad (y su snapshot) si algo falla tras reservar el lote.
- **`prospectos.estado` no se resetea al cancelar** → hueco preexistente; el reservante ya no aparece en Reservas porque su oportunidad se borró. Fuera de alcance.
- **Snapshot deja de actualizarse al vender** → la oportunidad conserva el snapshot como historial de lo capturado; no se purga.
- **La RPC exige `id_cliente` antes de aceptar** → por eso la materialización ocurre *antes* de `createCotizacion`.

## Migration Plan

1. Migración `supabase/migrations/039_oportunidades_datos_cliente.sql`: agrega 4 columnas anulables + índice parcial + backfill en una CTE atómica. Idempotente, en el SQL Editor de Supabase igual que las previas.
2. Despliegue de la app (front + lógica). Sin cambios de API pública.
3. **Orden**: aplicar la migración antes de desplegar, para que `ReservarProspectoUseCase` escriba columnas que ya existen.
4. **Rollback**: las columnas son aditivas; revertir la lógica = deploy anterior (la reserva vuelve a crear `cliente`). El backfill ya borró filas de `cliente`: revertirlo no es trivial y no se automatiza (los datos movidos siguen en `oportunidades.cliente_*`).

## Open Questions

- ¿Purgar (o marcar) el snapshot de las oportunidades de lotes ya vendidos? Hoy se conserva como historial sin efectos.
- ¿Agregar el `UNIQUE` parcial "una oportunidad `reserva` por lote" una vez limpio el histórico?
