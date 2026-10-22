# clientes/reserva-snapshot Specification

## Purpose

Los datos del cliente capturados al reservar un lote se guardan como un snapshot en la oportunidad de la reserva (etapa `reserva`) en lugar de crear un `cliente`, y solo se copian a `cliente` cuando el lote pasa a vendido. Así la reserva no llena la tabla de clientes con gente que reserva y nunca compra.

## Requirements

### Requirement: Reserva sin crear cliente

Al confirmar una reserva, el sistema SHALL guardar los datos del cliente (nombres, cédula/RUC, email y teléfono) como un snapshot en la oportunidad de la reserva y SHALL **no** crear una fila en `cliente`, sin importar que la persona ya exista como cliente.

#### Scenario: Reserva guarda el snapshot en la oportunidad

- **WHEN** se confirma una reserva con datos de cliente válidos
- **THEN** el sistema SHALL crear la oportunidad (etapa `reserva`) con el snapshot del cliente y SHALL **no** insertar ninguna fila nueva en `cliente`

#### Scenario: Cliente ya existente

- **WHEN** la persona que reserva ya existe como `cliente` en la empresa
- **THEN** el sistema SHALL guardar igualmente su snapshot en la oportunidad y SHALL **no** modificar ni duplicar el `cliente` existente

#### Scenario: Re-reserva del mismo lote

- **WHEN** un lote que estuvo reservado y cancelado se vuelve a reservar
- **THEN** el sistema SHALL crear una nueva oportunidad de reserva con su snapshot, y el lote SHALL tener una sola oportunidad activa (la cancelación borró la anterior)

### Requirement: Un snapshot por reserva activa

Cada lote reservado SHALL tener una sola oportunidad de reserva activa que porte su snapshot, y el módulo de Reservas SHALL mostrar los datos del reservante leyéndolos de esa oportunidad por `id_lote`.

#### Scenario: Reservas muestra al reservante

- **WHEN** se lista el módulo de Reservas o se abre la venta de un lote reservado
- **THEN** el sistema SHALL mostrar nombre, cédula/RUC, email y teléfono desde el snapshot de la oportunidad de reserva de ese lote, sin depender de un match de email/teléfono contra `cliente`

#### Scenario: Reserva sin snapshot

- **WHEN** un lote reservado tiene una oportunidad de reserva sin snapshot de cliente
- **THEN** el sistema SHALL indicar que faltan los datos del cliente de la reserva y SHALL deshabilitar la acción de venta

### Requirement: Materialización del cliente al vender

Al confirmar la venta de un lote reservado, el sistema SHALL copiar el snapshot de la oportunidad a `cliente` antes de crear la cotización, y la cotización SHALL usar el `id_cliente` resultante.

#### Scenario: Venta materializa el cliente

- **WHEN** el usuario confirma la venta de un lote reservado
- **THEN** el sistema SHALL crear un `cliente` con el snapshot (dentro de la misma empresa) y SHALL crear la cotización apuntando a ese `id_cliente`, para que la aceptación deje el lote `vendido` con su venta, contrato y cuotas

#### Scenario: Persona que ya era cliente se reusa

- **WHEN** al materializar ya existe un `cliente` en la misma empresa con la misma cédula/RUC o email
- **THEN** el sistema SHALL reutilizar ese `cliente` en lugar de crear uno duplicado

#### Scenario: Venta reintentada

- **WHEN** la venta falla después de materializar el cliente y el usuario reintenta
- **THEN** el sistema SHALL reutilizar el `cliente` ya creado (materialización idempotente) sin duplicarlo

### Requirement: Cancelación limpia la reserva

Al cancelar una reserva, el sistema SHALL borrar la oportunidad de reserva del lote cancelado, con su snapshot.

#### Scenario: Cancelar reserva

- **WHEN** se cancela la reserva de un lote
- **THEN** el sistema SHALL devolver el lote a `disponible` y SHALL borrar su oportunidad de reserva (etapa `reserva`), con el snapshot del cliente

### Requirement: Venta directa desde el mapa no usa el snapshot

La venta directa desde el mapa (fuera del flujo de reserva) SHALL seguir creando o reusando el `cliente` directamente, sin escribir el snapshot en ninguna oportunidad de reserva.

#### Scenario: Venta directa del mapa

- **WHEN** se registra una venta directa desde el mapa con los datos del comprador
- **THEN** el sistema SHALL crear o reusar el `cliente` y SHALL crear la cotización correspondiente, sin escribir el snapshot en una oportunidad de reserva
