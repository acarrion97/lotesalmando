## Purpose

Motor de reglas para alertas automáticas de inventario, seguimiento comercial y morosidad, sin IA generativa.

## ADDED Requirements

### Requirement: Inventory alerts

El sistema SHALL alertar cuando el inventario disponible supere un umbral configurado.

#### Scenario: Inventario alto

- WHEN el número de lotes disponibles supera el umbral configurado
- THEN el sistema SHALL generar alerta de inventario alto

#### Scenario: Inventario dentro del umbral

- WHEN el número de lotes disponibles está dentro del umbral
- THEN el sistema SHALL NO generar alerta de inventario

### Requirement: Follow-up alerts

El sistema SHALL alertar prospectos sin seguimiento mayor a 48 horas.

#### Scenario: Prospecto desatendido

- WHEN un prospecto activo no tiene seguimiento en las últimas 48 horas
- THEN el sistema SHALL generar alerta de seguimiento pendiente

#### Scenario: Prospecto con seguimiento reciente

- WHEN un prospecto tiene seguimiento en las últimas 48 horas
- THEN el sistema SHALL NO generar alerta de seguimiento

### Requirement: Payment alerts

El sistema SHALL alertar cuotas que vencen en los próximos 7 días.

#### Scenario: Cuota próxima a vencer

- WHEN una cuota vence en los próximos 7 días y no está pagada
- THEN el sistema SHALL generar alerta de pago próximo a vencer

### Requirement: Overdue alerts

El sistema SHALL alertar cuotas en mora.

#### Scenario: Cuota en mora

- WHEN una cuota tiene más de 30 días de atraso sin pago
- THEN el sistema SHALL generar alerta de morosidad

### Requirement: Alert display

Las alertas SHALL mostrarse en dashboard y como notificaciones.

#### Scenario: Alerta en dashboard

- WHEN existen alertas activas
- THEN el sistema SHALL mostrarlas en sección de alertas del dashboard con icono, título y fecha

#### Scenario: Notificación

- WHEN se genera una nueva alerta
- THEN el sistema SHALL mostrar notificación in-app al usuario

### Requirement: Alert rules

Las reglas SHALL ser configurables (umbrales, frecuencia).

#### Scenario: Configurar umbral

- WHEN el administrador modifica el umbral de inventario
- THEN el sistema SHALL usar el nuevo umbral para evaluaciones futuras

#### Scenario: Configurar frecuencia

- WHEN el administrador modifica la frecuencia de evaluación
- THEN el sistema SHALL evaluar alertas según la nueva frecuencia

### Requirement: No AI

La primera versión SHALL usar únicamente reglas basadas en datos, no IA generativa.

#### Scenario: Motor de reglas

- WHEN el sistema evalúa alertas
- THEN SHALL usar únicamente lógica condicional basada en datos, sin llamadas a modelos de IA
