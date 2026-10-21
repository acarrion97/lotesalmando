# Spec Delta

## Purpose

Avisar automáticamente por correo al cliente que compró un lote cuando su cuota
está por vencer o ya venció, sin repetir el mismo aviso.

## ADDED Requirements

### Requirement: El sistema marca las cuotas vencidas
Un proceso diario SHALL pasar a estado `vencida` toda cuota en estado
`pendiente` cuya fecha de vencimiento ya pasó, antes de calcular a quién avisar.

#### Scenario: Cuota con fecha pasada
- **WHEN** corre el proceso diario y existe una cuota pendiente con fecha de
  vencimiento anterior al día de hoy
- **THEN** esa cuota queda en estado `vencida`

#### Scenario: Cuota al día
- **WHEN** corre el proceso diario y una cuota pendiente vence en el futuro
- **THEN** su estado no cambia

### Requirement: Aviso de cuota por vencer
El sistema SHALL enviar un correo al cliente cuando su cuota vence dentro del
plazo de anticipación configurado, incluyendo número de contrato, lote, número
de cuota, monto con la moneda de la empresa, fecha de vencimiento y el link al
portal del cliente.

#### Scenario: Cuota que vence en tres días
- **WHEN** el proceso encuentra una cuota pendiente que vence dentro del plazo
  y el cliente tiene correo cargado
- **THEN** se envía el aviso "por vencer" con esos datos

#### Scenario: Falta el correo del cliente
- **WHEN** el cliente no tiene correo
- **THEN** no se envía nada y el cliente queda marcado como sin correo en el
  listado de Clientes para que se complete el dato

### Requirement: Aviso de cuota vencida
El sistema SHALL enviar un correo al cliente cuya cuota ya está en estado
`vencida`, con el mismo contenido y la indicación de regularizar el pago desde
el portal.

#### Scenario: Cuota vencida sin comprobante
- **WHEN** el proceso encuentra una cuota vencida que no tiene comprobante
- **THEN** se envía el aviso de cuota vencida

#### Scenario: Cuota vencida con comprobante en revisión
- **WHEN** el cliente ya subió un comprobante (pendiente o aprobado)
- **THEN** no se le envía el aviso de cuota vencida

### Requirement: Un solo aviso por cuota y tipo
El sistema SHALL registrar cada aviso enviado para no repetirlo: como máximo se
enviará un correo "por vencer" y uno "vencida" por cuota, aunque el proceso corra
todos los días.

#### Scenario: Ejecuciones consecutivas
- **WHEN** el proceso corre dos días seguidos con la misma cuota por vencer
- **THEN** el correo se envía solo la primera vez

#### Scenario: Transición de por vencer a vencida
- **WHEN** la misma cuota pasa de por vencer a vencida
- **THEN** se envía el segundo aviso, que es de otro tipo

### Requirement: El aviso se dispara con un cron protegido
El proceso SHALL ejecutarse desde el cron del servidor con un secreto
compartido; las llamadas sin ese secreto SHALL rechazarse. Si faltan las
credenciales de correo, el proceso SHALL seguir funcionando sin enviar nada.

#### Scenario: Llamada sin secreto
- **WHEN** se llama al endpoint del cron con una autorización distinta al
  secreto configurado
- **THEN** responde 401 y no hace cambios

#### Scenario: Correo sin configurar
- **WHEN** faltan las credenciales de envío
- **THEN** el proceso responde con los avisos omitidos y no falla

### Requirement: Los avisos se reflejan en la plataforma
El sistema SHALL generar una alerta de tipo comprobante cuando hay comprobantes
esperando revisión, para que el equipo los vea junto al resto de las alertas.

#### Scenario: Comprobantes pendientes
- **WHEN** existen comprobantes en estado `pendiente` de la empresa
- **THEN** aparece la alerta "Comprobantes por revisar" con cliente, cuota y monto
