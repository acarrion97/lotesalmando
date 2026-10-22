# ventas/estado-cuotas Specification

## Purpose

El estado de una venta refleja el cobro real de su plan de cuotas: nace `pendiente` al vender y pasa a `completada` recién cuando todas sus cuotas están pagadas. Así `ventas.estado` deja de ser un literal que nadie mantiene y se convierte en un dato derivado confiable.

## Requirements

### Requirement: La venta nace pendiente

Al registrar la venta (aceptación de la cotización), el sistema SHALL crearla en estado `pendiente`, sin importar que el lote pase a `vendido`.

#### Scenario: Venta creada al aceptar la cotización

- **WHEN** se acepta una cotización con entrada y plan de cuotas válidos
- **THEN** la venta SHALL crearse en estado `pendiente`, el lote SHALL quedar `vendido` con su movimiento de inventario, la cotización SHALL quedar `aceptada` y el plan de cuotas SHALL generarse todas las cuotas en `pendiente`

#### Scenario: Venta creada en modo mock

- **WHEN** la misma aceptación se ejecuta con el proveedor de datos en modo mock
- **THEN** la venta SHALL crearse en estado `pendiente`, con el mismo contrato y plan de cuotas

### Requirement: Completada solo con todas las cuotas pagadas

El estado de una venta SHALL derivarse de su plan de cuotas: `completada` cuando todas sus cuotas estén `pagada`, y `pendiente` mientras falte alguna. El recálculo SHALL ocurrir ante cualquier alta, baja o cambio de cuota.

#### Scenario: Se paga la última cuota pendiente

- **WHEN** se marca `pagada` la última cuota de la venta que faltaba
- **THEN** la venta SHALL pasar a estado `completada`

#### Scenario: Queda alguna cuota sin pagar

- **WHEN** la venta tiene al menos una cuota distinta de `pagada`
- **THEN** la venta SHALL quedar en estado `pendiente`

#### Scenario: Se aprueba un comprobante de una cuota

- **WHEN** se aprueba un comprobante que marca una cuota como `pagada`
- **THEN** la venta SHALL recalcular su estado por el mismo criterio, sin que el caso de uso de comprobantes tenga que conocer `ventas.estado`

#### Scenario: Se agrega o elimina una cuota

- **WHEN** se da de alta o se elimina una cuota de una venta
- **THEN** el sistema SHALL recalcular el estado de esa venta

#### Scenario: Venta sin cuotas

- **WHEN** una venta no tiene ninguna cuota asociada
- **THEN** el sistema SHALL mantener su estado sin modificarlo, al no existir información para evaluarlo

### Requirement: Las ventas canceladas no se modifican

El sistema SHALL mantener el estado `cancelada` de las ventas, sin recalcularlo por el estado de sus cuotas.

#### Scenario: Cuotas impagas de una venta cancelada

- **WHEN** una venta está `cancelada` y alguna de sus cuotas deja de estar `pagada`
- **THEN** la venta SHALL permanecer en estado `cancelada`

### Requirement: Consistencia del estado histórico

Una venta en estado `completada` SHALL tener todas sus cuotas `pagada`. Las ventas ya registradas con cuotas sin pagar SHALL corregirse a `pendiente`.

#### Scenario: Ventas existentes con cuotas impagas

- **WHEN** se aplica la corrección de datos sobre las ventas ya registradas
- **THEN** ninguna venta `completada` SHALL quedar con cuotas sin pagar

#### Scenario: Corrección repetida

- **WHEN** la corrección se ejecuta más de una vez
- **THEN** SHALL modificar únicamente las ventas que incumplen el criterio y SHALL no alterar cuotas ni ventas `cancelada`

### Requirement: Los estados fuera de catálogo no rompen el ciclo de estados

Mientras `ventas.estado` no tenga una restricción en base de datos, el sistema SHALL tolerar que un valor se registre fuera del catálogo, y SHALL normalizarlo al valor canónico sin que quede excluido del recálculo, de las estadísticas ni de los filtros.

#### Scenario: Estado fuera de catálogo con cuotas

- **WHEN** una venta tiene un estado escrito fuera del catálogo (p. ej. `completa`, `confirmada` o con mayúsculas) y tiene cuotas asociadas
- **THEN** el sistema SHALL reemplazar su estado por el que corresponda según el cobro de sus cuotas (`completada` si todas están pagadas, `pendiente` en caso contrario), ya sea al corregir los datos o ante el próximo cambio de alguna de sus cuotas

#### Scenario: Estado fuera de catálogo en ventas sin cuotas

- **WHEN** una venta no tiene ninguna cuota y su estado es una variante conocida del catálogo (p. ej. `completa`, `confirmada`)
- **THEN** el sistema SHALL corregirle únicamente la ortografía, sin imponerle un estado derivado que no pueda evaluarse

#### Scenario: Valor desconocido sin cuotas

- **WHEN** una venta sin cuotas tiene un estado que no corresponde a ninguna variante conocida
- **THEN** el sistema SHALL conservar ese valor sin modificarlo, y el módulo de Ventas SHALL mostrarlo sin romper el render

#### Scenario: Venta cancelada con otra ortografía

- **WHEN** una venta está cancelada pero su estado está escrito con mayúsculas, espacios u otra variante equivalente
- **THEN** el sistema SHALL reconocerla como cancelada y SHALL no recalcular su estado por las cuotas

#### Scenario: Corrección de datos existentes

- **WHEN** se aplica la corrección de estados sobre las ventas ya registradas
- **THEN** ninguna venta quedará con un estado fuera de catálogo, y las que tenían cuotas quedarán con el estado que corresponda a su cobro real
