## Purpose

Que aceptar una cotización genere la venta y todos sus artefactos de forma confirmada, atómica e idempotente, sin que ninguna escritura pueda dejar una cotización aceptada sin venta asociada.

## ADDED Requirements

### Requirement: La aceptación es una acción confirmada

El estado `aceptada` SHALL alcanzarse únicamente mediante la acción "Aceptar" de la cotización, que abrirá un modal de confirmación mostrando el resumen de la operación y el plan de cuotas. El estado `aceptada` NO SHALL estar disponible en el selector de estado del modal de edición.

#### Scenario: Abrir la confirmación

- **WHEN** el usuario pulsa "Aceptar" en una cotización en estado borrador o enviada
- **THEN** se abre un modal con cliente, lote, precio ofertado, asesor, entrada, número de cuotas y la tabla completa de cuotas, con las acciones "Confirmar" y "Cancelar"

#### Scenario: Cancelar la aceptación

- **WHEN** el usuario cancela el modal de confirmación
- **THEN** la cotización conserva su estado y datos anteriores y no se crea ninguna venta, contrato o cuota

#### Scenario: Estado no seleccionable libremente

- **WHEN** el usuario edita una cotización
- **THEN** el campo estado ofrece borrador, enviada y rechazada, pero no aceptada

### Requirement: Confirmar genera la venta con todos sus artefactos

Al confirmar la aceptación, el sistema SHALL crear la venta, marcar el lote como vendido, registrar el movimiento de inventario, crear el contrato y generar las cuotas de cobranza según el plan de la cotización, reflejando el resultado de inmediato en los módulos de Ventas, Contratos, Cobranzas e Inventario.

#### Scenario: Confirmación exitosa

- **WHEN** el usuario confirma la aceptación de una cotización con precio 62.000, entrada 10.000, 24 cuotas y un asesor asignado
- **THEN** se crea una venta con precio final 62.000, asesor heredado de la cotización y estado completada; el lote pasa a vendido con su registro de inventario; se crea el contrato por 62.000; se generan 24 cuotas de cobranza según el plan; y la cotización queda en aceptada

#### Scenario: Operación atómica

- **WHEN** la operación falla en cualquiera de sus pasos (red, permisos, validación)
- **THEN** no queda ningún artefacto a medias — ni venta sin contrato, ni lote vendido sin venta, ni cuotas huérfanas — y la interfaz muestra el error permitiendo reintentar

#### Scenario: Aceptación repetida

- **WHEN** se intenta aceptar dos veces la misma cotización
- **THEN** solo existe una venta para esa cotización y el segundo intento no genera duplicados

#### Scenario: Reflejo en los módulos

- **WHEN** la aceptación termina correctamente
- **THEN** la venta aparece en Ventas, el contrato en Contratos, las cuotas en Cobranzas y el lote como vendido, sin necesidad de recargar la aplicación

### Requirement: La integridad cotización-venta está garantizada en la base de datos

El sistema SHALL impedir que exista una segunda venta para la misma cotización y SHALL rechazar cualquier escritura que deje una cotización en estado aceptada sin venta asociada, incluso cuando provenga de fuentes distintas al flujo de la aplicación.

#### Scenario: Escritura que salta el flujo

- **WHEN** una cotización pasa a estado aceptada sin venta asociada mediante importación masiva o escritura directa en la base de datos
- **THEN** la escritura es rechazada y la cotización no queda aceptada

#### Scenario: Venta duplicada

- **WHEN** se intenta crear una segunda venta para una cotización que ya tiene venta
- **THEN** la operación es rechazada

#### Scenario: Reparación de cotizaciones inconsistentes

- **WHEN** se aplica este cambio sobre datos que contienen cotizaciones aceptadas sin venta
- **THEN** esas cotizaciones quedan en estado enviada para ser re-aceptadas por el flujo nuevo, y no permanece ninguna cotización aceptada sin venta asociada
