# Spec Delta

## Purpose

Que cada contrato tenga su documento a mano: se genera con los datos de la
venta o se anexa un archivo propio, se consulta desde el módulo Contratos y se
abre de forma segura.

## ADDED Requirements

### Requirement: El contrato puede tener un documento
El sistema SHALL permitir que un contrato tenga como máximo un documento (PDF o
Word `.docx`), guardado en un almacenamiento privado, y SHALL mostrar en el
listado de Contratos si el contrato tiene documento, de qué tipo es y si fue
generado por la app o anexado por un usuario.

#### Scenario: Contrato sin documento
- **WHEN** se abre el listado de Contratos y un contrato no tiene documento
- **THEN** la columna Documento muestra "Sin documento" y ofrece "Generar o anexar"

#### Scenario: Contrato con documento
- **WHEN** el contrato ya tiene documento
- **THEN** la columna muestra el ícono del tipo, la etiqueta "Generado" o
  "Anexado" y la acción pasa a "Administrar"

### Requirement: Generar el documento con los datos de la venta
El sistema SHALL poder generar el documento del contrato en Word o en PDF
usando únicamente datos ya existentes: contrato, venta, cotización, cliente,
lote, proyecto, empresa y plan de cuotas, y SHALL guardarlo como documento del
contrato reemplazando al anterior.

#### Scenario: Generar un Word
- **WHEN** el usuario elige "Generar Word" en el modal de documento
- **THEN** se crea el archivo con los datos de esa venta, se anexa al contrato
  y la etiqueta pasa a "Generado"

#### Scenario: Falta un dato
- **WHEN** el contrato no existe o la venta asociada no tiene cliente
- **THEN** el sistema informa el motivo y el contrato conserva su documento anterior

### Requirement: Anexar un documento propio
El sistema SHALL permitir anexar un archivo propio (PDF o `.docx`, hasta 10 MB)
al contrato, reemplazando al documento anterior y borrando el archivo viejo.

#### Scenario: Anexar un archivo válido
- **WHEN** el usuario sube un PDF o Word dentro del límite
- **THEN** el archivo se guarda, la etiqueta pasa a "Anexado" y se registra la fecha de subida

#### Scenario: Archivo inválido
- **WHEN** el usuario sube otro formato o un archivo mayor a 10 MB
- **THEN** se rechaza con un mensaje claro y no se modifica el documento actual

### Requirement: Abrir y quitar el documento
El sistema SHALL poder abrir el documento del contrato en una pestaña nueva
mediante una URL que caduca (no permanente), y SHALL poder quitarlo, dejando el
contrato sin documento.

#### Scenario: Abrir el documento
- **WHEN** el usuario pide abrir o descargar el documento
- **THEN** se abre con una URL firmada de duración limitada

#### Scenario: Quitar el documento
- **WHEN** el usuario confirma "Quitar documento"
- **THEN** el contrato queda sin documento y el archivo se borra del almacenamiento

### Requirement: El documento no es público
Los archivos de los contratos SHALL estar en un bucket privado: solo se suben
con sesión iniciada y se leen con URL firmada; ningún enlace del objeto sirve
para verlo sin sesión.

#### Scenario: Acceso sin sesión
- **WHEN** se toma la URL cruda de un archivo de contrato
- **THEN** no devuelve el archivo

### Requirement: Descargar el documento desde el módulo de Ventas
El sistema SHALL permitir bajar el documento del contrato —el que generó la app
o el que anexó un usuario— desde el módulo de Ventas, sin pasar por el módulo
de Contratos, y SHALL mostrar en el listado de Ventas si la venta tiene
contrato y si ese contrato tiene documento.

#### Scenario: Venta con contrato y documento
- **WHEN** se abre el listado de Ventas y la venta tiene un contrato con documento
- **THEN** la columna Contrato muestra el tipo y el origen del documento y ofrece "Descargar"

#### Scenario: Venta con contrato sin documento
- **WHEN** la venta tiene contrato pero el contrato todavía no tiene documento
- **THEN** la columna muestra "Sin documento" y no ofrece descarga

#### Scenario: Venta sin contrato
- **WHEN** la venta no tiene contrato asociado
- **THEN** la columna muestra "-" y no ofrece descarga

#### Scenario: Descargar el contrato
- **WHEN** el usuario pide descargar el documento de la venta
- **THEN** el archivo baja al equipo con el nombre que tenía, desde una URL firmada de duración limitada

### Requirement: El listado de contratos informa del documento
El listado de Contratos SHALL mostrar, por cada contrato, si tiene documento,
de qué tipo es y si fue generado por la app o anexado por un usuario, y SHALL
permitir abrirlo o bajarlo.

#### Scenario: Contrato con documento en el listado
- **WHEN** el contrato tiene documento
- **THEN** la columna Documento muestra el ícono del tipo y la etiqueta "Generado" o "Anexado"

