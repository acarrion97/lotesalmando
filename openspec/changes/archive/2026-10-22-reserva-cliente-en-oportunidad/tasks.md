## 1. Base de datos: snapshot en `oportunidades` y backfill

- [x] 1.1 Crear migración `supabase/migrations/039_oportunidades_datos_cliente.sql` con las 4 columnas anulables (`cliente_nombres`, `cliente_cedula_ruc`, `cliente_email`, `cliente_telefono`) y el índice parcial por lote en etapa `reserva`
- [x] 1.2 Agregar el backfill en la misma migración: rellenar el snapshot desde el cliente que solo existía por la reserva (match por email, lote `reservado`, sin ventas ni cotizaciones) y borrar ese `cliente` (CTE atómica e idempotente con guarda `cliente_nombres IS NULL`)

## 2. Dominio e infraestructura de oportunidades

- [x] 2.1 Agregar los 4 campos opcionales del snapshot a la entidad `Oportunidad`
- [x] 2.2 Agregar `getByLoteId` a `OportunidadRepository` y a `SupabaseOportunidadRepository`
- [x] 2.3 Agregar `getByLoteId` al mock inline de oportunidades en `create-repositories.ts`

## 3. Casos de uso

- [x] 3.1 Cambiar `ReservarProspectoUseCase` para guardar el snapshot en la oportunidad que crea (etapa `reserva`) en lugar de crear `cliente`; quitar el repo temporal del resultado y de la compensación
- [x] 3.2 Actualizar `CancelarReservaUseCase` para borrar la oportunidad (`etapa = reserva`) del lote cancelado vía `getByLoteId`
- [x] 3.3 Crear `MaterializarClienteReservaUseCase` (en `clientes/use-cases`): recibe el snapshot + `id_empresa` y hace find-or-create en `cliente` por cédula/email en la misma empresa
- [x] 3.4 Registrar el caso de uso nuevo y ajustar los existentes en `create-use-cases.ts` (quitar `getClienteReservas` y `clienteReservaRepo`)

## 4. UI

- [x] 4.1 En `ReservasPage`: leer los datos del reservante del snapshot de la oportunidad (helper `datosClienteDe`) y ajustar `ReservaInfo`
- [x] 4.2 En `ReservasPage.handleRealizarVenta`: materializar el cliente con el snapshot antes de crear la cotización e invalidar `clientes` tras la venta exitosa
- [x] 4.3 En `ReservasPage`: habilitar/deshabilitar "Realizar venta" y mostrar los datos según `datosCliente`
- [x] 4.4 En `ProspectosPage` y `MapasPage`: quitar la invalidación de `clienteReservas` (ya existe la de `oportunidades`) y actualizar comentarios obsoletos

## 5. Verificación

- [x] 5.1 Reservar un prospecto ⇒ lote `reservado` + oportunidad `reserva` con el snapshot + prospecto en `reserva`, y **sin** fila nueva en `cliente`
- [x] 5.2 Vender ese lote desde Reservas ⇒ se crea (o reusa) el `cliente`, la cotización lo referencia y la RPC deja el lote `vendido` con venta, contrato y cuotas
- [x] 5.3 Cancelar una reserva ⇒ se borra su oportunidad; re-reservar el lote crea una sola oportunidad nueva (sin duplicados)
- [x] 5.4 La venta directa desde el mapa sigue creando `cliente` sin tocar el snapshot
- [x] 5.5 `tsc -b` y `eslint` sin errores
