## Context

Ver `proposal.md` (Why). Contexto técnico mínimo:

- `ProspectosPage` solo persiste `estado` desde el modal de edición (`container.updateProspecto.execute`); no existe ninguna pieza de "reserva de prospecto".
- La reserva de un lote ya está resuelta: `ReservarLoteUseCase(loteId, usuarioId)` valida `estado = disponible`, cambia a `reservado` y registra `inventario`; `useReservarLote()` es su mutación. `MapasPage` ya encadena `findOrCreateCliente` + `reservarLoteMutation` en ese orden.
- `oportunidades.id_lote` existe desde la migración `003` y `useOportunidades()` está exportado pero `ProspectosPage` no lo usa.
- `ventas.id_asesor` existe desde la migración `012` y `SupabaseSaleRepository` hace `select("*")`, por lo que el dato ya llega al front.
- `asesores.id_usuario` existe desde `004`, pero `AsesoresPage` crea con `id_usuario: null` y `UsuariosPage` nunca lo toca. `NuevaCotizacionPage:57` ya resuelve el "asesor de sesión" con `asesores.find(a => a.id_usuario === sesion.id_usuario && a.estado === "activo")` → el consumo existe, el alta no.
- El formulario de **Nuevo Usuario no tiene campo Roles**; los roles solo se asignan en `handleEdit`.

## Goals / Non-Goals

**Goals:**

- Que el estado `reserva` de un prospecto implique una reserva real de lote + cliente + oportunidad, en una sola interacción cancelable sin efectos.
- Que el rol Vendedor produzca un asesor vinculado sin pasos manuales, y que ese `id_asesor` se use en prospectos y venta directa.
- Exponer la configuración de proyecto en el módulo Proyectos reutilizando, no duplicando, el código actual.
- Mostrar el asesor en Ventas con el dato que ya existe.

**Non-Goals:**

- No se rediseña el pipeline de prospectos (kanban, arrastre de etapas) ni se agrega historial de reservas de prospectos.
- No se migra `AsesoresPage` a un CRUD con usuario obligatorio: los asesores manuales siguen existiendo sin vínculo.
- No se toca el flujo de cotización existente más allá de inyectar `id_asesor` de sesión donde hoy es `null`.
- No se agrega teléfono a prospectos ni a usuarios (solo a `clientes`).

## Decisions

### D1 · Orquestación de la reserva en el cliente con compensación (no RPC)

**Decisión:** nuevo caso de uso `ReservarProspectoUseCase` que ejecuta en orden: crear/reusar cliente → `ReservarLoteUseCase` → crear oportunidad → actualizar prospecto. Si falla después de reservar el lote, se invierte la reserva (volver el lote a `disponible` y quitar su movimiento de inventario) y se propaga un error legible.

- **Alternativa A (RPC atómica `reservar_prospecto`)**: más segura, pero exige migración SQL nueva, duplica la validación que ya vive en `ReservarLoteUseCase`, y se aleja del patrón que `MapasPage` usa hoy.
- **Alternativa B (solo en el modal, sin caso de uso)**: repetiría la orquestación en la página y la volvería intestableable.
- **Por qué D1**: reutiliza los casos de uso ya probados, funciona también con el repositorio mock y respeta la capa offline (`pwa-offline-support`), a costa de no ser transaccional; la compensación cubre el único estado intermedio peligroso (lote reservado "huérfano").

### D2 · El estado `reserva` se persiste solo al confirmar el modal

**Decisión:** al guardar la edición con estado `reserva` los demás campos de la edición **sí** se guardan, pero el estado se conserva como estaba: `updateProspecto` con `estado: "reserva"` recién corre al confirmar el modal, junto con el resto de la orquestación. Cancelar ⇒ no se ejecuta la reserva, el prospecto mantiene su estado anterior y los datos que se habían editado quedan guardados.

- **Por qué no "no persistir nada"**: descartar la edición entera hace perder notas/nombres que el usuario ya había revisado al pulsar Guardar; el estado es el único dato cuyo cambio debe esperar a la reserva real.
- **Alternativa**: persistir el estado primero y revertirlo al cancelar. Rechazada: deja una ventana de estado inconsistente y rompe si el revert falla (queda `reserva` sin lote).
- **Guardia**: si el prospecto **ya** estaba en `reserva` y tiene oportunidad con lote, volver a guardar no reabre el modal (spec: *Prospecto que ya está en reserva*).

### D3 · Un solo helper de "asesor de sesión"

**Decisión:** extraer `useAsesorDeSesion()` (o `getAsesorDeSesion(asesores, usuario)`) y usarlo en `NuevaCotizacionPage` (reemplazando el `find` inline), `ProspectosPage` y `MapasPage`. Filtro: `id_usuario` coincide + `estado === "activo"`.

- **Por qué**: evita que tres pantallas mantengan criterios distintos (p. ej. incluir asesores inactivos) y centraliza el fallback `null`.

### D4 · Código de asesor autogenerado con reintento por colisión

**Decisión:** el alta calcula el siguiente código `V-<n>` con `n = max(numérico de los códigos `V-<n>` de la empresa) + 1`, inserta, y si la restricción `UNIQUE(id_empresa, codigo)` rechaza, reintenta una vez con el siguiente número disponible.

- **Alternativa A (secuencia de Postgres)**: requeriría migración y aun así puede chocar con códigos manuales ya cargados (`A1`, `V-007`…), por lo que no elimina el conflicto.
- **Alternativa B (usar `id_usuario` como código)**: garantiza unicidad pero deja códigos poco legibles y rompe la convención actual.
- **Por qué D4**: cero migración, legible y con la guarda de la constraint como última línea.

