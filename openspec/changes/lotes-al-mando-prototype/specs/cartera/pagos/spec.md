## Purpose

Seguimiento de pagos, cuotas y morosidad con estados financieros y métricas de cartera.

## ADDED Requirements

### Requirement: Payment plan

Los contratos SHALL tener plan de pagos con cuotas.

#### Scenario: Plan generado

- WHEN se crea un contrato
- THEN el sistema SHALL generar plan de pagos con 12 cuotas equitativas

### Requirement: Payment status

Las cuotas SHALL tener estados: al día, próximo a vencer, vencido, en mora, pagado.

#### Scenario: Estado inicial

- WHEN se genera una cuota
- THEN su estado SHALL ser "próximo a vencer" si falta más de 7 días para vencimiento

#### Scenario: Estado al día

- WHEN la cuota vence en más de 7 días
- THEN el sistema SHALL mostrar estado "al día"

#### Scenario: Estado vencido

- WHEN la cuota está vencida y tiene menos de 30 días de atraso
- THEN el sistema SHALL mostrar estado "vencido"

#### Scenario: Estado en mora

- WHEN la cuota tiene más de 30 días de atraso
- THEN el sistema SHALL mostrar estado "en mora"

#### Scenario: Estado pagado

- WHEN la cuota ha sido pagada completamente
- THEN el sistema SHALL mostrar estado "pagado"

### Requirement: Payment registration

El sistema SHALL permitir registrar pagos contra cuotas.

#### Scenario: Pago parcial

- WHEN el usuario registra un pago parcial contra una cuota
- THEN el sistema SHALL descontar el monto pagado del saldo pendiente

#### Scenario: Pago total

- WHEN el usuario registra un pago que cubre el saldo completo de la cuota
- THEN el sistema SHALL marcar la cuota como "pagado"

### Requirement: Balance calculation

El sistema SHALL calcular saldo pendiente por contrato.

#### Scenario: Cálculo de saldo

- WHEN el usuario consulta un contrato
- THEN el sistema SHALL calcular: total pagado, saldo pendiente, cuotas restantes

### Requirement: Overdue detection

El sistema SHALL detectar cuotas vencidas automáticamente.

#### Scenario: Detección automática

- WHEN la fecha actual supera la fecha de vencimiento de una cuota no pagada
- THEN el sistema SHALL actualizar el estado a "vencido" o "en mora" según los días de atraso

### Requirement: Portfolio metrics

El sistema SHALL calcular métricas de cartera: cartera total, cartera vencida, morosidad %.

#### Scenario: Métricas consolidadas

- WHEN el usuario solicita métricas de cartera
- THEN el sistema SHALL calcular:
  - Cartera total (suma de saldos pendientes)
  - Cartera vencida (suma de cuotas vencidas + en mora)
  - Morosidad % (cartera vencida / cartera total × 100)

### Requirement: Client risk

El sistema SHALL identificar clientes en riesgo por morosidad.

#### Scenario: Detección de riesgo

- WHEN un cliente tiene cuotas en mora
- THEN el sistema SHALL marcar al cliente como "en riesgo" y mostrar alerta
