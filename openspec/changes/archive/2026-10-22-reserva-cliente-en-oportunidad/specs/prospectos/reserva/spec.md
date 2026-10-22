## MODIFIED Requirements

### Requirement: Datos del cliente en la reserva

El modal SHALL mostrar los datos del prospecto (nombres y email) precargados y editables, y SHALL exigir cédula/RUC y teléfono para completar la reserva. Al confirmar, esos datos SHALL guardarse como un snapshot en la oportunidad de la reserva y SHALL **no** crearse un `cliente`.

#### Scenario: Captura de cédula y teléfono

- **WHEN** el usuario completa el modal con cédula/RUC y teléfono
- **THEN** el sistema SHALL usar esos datos para el snapshot de la oportunidad de la reserva, sin crear ni actualizar un `cliente`

#### Scenario: Cliente ya existente

- **WHEN** la persona que reserva ya existe como `cliente`
- **THEN** el sistema SHALL guardar su snapshot en la oportunidad y SHALL **no** tocar el `cliente` existente; la reutilización o el alta en `cliente` ocurre recién al vender

### Requirement: Cancelación sin efectos

El sistema SHALL permitir cancelar el modal de reserva sin persistir ningún efecto de la reserva: ni el estado `reserva` del prospecto, ni el lote, ni la oportunidad (y su snapshot del cliente).

#### Scenario: Cancelar el modal

- **WHEN** el usuario cierra o cancela el modal de reserva
- **THEN** el sistema SHALL conservar el estado anterior del prospecto, NO reservar ningún lote, NO dejar la oportunidad de reserva (ni su snapshot) y NO dejar el modal de edición en un estado inconsistente