### D5 · Sincronía rol ↔ asesor en los dos puntos de edición de usuario

**Decisión:** `UsuariosPage.handleCreate` gana el campo `roles` y `handleEdit` reutiliza su cálculo de agregados/removidos ya existente. Para cada rol identificado como Vendedor:

- **agregado** → crear asesor si `id_usuario` no tiene uno; si tiene, reactivarlo (`estado = "activo"`).
- **removido** → `estado = "inactivo"` si el asesor está `activo` (nunca `DELETE`, por la FK de `ventas`/`cotizaciones`).

El rol se identifica por `nombre_rol` normalizado (`vendedor`), no por `id_rol`, porque la tabla `roles` permite catálogos distintos entre empresas.

- **Por qué no una RPC transaccional**: `CreateUsuarioUseCase` hoy tampoco es atómico con los roles; envolver solo esta parte crearía dos mecanismos distintos para la misma operación. Se evalúa si el alta de usuario+rol+asesor se mueve a RPC en un cambio posterior.

### D6 · Configuración de proyecto como componente compartido con `proyectoId` opcional

**Decisión:** extraer la card "Mapa del proyecto" de `ConfiguracionPage` a `MapaProyectoCard` con prop `proyectoId?: number`:

- `undefined` → muestra el selector de proyecto interno (comportamiento actual de Configuración).
- con valor → trabaja directo sobre ese proyecto y omite el selector (uso en `ProyectosPage`, dentro de un modal de "Configuración del proyecto" abierto desde la fila).

`GaleriaProyectoCard` y `EnlacePublicoMapa` se reutilizan tal cual, manteniendo el `key` por proyecto para que no hereden estado entre proyectos.

- **Alternativa (mover y borrar de Configuración)**: rechazada por decisión explícita de mantener ambos accesos.

### D7 · Asesor en Ventas sin tocar el esquema

**Decisión:** `VentasPage` agrega `useAsesores()` + `useLookup` (patrón ya usado con clientes/usuarios), columna con filtro y fila en el detalle. Respaldo `"Sin asesor"` cuando `id_asesor` es `null` o el asesor ya no existe.

## Risks / Trade-offs

- **Reserva no transaccional (D1)** → compensación explícita al fallo posterior a `ReservarLoteUseCase`, con mensaje que explique que la reserva fue revertida; el cliente creado sí se conserva (es reutilizable y no rompe nada).
- **`UNIQUE(id_empresa, codigo)` (D4)** → reintento con el siguiente código; si agota reintentos, el alta de asesor se reporta como fallo parcial visible en el modal de usuario (el usuario y el rol ya quedaron).
- **Rol removido por error ⇒ asesor inactivo con historial** → comportamiento deseado: las ventas conservan el nombre del asesor (spec *Historial preservado*).
- **Usuarios con rol Vendedor anteriores al cambio** → no tendrán asesor; la columna "Usuario" en Asesores y el vínculo manual son la vía de reparación. No se hace backfill automático para no inventar códigos sobre datos reales.
- **`telefono` en `clientes`** → toca a la vez entidad, schema Zod, repositorios (Supabase/Mock), casos de uso y formularios; un descuido deja el campo silenciosamente descartado. Mitigación: verificar `insert/update` de `SupabaseClienteRepository` y el mapeo de `database.types.ts`.
- **Dos modales encadenados en Prospectos** → `ModalState.type` debe resolverse de forma secuencial (cerrar edición → abrir reserva → al cancelar, estado intacto) para no dejar modales huérfanos.
- **Exportación de Ventas** → verificado: `exportTableCatalog` ya incluye `id_asesor` en `ventas` y la columna "Asesor" de la tabla es sólo de UI, así que el CSV/XLSX no cambia.
- **Cliente creado en la reserva no aparece en el módulo Clientes** → `SupabaseClienteRepository.getByEmpresaId` filtra por ventas/cotizaciones (la tabla `cliente` no tiene `id_empresa`), así que el cliente recién creado se ve recién cuando cotiza o vende. **Aceptado por ahora**: el cliente sí queda persistido y es reutilizable (`GetAllClientesUseCase`) en Cotizaciones. Si se quiere visible de inmediato habría que agregar `cliente.id_empresa` (migración aparte, fuera de este cambio).

## Migration Plan

1. Migración SQL única: `ALTER TABLE clientes ADD COLUMN telefono VARCHAR(50)` (+ `COMMENT`), sin romper lecturas existentes. Se aplica en Supabase SQL Editor, igual que las migraciones previas del repo.
2. Despliegue de la app (front + lógica). Sin cambios de API pública; `database.types.ts` se actualiza para reflejar `telefono`.
3. Sin backfill: los asesores de usuarios Vendedor existentes se vinculan manualmente desde Asesores.
4. **Rollback**: la migración es aditiva (columna anulable), por lo que revertir = dejar de leerla; no hay datos que perder. La lógica se revierte con el deploy anterior.

## Open Questions

- ~~Mostrar el lote reservado dentro del detalle del prospecto~~ → fuera del alcance pedido; se evalúa como mejora posterior usando la oportunidad creada.
- ~~Si la exportación de Ventas debe incluir la columna "Asesor"~~ → resuelto: no hay exportación propia de Ventas en la UI y `exportTableCatalog.ventas` ya incluye `id_asesor`; la columna "Asesor" nueva es sólo de tabla/detalle.
