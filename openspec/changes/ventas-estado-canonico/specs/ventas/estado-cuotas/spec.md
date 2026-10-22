## ADDED Requirements

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

- **WHEN** una venta está cancelada pero su estado está escrito con mayúsculas, espacios o otra variante equivalente
- **THEN** el sistema SHALL reconocerla como cancelada y SHALL no recalcular su estado por las cuotas

#### Scenario: Corrección de datos existentes

- **WHEN** se aplica la corrección de estados sobre las ventas ya registradas
- **THEN** ninguna venta quedará con un estado fuera de catálogo, y las que tenían cuotas quedarán con el estado que corresponda a su cobro real
