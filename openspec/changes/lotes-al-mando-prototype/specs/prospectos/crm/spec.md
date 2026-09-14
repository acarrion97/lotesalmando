## Purpose

Gestión de prospectos, seguimiento comercial, pipeline y oportunidades de venta.

## ADDED Requirements

### Requirement: Prospect CRUD

El sistema SHALL permitir registrar, editar y listar prospectos.

#### Scenario: Crear prospecto

- WHEN el usuario registra un prospecto con nombre, teléfono y email
- THEN el sistema SHALL persistir el prospecto con fecha de creación

#### Scenario: Editar prospecto

- WHEN el usuario edita datos de un prospecto
- THEN el sistema SHALL actualizar los campos modificados

#### Scenario: Listar prospectos

- WHEN el usuario solicita el listado de prospectos
- THEN el sistema SHALL retornar los prospectos de la empresa activa

### Requirement: Prospect source

Cada prospecto SHALL tener origen (referido, publicidad, walk-in, etc.).

#### Scenario: Asignación de origen

- WHEN se crea un prospecto
- THEN el sistema SHALL exigir selección de origen válido

### Requirement: Follow-up tracking

El sistema SHALL registrar actividades de seguimiento con fecha, tipo y notas.

#### Scenario: Registrar seguimiento

- WHEN el usuario registra una actividad de seguimiento
- THEN el sistema SHALL persistir fecha, tipo (llamada, visita, email, WhatsApp) y notas

#### Scenario: Historial de seguimiento

- WHEN el usuario consulta un prospecto
- THEN el sistema SHALL mostrar historial cronológico de seguimientos

### Requirement: Pipeline stages

Las oportunidades SHALL tener etapas: contactado, interesado, negociación, reserva, perdido.

#### Scenario: Avance de etapa

- WHEN se mueve una oportunidad a la siguiente etapa
- THEN el sistema SHALL actualizar la etapa y registrar fecha de cambio

#### Scenario: Oportunidad perdida

- WHEN se marca una oportunidad como perdida
- THEN el sistema SHALL registrar motivo y fecha de pérdida

### Requirement: Opportunity management

El sistema SHALL permitir crear oportunidades vinculando prospecto + lote.

#### Scenario: Crear oportunidad

- WHEN el usuario crea una oportunidad con prospecto y lote válidos
- THEN el sistema SHALL persistir la oportunidad en etapa "contactado"

#### Scenario: Prospecto sin oportunidad

- WHEN un prospecto no tiene oportunidades activas
- THEN el sistema SHALL permitir crear nueva oportunidad para dicho prospecto

### Requirement: Stale alert

El sistema SHALL alertar prospectos sin seguimiento mayor a 48 horas.

#### Scenario: Prospecto sin seguimiento reciente

- WHEN un prospecto no tiene seguimiento en las últimas 48 horas
- THEN el sistema SHALL marcar alerta de seguimiento pendiente

#### Scenario: Prospecto con seguimiento reciente

- WHEN un prospecto tiene seguimiento en las últimas 48 horas
- THEN el sistema SHALL NO mostrar alerta de seguimiento

### Requirement: Conversion metrics

El sistema SHALL calcular tasa de conversión del pipeline.

#### Scenario: Cálculo de conversión

- WHEN el usuario solicita métricas del pipeline
- THEN el sistema SHALL calcular: total oportunidades, conversiones, tasa de conversión (%)
