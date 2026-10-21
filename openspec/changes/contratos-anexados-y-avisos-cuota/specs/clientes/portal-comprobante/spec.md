# Spec Delta

## Purpose

Dar al cliente que compró un lote una forma de consultar sus cuotas y enviar la
prueba de pago sin cuenta ni sesión, y al asesor de revisarla.

## ADDED Requirements

### Requirement: Consulta del portal con la cédula
El sistema SHALL exponer una página pública que, ingresando únicamente el
número de cédula o RUC del cliente, muestre sus contratos con el lote, el
proyecto y todas sus cuotas con su estado y el estado de su último comprobante.
No SHALL exigir registro ni sesión.

#### Scenario: Cédula existente
- **WHEN** se consulta una cédula que tiene contratos
- **THEN** se listan sus contratos y cuotas con estado y comprobante

#### Scenario: Cédula inexistente
- **WHEN** se consulta una cédula sin contratos
- **THEN** se informa que no se encontró ninguna cuenta con esa identificación

### Requirement: Envío del comprobante de pago
El sistema SHALL permitir desde el portal adjuntar la imagen (PNG, JPG o WEBP)
o el PDF del comprobante e indicar el monto pagado, hasta 10 MB, asociándolo a
la cuota elegida.

#### Scenario: Comprobante válido
- **WHEN** el cliente adjunta un archivo válido, indica el monto y envía
- **THEN** el comprobante queda registrado en estado `pendiente` y el portal
  muestra "Comprobante enviado"

#### Scenario: Datos incompletos
- **WHEN** falta el archivo o el monto no es mayor a cero
- **THEN** se muestra el motivo y no se registra nada

#### Scenario: El comprobante pertenece a otra cuota
- **WHEN** se intenta registrar sobre una cuota que no le pertenece a esa cédula
- **THEN** la operación se rechaza y el archivo recién subido se borra

### Requirement: La cuota no cambia de estado sola
El envío de un comprobante SHALL dejar la cuota en su estado actual: solo una
decisión del equipo puede pasarla a `pagada`.

#### Scenario: Envío sobre una cuota vencida
- **WHEN** el cliente envía el comprobante de una cuota vencida
- **THEN** la cuota sigue vencida y el comprobante queda en revisión

### Requirement: Revisión por el equipo
El sistema SHALL mostrar los comprobantes del cliente en el módulo Clientes
(Deudas) y en Cobranzas, con su estado; el asesor SHALL poder ver el archivo,
aprobarlo o rechazarlo indicando el motivo.

#### Scenario: Comprobante aprobado
- **WHEN** el asesor aprueba un comprobante pendiente
- **THEN** se registra el pago con el monto declarado, la cuota pasa a
  `pagada` y el comprobante queda `aprobado`

#### Scenario: Comprobante rechazado
- **WHEN** el asesor lo rechaza con motivo
- **THEN** el comprobante queda `rechazado`, la cuota no cambia y el motivo se
  ve en el portal del cliente

#### Scenario: Cuota ya pagada
- **WHEN** se intenta aprobar un comprobante de una cuota que ya está pagada
- **THEN** se informa que la cuota ya figura como pagada

#### Scenario: Empresa con más de 1000 cuotas
- **WHEN** la empresa tiene más cuotas de las que PostgREST devuelve en una
  sola respuesta (tope de 1000 filas)
- **THEN** en Clientes → Deudas y en Cobranzas se listan también los
  comprobantes de las cuotas fuera de ese primer corte, sin perder pagos ni
  cuotas por el mismo motivo

### Requirement: Los archivos del portal son privados
Los comprobantes subidos desde el portal SHALL guardarse en un bucket privado:
el visitante solo puede subir a la carpeta de su cuota y la lectura del archivo
es exclusiva de la sesión autenticada.

#### Scenario: Lectura sin sesión
- **WHEN** se intenta leer el objeto de un comprobante sin sesión
- **THEN** no es posible

### Requirement: Aviso del resultado al cliente
Al aprobar o rechazar un comprobante, el sistema SHALL enviar un correo al
cliente con el resultado: si fue aprobado, con el monto registrado y la cuota
pagada; si fue rechazado, con el motivo escrito por el asesor y la invitación a
reenviarlo desde el portal. El envío SHALL estar reservado a quien revisa con
una sesión iniciada en la plataforma.

#### Scenario: Comprobante aprobado
- **WHEN** el asesor aprueba el comprobante y su sesión pertenece a la misma
  empresa que el cliente
- **THEN** el cliente recibe un correo con el resultado aprobado

#### Scenario: Comprobante rechazado
- **WHEN** el asesor lo rechaza con motivo
- **THEN** el cliente recibe un correo con el motivo y con cómo reenviarlo

#### Scenario: Llamada sin sesión o de otra empresa
- **WHEN** se pide el aviso sin token válido o desde una empresa distinta a la
  del cliente
- **THEN** la operación se rechaza y no se envía nada

### Requirement: El portal queda enlazado desde Clientes
El módulo Clientes SHALL ofrecer un botón que copie y abra el link del portal
para dárselo al cliente.

#### Scenario: Copiar el link
- **WHEN** el usuario hace clic en "Portal del cliente"
- **THEN** el link se copia al portapapeles y se abre en una pestaña nueva
