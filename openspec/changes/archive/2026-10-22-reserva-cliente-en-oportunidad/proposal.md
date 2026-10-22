## Why

Reservar un lote creaba al instante un `cliente`: muchos reservan y nunca compran, y eso llenaba la tabla de clientes con gente que solo tomó un lote (a veces duplicando a alguien que ya era cliente). El módulo de Reservas además tenía que "casar" el email/teléfono del prospecto contra la tabla `cliente` para volver a encontrar a quién reservó, y si no coincidían exactamente la venta se bloqueaba. Se quiere que la reserva **no** cree `cliente`: sus datos deben guardarse aparte y solo copiarse a `cliente` cuando el lote pasa a **vendido**.

Ya existe la pieza justa para eso: la reserva crea una `oportunidad` (etapa `reserva`) que liga prospecto ↔ lote. En vez de una tabla nueva, basta con guardar el snapshot del cliente en esa misma oportunidad.

## What Changes

- **Reserva sin crear `cliente`**: `ReservarProspectoUseCase` deja de llamar a `clienteRepo.create` y guarda los datos capturados (nombres, cédula/RUC, email, teléfono) como un snapshot en la oportunidad que ya crea (etapa `reserva`). La reserva es más simple: un solo insert de oportunidad.
- **Una reserva activa por lote**: `CancelarReservaUseCase` ahora borra la oportunidad (`etapa = reserva`) del lote cancelado, además de devolverlo a `disponible`. Así un lote reservado tiene una sola oportunidad activa y re-reservar parte limpio (antes quedaban oportunidades huérfanas).
- **Materialización al vender**: nuevo caso de uso `MaterializarClienteReservaUseCase` que, al confirmar la venta desde Reservas, copia el snapshot de la oportunidad a `cliente` (reusando uno existente por cédula/email dentro de la misma empresa) y recién ahí crea la cotización que la RPC convierte en venta.
- **Reservas lee el snapshot de la oportunidad**: `ReservasPage` ya descarga `useOportunidades()`; muestra los datos del reservante leyéndolos del snapshot en vez de casar email/teléfono contra `cliente`.
- **Backfill**: la migración rellena el snapshot de las oportunidades de reserva vigentes desde el `cliente` que solo existía por esa reserva (match por email, lote aún `reservado`, sin ventas ni cotizaciones) y borra ese `cliente` huérfano.
- **Venta directa desde el mapa sin cambios**: `findOrCreateCliente` en `MapasPage` sigue creando `cliente` (es una venta real, no una reserva).

## Capabilities

### New Capabilities

- `clientes/reserva-snapshot`: los datos del cliente capturados al reservar viven como snapshot en la oportunidad de la reserva (no en `cliente`) y se copian a `cliente` recién al vender, reusando uno existente por cédula/email en la misma empresa.

### Modified Capabilities

- `prospectos/reserva`: la reserva deja de crear `cliente` (guarda el snapshot en la oportunidad) y la cancelación además borra esa oportunidad.

## Impact

- **Base de datos**: migración `039_oportunidades_datos_cliente.sql` — 4 columnas nuevas anulables en `oportunidades` (`cliente_nombres`, `cliente_cedula_ruc`, `cliente_email`, `cliente_telefono`), índice parcial por lote en etapa `reserva` y backfill conservador. Aditiva sobre el esquema existente.
- **Lógica/aplicación**: `ReservarProspectoUseCase` (snapshot en la oportunidad), `CancelarReservaUseCase` (borra la oportunidad de la reserva), nuevo `MaterializarClienteReservaUseCase`, `OportunidadRepository.getByLoteId`, contenedor `create-repositories.ts` / `create-use-cases.ts`.
- **UI**: `ReservasPage` (lee el snapshot de la oportunidad, materializa al vender, invalida `clientes` tras la venta); `ProspectosPage` y `MapasPage` invalidan `oportunidades` (ya lo hacían) al reservar.
- **Datos/modelos**: `Oportunidad` (entidad con los campos opcionales del snapshot), repositorios Supabase y Mock de oportunidades.
- **Riesgos**: el backfill identifica por email (conservador: no mueve a quien reserva sin email ni a quien ya tenía ventas/cotizaciones); la materialización es idempotente (find-or-create) por si la venta se reintenta.
