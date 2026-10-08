## 1. Teléfono del cliente (base y modelos)

- [x] 1.1 Crear migración `supabase/migrations/017_clientes_telefono.sql` con `ALTER TABLE clientes ADD COLUMN telefono VARCHAR(50)` y aplicarla en Supabase
- [x] 1.2 Actualizar `src/infrastructure/supabase/database.types.ts` con la columna `telefono`
- [x] 1.3 Agregar `telefono` a la entidad `Cliente`, al schema Zod de cliente y a los repositorios Supabase/Mock (lectura, insert y update)
- [x] 1.4 Mostrar y editar `telefono` en `ClientesPage` (tabla o detalle, modal de alta y de edición) con marcador de dato ausente

## 2. Caso de uso de reserva de prospecto

- [x] 2.1 Crear `ReservarProspectoUseCase` que orquesta: crear/reusar cliente (por cédula o email) → `ReservarLoteUseCase` → crear oportunidad en etapa `reserva` → actualizar prospecto (estado `reserva` + fecha de seguimiento + `id_asesor` de sesión)
- [x] 2.2 Implementar la compensación: si falla después de reservar el lote, revertirlo a `disponible`, quitar su movimiento de inventario y propagar un mensaje claro
- [x] 2.3 Registrar el caso de uso en `src/infrastructure/container/create-use-cases.ts`
- [x] 2.4 Validar los casos de error: lote inexistente, lote no disponible, sin lotes disponibles y datos de cliente inválidos

## 3. Modal de reserva en Prospectos

- [x] 3.1 Detectar en `ProspectosPage` el cambio de estado a `reserva` (alta y edición) y abrir el modal de reserva guardando los demás datos de la edición pero retener el estado hasta confirmar
- [x] 3.2 Construir el modal: combo de lotes solo `disponible` (número + manzana + precio), cédula/RUC y teléfono obligatorios, nombres y email precargados del prospecto y editables
- [x] 3.3 Al confirmar, ejecutar `ReservarProspectoUseCase` y refrescar prospectos, lotes, clientes y oportunidades; mensajes de éxito y de error
- [x] 3.4 Al cancelar o cerrar, no persistir nada, conservar el estado anterior del prospecto y no dejar `ModalState` huérfano
- [x] 3.5 No reabrir el modal cuando el prospecto ya estaba en `reserva` con lote asignado, y guardar normalmente cuando el estado pasa a otro valor
- [x] 3.6 Verificar el caso "sin lotes disponibles" (mensaje y confirmación deshabilitada)

## 4. Configuración de proyectos accesible desde Proyectos

- [x] 4.1 Extraer la card "Mapa del proyecto" de `ConfiguracionPage` a un componente compartido con `proyectoId?: number` (selector interno solo cuando no se pasa)
- [x] 4.2 Reutilizarlo en `ConfiguracionPage` manteniendo el comportamiento actual (selector global, galería, enlace público)
- [x] 4.3 Agregar en `ProyectosPage` la acción "Configuración" que abre un modal con ese componente ya fijado al proyecto de la fila
- [x] 4.4 Verificar que subir/quitar un plano desde Proyectos se refleja en Configuración, en el mapa y en el enlace público

## 5. Asesor visible en Ventas

- [x] 5.1 Agregar `useAsesores()` + lookup en `VentasPage` y crear la columna "Asesor" con respaldo "Sin asesor"
- [x] 5.2 Agregar filtro por asesor (incluida la opción "Sin asesor")
- [x] 5.3 Mostrar la fila "Asesor" en el modal de detalle, diferenciada del usuario que registró la venta
- [x] 5.4 Verificar el respaldo cuando el asesor de la venta ya no existe

## 6. Rol Vendedor ⇒ asesor vinculado

- [x] 6.1 Identificar el rol Vendedor por `nombre_rol` normalizado y centralizar la resolución del asesor de sesión en `useAsesorDeSesion()`
- [x] 6.2 Agregar el campo Roles al formulario de Nuevo Usuario y asignar los roles elegidos en `handleCreate`
- [x] 6.3 Crear `AsignarAsesorParaUsuarioUseCase`: genera código `V-<n>` siguiente de la empresa, crea el asesor con `id_usuario` y `estado = activo`, reutilizando el existente y reintantando una vez ante colisión de `UNIQUE(id_empresa, codigo)`
- [x] 6.4 En `handleEdit` de `UsuariosPage`: al agregar el rol Vendedor crear/reactivar el asesor; al quitarlo pasar el asesor a `inactivo` sin borrarlo
- [x] 6.5 Mostrar la columna "Usuario" en `AsesoresPage` (con marcador "Sin vincular") y habilitar vincular/desvincular una cuenta existente

## 7. id_asesor de la sesión en el resto del flujo

- [x] 7.1 Crear prospectos con `id_asesor` del asesor de sesión en `ProspectosPage`
- [x] 7.2 Usar el asesor de sesión en la cotización de venta directa de `MapasPage` (antes `null`) tanto en el wizard de venta como en el de cotización
- [x] 7.3 Reemplazar el `find` inline de `NuevaCotizacionPage` por el helper compartido

## 8. Verificación

- [x] 8.1 Flujo completo A: prospecto → estado Reserva → elegir lote → confirmar ⇒ lote reservado, cliente creado con teléfono, oportunidad creada, prospecto en `reserva`; y cancelar ⇒ nada cambia
- [x] 8.2 Flujo completo B: crear usuario con rol Vendedor ⇒ asesor creado con código único y vinculado; quitar el rol ⇒ asesor inactivo; prospecto y venta directa quedan con ese asesor
- [x] 8.3 Ventas muestra asesor con filtro y detalle, con "Sin asesor" donde corresponde
- [x] 8.4 Configuración de proyecto funciona igual desde Configuración y desde Proyectos, sobre los mismos datos
- [x] 8.5 `npm run build` (o `tsc`) sin errores y revisión de que la exportación de Ventas no se rompe con la columna nueva
