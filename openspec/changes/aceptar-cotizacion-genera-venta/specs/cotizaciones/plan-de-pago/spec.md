## Purpose

Registrar y mostrar en una cotización las condiciones de financiamiento que se ofrecen al cliente: el asesor que la realizó, el valor de la entrada, el número de cuotas y la tabla resultante de cuotas con sus fechas e importes.

## ADDED Requirements

### Requirement: La cotización registra el asesor que la realizó

Toda cotización creada por un asesor SHALL quedar asociada a ese asesor. El asesor SHALL ser anulable únicamente cuando la venta no la registra un asesor (por ejemplo, ventas originadas en el mapa público o registradas por un administrador).

#### Scenario: Cotización creada por un asesor

- **WHEN** un asesor con sesión activa crea una cotización
- **THEN** la cotización guarda el asesor correspondiente y este se muestra en la lista y en el detalle

#### Scenario: Cotización sin asesor

- **WHEN** la cotización se origina fuera del flujo de un asesor (mapa público o administrador sin asesor asignado)
- **THEN** el campo de asesor queda vacío y la interfaz lo muestra como "Sin asesor" sin bloquear el guardado

### Requirement: La cotización registra la entrada y el número de cuotas

La cotización SHALL guardar el valor de la entrada y el número de cuotas ofrecidos al cliente, capturados al crear o editar la cotización, y SHALL impedir guardar condiciones inválidas.

#### Scenario: Creación con condiciones de financiamiento

- **WHEN** se crea una cotización con precio 62.000, entrada 10.000 y 24 cuotas
- **THEN** la cotización queda almacenada con esos valores y aparecen en su detalle

#### Scenario: Entrada inválida

- **WHEN** la entrada es mayor o igual al precio ofertado, o el número de cuotas es menor que 1
- **THEN** se impide guardar y se muestra un mensaje que indica el valor aceptado

#### Scenario: Edición de condiciones

- **WHEN** se editan la entrada o el número de cuotas de una cotización que todavía no ha sido aceptada
- **THEN** los nuevos valores quedan guardados y el plan de cuotas se recalcula en consecuencia

### Requirement: El plan de cuotas es calculado y visible

El sistema SHALL calcular el plan de cuotas de la cotización y mostrarlo completo en la interfaz. El plan no aplicará intereses ni cargos financiero: el monto a financiar es el precio ofertado menos la entrada, la cuota es el monto financiado dividido en el número de cuotas redondeado hacia arriba, la última cuota absorbe la diferencia de redondeo y la primera cuota vence un mes después de la aceptación.

#### Scenario: Cálculo del plan

- **WHEN** se calcula el plan de una cotización con precio 62.000, entrada 10.000 y 24 cuotas
- **THEN** el monto financiado es 52.000, cada cuota es 2.167, la última cuota absorbe la diferencia para que la suma exacta de las cuotas sea 52.000, y cada cuota vence el mismo día del mes contado desde la fecha de aceptación (recortando el día si el mes de vencimiento no lo tiene)

#### Scenario: Plan visible en el detalle de la cotización

- **WHEN** se abre el detalle de una cotización
- **THEN** se muestra la tabla completa de cuotas con número, fecha de vencimiento e importe, junto con la entrada y el número de cuotas

#### Scenario: Plan visible antes de crear la cotización

- **WHEN** se avanza al paso de confirmación del formulario de nueva cotización
- **THEN** el resumen muestra el plan de cuotas calculado con los datos ingresados

#### Scenario: Cambio de precio o de cuotas

- **WHEN** cambia el precio ofertado, la entrada o el número de cuotas
- **THEN** el plan mostrado se recalcula de inmediato con los nuevos datos
