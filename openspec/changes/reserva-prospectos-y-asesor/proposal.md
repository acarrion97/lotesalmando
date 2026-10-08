## Why

El pipeline de Prospectos se queda sin salida: pasar un prospecto a "Reserva" solo cambia una etiqueta, no elige lote, no reserva nada ni crea el cliente, con lo que el trabajo del vendedor se pierde entre módulos. Al mismo tiempo, el rol "Vendedor" existe en el catálogo de roles pero nunca se traduce en un asesor: `asesores.id_usuario` siempre se crea en `NULL`, `NuevaCotizacionPage` busca un asesor de sesión que no existe, y por eso en Ventas no se puede responder "¿quién vendió este lote?". Finalmente, la configuración de un proyecto (plano, galería, enlace público) vive escondida en Configuración con un selector global, lejos del módulo donde se administra ese proyecto.

## What Changes

- **Reserva desde Prospectos**: al cambiar el estado de un prospecto a `reserva` se abre un modal de reserva donde se elige el lote (solo disponibles, con manzana/número/precio), se captura cédula/RUC y teléfono, y al confirmar se crea o reutiliza el cliente, se reserva el lote (`estado = reservado` con su registro de inventario), se crea la oportunidad que vincula prospecto ↔ lote y se guarda el estado `reserva`. Al cancelar no se persiste nada y el prospecto conserva su estado anterior.
- **Teléfono del cliente**: `clientes` incorpora `telefono`; el alta desde el modal de reserva lo guarda, y el módulo de Clientes lo muestra y edita.
- **Configuración de proyectos accesible desde Proyectos**: la card "Mapa del proyecto" (subida/borrado de plano, galería y enlace público) se extrae a un componente compartido que se muestra en Configuración (con selector de proyecto) y en Proyectos, contextualizado al proyecto seleccionado.
- **Asesor visible en Ventas**: columna "Asesor" con filtro en la tabla y fila en el detalle, con fallback "Sin asesor" para las ventas que no heredaron asesor de su cotización.
- **Rol Vendedor ⇒ asesor vinculado**: el formulario de Nuevo Usuario agrega el campo Roles (hoy no existe, solo se asignan al editar). Asignar el rol Vendedor crea automáticamente el asesor vinculado (`id_usuario`, `codigo` autogenerado secuencial por empresa, `nombre_comercial` = nombre del usuario, `estado = activo`); quitar el rol lo pasa a `inactivo` sin borrarlo para preservar el historial. Asesores muestra la columna "Usuario" y permite vincular/desvincular asesores ya existentes.
- **`id_asesor` de la sesión en el resto del flujo**: los prospectos nuevos se crean con el asesor de la sesión y la venta directa del mapa deja de crear la cotización con `id_asesor: NULL`.

## Capabilities

### New Capabilities

- `prospectos/reserva`: modal de reserva disparado por el cambio de estado, selección de lote, alta/reuso de cliente, reserva del lote y vinculación con la oportunidad; cancelación sin efectos.
- `clientes/contacto`: teléfono como dato de contacto del cliente en su CRUD.
- `proyectos/configuracion`: plano, galería y enlace público del proyecto disponibles desde el módulo Proyectos.
- `ventas/asesor`: identificación del asesor que vendió cada lote en listado, filtro y detalle.
- `usuarios/vendedor-asesor`: alta de roles al crear usuario, derivación automática del asesor desde el rol Vendedor, vínculo visible/editable en Asesores y uso del `id_asesor` de la sesión en prospectos y venta directa.

### Modified Capabilities

<!-- No hay capacidades existentes en openspec/specs todavía. -->

## Impact

- **Base de datos**: migración nueva con `ALTER TABLE clientes ADD COLUMN telefono` y (si se opta por atomicidad) una RPC que de alta usuario + rol + asesor en una sola transacción. Sin cambios de esquema para `asesores` (`id_usuario`, `codigo`, `nombre_comercial` ya existen) ni para `oportunidades.id_lote`.
- **Lógica/aplicación**: `ProspectosPage` (intercepción del cambio de estado + modal), nuevo caso de uso de reserva de prospecto que orquesta `findOrCreateCliente` + `ReservarLoteUseCase` + alta de oportunidad; `UsuariosPage` (campo Roles en alta, sincronía rol↔asesor al guardar); `MapasPage` (asesor de sesión en la cotización de venta directa); `ProspectosPage` (`id_asesor` de sesión); contenedor `create-use-cases.ts`.
- **UI**: `ProspectosPage`, `ClientesPage`, `ProyectosPage`, `VentasPage`, `UsuariosPage`, `AsesoresPage`, componente compartido de configuración de proyecto extraído de `ConfiguracionPage`.
- **Datos/esquemas**: `Cliente` (entidad, esquema Zod, repositorios Supabase/Mock, casos de uso), `prospectoSchema`.
- **Riesgos**: `UNIQUE(id_empresa, codigo)` en asesores exige calcular el siguiente secuencial sin chocar con códigos cargados a mano; el alta en varios pasos puede quedar a medias si no es atómica; usuarios con rol Vendedor previos al cambio no tendrán asesor hasta vincularlos manualmente.
