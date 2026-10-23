# Spec Delta

## Purpose

Permitir que un prospecto envíe desde un portal público, identificándose con su email, la documentación legal requerida para concretar la venta de un lote, y que el asesor la revise en el backoffice con trazabilidad de estados y aviso por correo cuando llega documentación nueva.

## ADDED Requirements

### Requirement: Acceso público al portal sin sesión

El sistema SHALL exponer un portal público `/portal-prospecto` que no requiera autenticación y que identifique al prospecto por su email.

#### Scenario: Email de un prospecto existente

- **WHEN** el prospecto ingresa un email que ya existe en el CRM
- **THEN** el sistema SHALL mostrar sus datos de contacto junto a la checklist de documentación y el estado de cada documento enviado previamente

#### Scenario: Email desconocido

- **WHEN** el prospecto ingresa un email que no existe en el CRM
- **THEN** el sistema SHALL pedirle los datos mínimos para darse de alta (nombres y teléfono) antes de permitir el envío de documentos

#### Scenario: Email inválido

- **WHEN** el email ingresado no tiene un formato válido
- **THEN** el sistema SHALL impedir la consulta y mostrar un mensaje de error

### Requirement: Checklist de documentación legal

El portal SHALL mostrar la lista de documentos legalmente necesarios para la venta de un lote (cédula de identidad, comprobante de domicilio, RUC o certificado de constitución según aplique, y comprobante de ingresos), indicando para cada uno su estado: pendiente de enviar, en revisión, aprobado o rechazado.

#### Scenario: Prospecto sin documentos enviados

- **WHEN** el prospecto accede por primera vez
- **THEN** el sistema SHALL listar todos los documentos requeridos como pendientes de enviar

#### Scenario: Documentos ya en revisión o revisados

- **WHEN** el prospecto vuelve a entrar después de haber enviado documentos
- **THEN** el sistema SHALL mostrar el estado actual de cada documento, incluyendo la observación cuando esté rechazado

### Requirement: Envío de documentos con validación de archivos

El portal SHALL permitir subir cada documento como imagen (PNG, JPEG, WEBP) o PDF con un límite de 10 MB por archivo, y SHALL registrar cada envío en estado `pendiente`.

#### Scenario: Archivo válido

- **WHEN** el prospecto sube un archivo dentro de los tipos y tamaño permitidos
- **THEN** el sistema SHALL almacenarlo de forma privada y registrar el documento en estado `pendiente`, mostrándolo como "en revisión"

#### Scenario: Archivo inválido o demasiado grande

- **WHEN** el archivo excede 10 MB o su tipo no está permitido
- **THEN** el sistema SHALL rechazar la carga sin registrar nada y mostrar el motivo

#### Scenario: Fallo al registrar el envío

- **WHEN** el registro del documento falla después de subir el archivo
- **THEN** el sistema SHALL eliminar el archivo subido (sin dejar huérfanos) y mostrar un mensaje de error que permita reintentar

### Requirement: Alta o actualización del prospecto en el CRM

El primer envío SHALL crear el prospecto en el CRM con los datos del portal (email, nombres, teléfono) y origen `portal`, o SHALL reutilizar el existente si el email ya está registrado, sin crear duplicados.

#### Scenario: Primer envío con email nuevo

- **WHEN** el prospecto envía su primer documento con un email no registrado
- **THEN** el sistema SHALL crear el registro de prospecto con los datos proporcionados y origen `portal`

#### Scenario: Email ya registrado

- **WHEN** el prospecto envía documentos con un email que ya existe
- **THEN** el sistema SHALL asociar los documentos a ese prospecto existente sin crear un duplicado

### Requirement: Revisión de la documentación en el backoffice

El sistema SHALL permitir a un usuario con permiso revisar, desde el módulo de Prospectos, cada documento enviado y aprobarlo o rechazarlo; el rechazo SHALL exigir una observación. Tras la revisión, el estado SHALL quedar visible para el prospecto en el portal.

#### Scenario: Aprobación

- **WHEN** el revisor aprueba un documento
- **THEN** el sistema SHALL marcarlo `aprobado`, registrar quién lo revisó y cuándo, y el prospecto verá ese estado al volver al portal

#### Scenario: Rechazo sin observación

- **WHEN** el revisor intenta rechazar sin escribir una observación
- **THEN** el sistema SHALL impedir el rechazo y pedir la observación

#### Scenario: Rechazo con observación

- **WHEN** el revisor rechaza un documento con observación
- **THEN** el sistema SHALL marcarlo `rechazado` con la observación, y el prospecto la verá en el portal para poder reenviar el documento

#### Scenario: Sin permiso de revisión

- **WHEN** un usuario sin permiso de revisión intenta revisar documentos
- **THEN** el sistema SHALL denegar la acción

### Requirement: Aviso por correo al asesor

Cuando un prospecto envía documentación nueva, el sistema SHALL enviar un correo electrónico de aviso al asesor responsable del prospecto (o al correo administrativo de la empresa si no tiene asesor), sin enviar correos al prospecto. El aviso SHALL ser idempotente: como máximo un correo por prospecto por día.

#### Scenario: Envío de documentación nueva

- **WHEN** el prospecto registra al menos un documento nuevo
- **THEN** el sistema SHALL enviar un correo al asesor con el nombre del prospecto y los documentos recibidos

#### Scenario: Varios envíos en el mismo día

- **WHEN** el mismo prospecto envía más documentos el mismo día después del primer aviso
- **THEN** el sistema SHALL NO enviar correos adicionales ese día

#### Scenario: Sin credenciales de correo

- **WHEN** faltan las credenciales SMTP en el entorno
- **THEN** el sistema SHALL omitir el correo sin bloquear el envío de documentos

### Requirement: Seguridad de la documentación

Los archivos de los prospectos SHALL almacenarse en un bucket privado: solo el dueño del email (vía RPCs que validan la pertenencia) podrá consultar sus documentos, y el acceso anónimo de escritura SHALL limitarse a la carpeta del propio prospecto.

#### Scenario: Consulta con email ajeno

- **WHEN** se consulta la documentación con un email distinto al registrado en los documentos
- **THEN** el sistema SHALL devolver únicamente los documentos de ese email y nunca los de otro prospecto

#### Scenario: Escritura anónima fuera de la carpeta permitida

- **WHEN** el cliente intenta subir un archivo fuera de la carpeta `prospecto-<id>` que le corresponde
- **THEN** la política de almacenamiento SHALL denegar la operación
