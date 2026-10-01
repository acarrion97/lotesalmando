## Purpose

Registrar ventas directas desde el mapa público con las mismas condiciones de financiamiento y las mismas garantías de integridad que el flujo interno, sin exigirle al visitante más pasos de los necesarios.

## ADDED Requirements

### Requirement: El wizard de venta captura condiciones de financiamiento con valores por defecto

El wizard de venta del mapa público SHALL incluir un paso de financiamiento con la entrada y el número de cuotas, precargados con valores por defecto (entrada igual a 0 y 12 cuotas) que el visitante puede modificar.

#### Scenario: Valores precargados

- **WHEN** el visitante llega al paso de financiamiento del wizard
- **THEN** la entrada aparece en 0 y el número de cuotas en 12, y ambos campos son editables

#### Scenario: Condiciones inválidas

- **WHEN** la entrada es mayor o igual al precio del lote o el número de cuotas es menor que 1
- **THEN** se impide continuar y se muestra el mensaje de error correspondiente

#### Scenario: Plan visible antes de confirmar

- **WHEN** el visitante completa el paso de financiamiento
- **THEN** el resumen del wizard muestra el plan de cuotas calculado con la entrada y el número de cuotas elegidos

### Requirement: La venta del mapa pública es consistente con el flujo interno

Al confirmar la venta desde el mapa público, la cotización creada SHALL quedar en estado aceptada con las condiciones de financiamiento capturadas y sin asesor, y SHALL generar la venta, el contrato y las cuotas con las mismas garantías de atomicidad e integridad que el flujo interno.

#### Scenario: Confirmación con condiciones

- **WHEN** el visitante confirma la compra de un lote de 60.000 con entrada 5.000 y 12 cuotas
- **THEN** se crea la cotización en aceptada con esas condiciones, la venta con precio final 60.000, el contrato, las 12 cuotas del plan, el lote como vendido y su registro de inventario

#### Scenario: Asesor vacío

- **WHEN** la venta se origina en el mapa público
- **THEN** la cotización y la venta quedan sin asesor, y las pantallas lo muestran como "Sin asesor"

#### Scenario: Fallo parcial

- **WHEN** la operación falla en cualquiera de sus pasos
- **THEN** no queda la cotización aceptada sin venta ni ningún otro artefacto a medias, y se muestra el error al visitante
