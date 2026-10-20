## Purpose

Teléfono como dato de contacto del cliente, disponible en su alta desde cualquier flujo y en la ficha del módulo de Clientes.

## ADDED Requirements

### Requirement: Teléfono del cliente

El cliente SHALL poder tener teléfono, y el campo SHALL estar disponible al crearlo y al editarlo.

#### Scenario: Alta con teléfono

- **WHEN** se crea un cliente con teléfono
- **THEN** el sistema SHALL persistirlo junto a nombres, cédula/RUC y email

#### Scenario: Alta sin teléfono

- **WHEN** se crea un cliente sin teléfono
- **THEN** el sistema SHALL permitirlo y almacenarlo como vacío

#### Scenario: Edición del teléfono

- **WHEN** el usuario modifica el teléfono de un cliente existente
- **THEN** el sistema SHALL actualizar el valor sin afectar los demás datos

### Requirement: Teléfono visible en el módulo de Clientes

El listado y la vista detalle de Clientes SHALL mostrar el teléfono del cliente.

#### Scenario: Ver detalle

- **WHEN** el usuario abre el detalle de un cliente con teléfono
- **THEN** el sistema SHALL mostrar el teléfono junto a los demás datos de contacto

#### Scenario: Cliente sin teléfono

- **WHEN** el cliente no tiene teléfono
- **THEN** el sistema SHALL mostrar un marcador de ausencia de dato en lugar de un valor vacío confuso
