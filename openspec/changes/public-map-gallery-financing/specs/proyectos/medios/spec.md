## Purpose

Permite que los usuarios autenticados carguen y administren las fotos y videos de cada proyecto (galería de medios) para que después se publiquen en el enlace público del proyecto.

## ADDED Requirements

### Requirement: Carga de imágenes y videos por proyecto
El sistema SHALL permitir a un usuario autenticado subir archivos de imagen y de video a un proyecto desde la tarjeta "Galería del proyecto" de la pantalla Configuración, previsualizar el archivo antes de subirlo y confirmar la subida.

#### Scenario: Subida exitosa
- **WHEN** el usuario selecciona un proyecto, elige un archivo válido y confirma la subida
- **THEN** el medio aparece inmediatamente en la lista de la galería con su previsualización, y queda disponible para la galería pública del proyecto

#### Scenario: Fallo de la subida
- **WHEN** la subida al almacenamiento o el registro del medio fallan
- **THEN** se muestra un mensaje de error, la lista no cambia y no queda ningún archivo huérfano en el almacenamiento

#### Scenario: Sin proyecto seleccionado
- **WHEN** no hay proyecto seleccionado en la tarjeta
- **THEN** el control de selección de archivo está deshabilitado y no se puede subir nada

### Requirement: Validación de tipo y tamaño
El sistema SHALL aceptar solo formatos admitidos (imágenes PNG/JPG/WEBP hasta 10 MB; videos MP4/WEBM hasta 50 MB) y SHALL rechazar cualquier otro archivo sin subirlo, informando el motivo.

#### Scenario: Formato no admitido
- **WHEN** el usuario elige un archivo con una extensión o tipo MIME distinto de los admitidos
- **THEN** se muestra un mensaje con el formato admitido, el archivo no se sube y la lista queda igual

#### Scenario: Archivo demasiado grande
- **WHEN** el archivo supera el límite de su tipo (10 MB imagen / 50 MB video)
- **THEN** se muestra un mensaje con el límite y el archivo no se sube

### Requirement: Listado y borrado de medios
El sistema SHALL listar los medios del proyecto seleccionado distinguiendo imágenes de videos, y SHALL permitir eliminar cada medio, borrando también su archivo del almacenamiento.

#### Scenario: Borrar un medio
- **WHEN** el usuario confirma el borrado de un medio
- **THEN** el medio desaparece de la lista, su archivo se elimina del almacenamiento y deja de estar disponible en la galería pública

#### Scenario: Proyecto sin medios
- **WHEN** el proyecto seleccionado todavía no tiene medios
- **THEN** se muestra un estado vacío que invita a subir la primera foto o video

### Requirement: Aislamiento de los medios por proyecto
Los medios de un proyecto SHALL aparecer solo al listar ese proyecto; los archivos SHALL guardarse en una ruta de almacenamiento identificada por proyecto, y el borrado de un proyecto SHALL eliminar sus medios.

#### Scenario: Cambio de proyecto
- **WHEN** el usuario cambia el proyecto seleccionado en la tarjeta
- **THEN** la lista muestra únicamente los medios del proyecto nuevo

### Requirement: Orden estable de la galería
La galería SHALL mostrar los medios en un orden estable (orden de carga, del más reciente al más antiguo) y ese mismo orden SHALL respetarse en el enlace público.

#### Scenario: Recarga de la página
- **WHEN** el usuario recarga Configuración o el enlace público
- **THEN** los medios se muestran en el mismo orden que antes de recargar
