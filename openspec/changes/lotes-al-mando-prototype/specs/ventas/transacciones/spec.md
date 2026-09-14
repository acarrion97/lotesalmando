## Purpose

Flujo completo de comercialización desde reserva hasta contrato, incluyendo transacciones atómicas.

## ADDED Requirements

### Requirement: Reservation

El sistema SHALL permitir reservar un lote cambiando su estado a "reservado".

#### Scenario: Reserva exitosa

- WHEN el usuario reserva un lote disponible
- THEN el sistema SHALL cambiar estado del lote a "reservado" y registrar la reserva

#### Scenario: Lote no disponible

- WHEN se intenta reservar un lote que no está disponible
- THEN el sistema SHALL rechazar la operación con error de disponibilidad

### Requirement: Cancel reservation

El sistema SHALL permitir cancelar reserva cambiando estado a "disponible".

#### Scenario: Cancelar reserva

- WHEN el usuario cancela una reserva activa
- THEN el sistema SHALL cambiar estado del lote a "disponible" y registrar la cancelación

### Requirement: Sale creation

El sistema SHALL crear venta con transacción atómica incluyendo venta, lote, inventario, contrato y cuotas.

#### Scenario: Crear venta completa

- WHEN el usuario crea una venta con prospecto, lote, precio y asesor
- THEN el sistema SHALL ejecutar transacción atómica que incluya:
  - Registro de venta con estado "pendiente"
  - Cambio de estado del lote a "vendido"
  - Actualización de inventario
  - Generación de contrato
  - Generación de 12 cuotas equitativas

#### Scenario: Error en transacción

- WHEN ocurre error durante la transacción atómica de venta
- THEN el sistema SHALL revertir todos los cambios y mostrar error

### Requirement: Contract generation

Cada venta SHALL generar contrato automáticamente con número secuencial.

#### Scenario: Generación automática

- WHEN se completa la transacción de venta
- THEN el sistema SHALL generar contrato con número secuencial único y datos de la venta

### Requirement: Invoice generation

Cada contrato SHALL generar 12 cuotas equitativas.

#### Scenario: Generación de cuotas

- WHEN se genera un contrato
- THEN el sistema SHALL crear 12 cuotas con monto igual, fechas consecutivas mensuales y estado "próximo a vencer"

### Requirement: Atomic transaction

La creación de venta SHALL ser atómica (todo o nada).

#### Scenario: Éxito atómico

- WHEN todos los pasos de la transacción de venta son exitosos
- THEN el sistema SHALL confirmar todos los cambios

#### Scenario: Fallo atómico

- WHEN falla cualquiera de los pasos de la transacción
- THEN el sistema SHALL revertir todos los cambios realizados

### Requirement: Sale status

Las ventas SHALL tener estados: pendiente, completada, cancelada.

#### Scenario: Estado inicial

- WHEN se crea una venta
- THEN su estado SHALL ser "pendiente"

#### Scenario: Completar venta

- WHEN se confirma el pago inicial
- THEN el sistema SHALL cambiar estado a "completada"

#### Scenario: Cancelar venta

- WHEN se cancela una venta
- THEN el sistema SHALL cambiar estado a "cancelada" y liberar el lote
