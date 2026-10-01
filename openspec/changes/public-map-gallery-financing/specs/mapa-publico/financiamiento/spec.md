## Purpose

Permite que un visitante del enlace público simule el financiamiento de un lote (enganche, plazo y tasa) y consulte datos informativos del proyecto y del lote elegido, todo dentro de `/mapa/:slug`.

## ADDED Requirements

### Requirement: Calculadora de financiamiento de lote
La pestaña Financiamiento SHALL mostrar una calculadora con precio del lote, enganche (%), plazo en meses y tasa de interés anual (%), y SHALL calcular en pantalla el monto financiado, la cuota mensual, el total de intereses y el total a pagar. Los resultados SHALL actualizarse de inmediato cuando cambie cualquiera de los valores.

#### Scenario: Cálculo con parámetros del visitante
- **WHEN** el visitante ingresa un precio de 30.000, enganche 30 %, plazo 60 meses y tasa anual 12 %
- **THEN** el monto financiado es 21.000, la cuota mensual se calcula con interés mensual sobre ese saldo y el total a pagar suma el enganche más todas las cuotas

#### Scenario: Cambio de plazo
- **WHEN** el visitante reduce el plazo de 60 a 36 meses manteniendo el resto
- **THEN** la cuota mensual sube y el total de intereses baja, recalculados al instante

#### Scenario: Tasa cero
- **WHEN** la tasa anual es 0 %
- **THEN** la cuota mensual es el monto financiado dividido entre el número de meses y no se generan intereses

### Requirement: Selección de un lote para prellenar la calculadora
La calculadora SHALL permitir elegir un lote del proyecto; al elegirlo (o al abrir su ficha desde el mapa) el precio del lote SHALL prellenar el campo de precio, y se SHALL mostrar la identidad del lote elegido (manzana, número y estado). Elegir un lote es el único momento en que el enlace público revela su precio.

#### Scenario: Elegir un lote
- **WHEN** el visitante selecciona un lote en la calculadora
- **THEN** el precio se carga con el precio de lista de ese lote, se identifica el lote elegido y los resultados se recalculan

#### Scenario: Precio editable después de elegir
- **WHEN** el visitante modifica manualmente el precio después de haber elegido un lote
- **THEN** la calculadora usa el precio escrito y marca que ya no coincide con el precio de lista

#### Scenario: Sin lote elegido
- **WHEN** el visitante todavía no ha elegido un lote
- **THEN** la calculadora parte de un precio en cero y muestra un aviso pidiendo elegir un lote o escribir un precio

### Requirement: Valores fuera de rango
El sistema SHALL validar los parámetros: enganche entre 0 y 100 %, plazo de 1 a 360 meses y tasa no negativa. Con valores inválidos SHALL mostrar un aviso y no calcular resultados engañosos.

#### Scenario: Enganche mayor al 100 %
- **WHEN** el visitante escribe un enganche mayor a 100 %
- **THEN** se muestra un aviso, el enganche no se aplica al cálculo y los resultados no se muestran como válidos

#### Scenario: Plazo vacío
- **WHEN** el campo de plazo queda vacío
- **THEN** se muestra un aviso y la calculadora no muestra cuota mensual

### Requirement: Datos informativos del proyecto y del lote
La pestaña Financiamiento SHALL mostrar datos informativos del proyecto (nombre, total de lotes y conteo de lotes disponibles, reservados y vendidos) y, cuando hay un lote elegido, sus datos (manzana, número, estado y precio de lista), junto con un enlace para verlo en el mapa.

#### Scenario: Resumen del proyecto
- **WHEN** el visitante abre la pestaña Financiamiento
- **THEN** se muestran el nombre del proyecto y los conteos por estado, sin listar clientes ni datos comerciales internos

#### Scenario: Ir al lote en el mapa
- **WHEN** el visitante pulsa el enlace del lote elegido
- **THEN** se cambia a la pestaña Mapa y se abre la ficha de ese lote

### Requirement: Formato y divisa de los importes
Los importes SHALL mostrarse con separadores de miles y decimales según la moneda configurada por la empresa en Configuración; si la empresa no tiene moneda configurada SHALL usarse el dólar estadounidense.

#### Scenario: Moneda de la empresa
- **WHEN** la empresa tiene configurada la moneda COP
- **THEN** todos los importes de la calculadora y de la ficha se muestran en pesos colombianos

#### Scenario: Sin moneda configurada
- **WHEN** la empresa no tiene registro de configuración
- **THEN** los importes se muestran en dólares estadounidenses
