# prospectos/reserva Specification

## Purpose

Convertir el cambio de estado "Reserva" de un prospecto en una reserva real de lote, con la captura del cliente que la respalda y el vínculo prospecto ↔ lote que alimenta el pipeline.

## Requirements

### Requirement: Modal de reserva por cambio de estado

El sistema SHALL abrir un modal de reserva cuando el estado de un prospecto pasa a `reserva`, tanto al editarlo como al registrarlo con ese estado.

#### Scenario: Cambio de estado a reserva

- **WHEN** el usuario guarda un prospecto con estado `reserva` y el prospecto aún no tiene lote asignado
- **THEN** el sistema SHALL abrir el modal de reserva sin cerrar de forma inconsistente el formulario de edición

#### Scenario: Prospecto que ya está en reserva

- **WHEN** el usuario vuelve a guardar un prospecto que ya está en `reserva`
- **THEN** el sistema SHALL mantener el estado sin reabrir el modal de reserva si ya tiene un lote asignado

#### Scenario: Otros estados

- **WHEN** el usuario guarda un prospecto con un estado distinto de `reserva`
- **THEN** el sistema SHALL guardar el cambio sin abrir el modal de reserva

### Requirement: Selección de lote disponible

El modal SHALL listar únicamente los lotes con estado `disponible`, mostrando su identificación y precio, y SHALL exigir la selección de un lote para confirmar.

#### Scenario: Lotes disponibles

- **WHEN** se abre el modal de reserva
- **THEN** el sistema SHALL mostrar los lotes disponibles de la empresa con su número (y manzana cuando corresponda) y su precio de lista

#### Scenario: Sin lotes disponibles

- **WHEN** no existen lotes con estado `disponible`
- **THEN** el sistema SHALL mostrar un mensaje claro y deshabilitar la confirmación

#### Scenario: Confirmación sin lote

- **WHEN** el usuario intenta confirmar sin haber elegido un lote
- **THEN** el sistema SHALL impedir la confirmación e indicar que el lote es obligatorio

### Requirement: Datos del cliente en la reserva

El modal SHALL mostrar los datos del prospecto (nombres y email) precargados y editables, y SHALL exigir cédula/RUC y teléfono para completar la reserva. Al confirmar, esos datos SHALL guardarse como un snapshot en la oportunidad de la reserva y SHALL **no** crearse un `cliente`.

#### Scenario: Captura de cédula y teléfono

- **WHEN** el usuario completa el modal con cédula/RUC y teléfono
- **THEN** el sistema SHALL usar esos datos para el snapshot de la oportunidad de la reserva, sin crear ni actualizar un `cliente`

#### Scenario: Cliente ya existente

- **WHEN** la persona que reserva ya existe como `cliente`
- **THEN** el sistema SHALL guardar su snapshot en la oportunidad y SHALL **no** tocar el `cliente` existente; la reutilización o el alta en `cliente` ocurre recién al vender

### Requirement: Confirmación de la reserva

Al confirmar, el sistema SHALL reservar el lote, registrar el movimiento de inventario, crear la oportunidad que vincula prospecto y lote y persistir el estado `reserva` del prospecto.

#### Scenario: Reserva confirmada

- **WHEN** el usuario confirma la reserva con lote y datos de cliente válidos
- **THEN** el lote SHALL pasar a estado `reservado`, se SHALL registrar su movimiento de inventario, la oportunidad SHALL quedar en etapa `reserva` con el valor del lote y el prospecto SHALL quedar en estado `reserva` con fecha de seguimiento actualizada

#### Scenario: Lote no disponible

- **WHEN** el lote elegido dejó de estar disponible al momento de confirmar
- **THEN** el sistema SHALL mostrar el error, NO reservar ningún lote y permitir reintentar con otro lote

#### Scenario: Reserva con datos del prospecto de sesión

- **WHEN** la reserva se confirma por un usuario con asesor vinculado
- **THEN** el prospecto SHALL quedar asociado al asesor de la sesión

### Requirement: Cancelación sin efectos

El sistema SHALL permitir cancelar el modal de reserva sin persistir ningún efecto de la reserva: ni el estado `reserva` del prospecto, ni el lote, ni la oportunidad (y su snapshot del cliente).

#### Scenario: Cancelar el modal

- **WHEN** el usuario cierra o cancela el modal de reserva
- **THEN** el sistema SHALL conservar el estado anterior del prospecto, NO reservar ningún lote, NO dejar la oportunidad de reserva (ni su snapshot) y NO dejar el modal de edición en un estado inconsistente
