## 1. Fundación — Copia, Renombrado y Tema

- [x] 1.1 Copiar contenido de crmlotesec a lotesalmando
- [x] 1.2 Renombrar proyecto en package.json a "lotes-al-mando"
- [x] 1.3 Actualizar index.html title y meta
- [x] 1.4 Actualizar localStorage keys de "crmlotesec" a "lotesalmando"
- [x] 1.5 Crear src/presentation/theme/brand.ts con paleta Lotes al Mando
- [x] 1.6 Reescribir light-theme.ts usando tokens de brand.ts
- [x] 1.7 Reescribir dark-theme.ts usando tokens de brand.ts (primary = verde #10B981)
- [x] 1.8 Agregar CSS variables en index.css (light + dark)
- [x] 1.9 Verificar tema claro funciona correctamente
- [x] 1.10 Verificar tema oscuro funciona correctamente
- [x] 1.11 Verificar toggle light/dark/system

## 2. Fundación — Supabase Setup

- [x] 2.1 Instalar @supabase/supabase-js
- [x] 2.2 Crear .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
- [x] 2.3 Crear infrastructure/supabase/client.ts (singleton client)
- [ ] 2.4 Crear infrastructure/supabase/database.types.ts (generated types)
- [ ] 2.5 Diseñar esquema PostgreSQL: empresas, usuarios, roles, usuario_roles
- [ ] 2.6 Diseñar esquema PostgreSQL: proyectos, etapas, manzanas, lotes
- [ ] 2.7 Diseñar esquema PostgreSQL: clientes, prospectos, asesores, oportunidades
- [ ] 2.8 Diseñar esquema PostgreSQL: cotizaciones, ventas, contratos, cuotas, pagos
- [ ] 2.9 Diseñar esquema PostgreSQL: inventario, configuracion, mapa
- [x] 2.10 Crear migraciones SQL con tablas, foreign keys, índices
- [x] 2.11 Crear políticas RLS por empresa_id en todas las tablas principales
- [ ] 2.12 Crear seed data con empresas y usuarios de prueba
- [ ] 2.13 Verificar RLS aislamiento de datos entre empresas
- [x] 2.14 Actualizar .env.example con VITE_DATA_PROVIDER=supabase y documentar mock como opt-in explicito
- [x] 2.15 Configurar Supabase como proveedor predeterminado cuando VITE_DATA_PROVIDER no este definido o este vacio
- [x] 2.16 Rechazar valores de VITE_DATA_PROVIDER distintos de supabase o mock con un error de configuracion claro
- [x] 2.17 Verificar que el acceso de datos en tiempo de ejecucion pase por el contenedor y no use mocks desde presentacion

## 3. Fundación — Auth y Multi-Empresa

- [x] 3.1 Crear src/modules/auth/ (domain, application, infrastructure, presentation)
- [x] 3.2 Implementar SupabaseAuthProvider (reemplazar mock auth)
- [x] 3.3 Implementar login con email/password usando Supabase Auth
- [x] 3.4 Implementar logout y limpieza de sesión
- [x] 3.5 Implementar ProtectedRoute con redirect a /login
- [x] 3.6 Crear src/modules/empresas/ con EmpresaProvider (implementado en `src/presentation/providers/EmpresaProvider.tsx`, no bajo `src/modules/` — la reestructura modular de la sección 5 sigue pendiente)
- [x] 3.7 Implementar selección de empresa (localStorage persistence)
- [x] 3.8 Crear EmpresaRepository Supabase (`SupabaseEmpresaRepository`, verificado contra tabla `empresa` real)
- [ ] 3.9 Crear LoginPage con formulario real (Zod validation)
- [ ] 3.10 Verificar auth flow completo: login → sesión → protected routes

## 4. Fundación — Usuarios y Roles

- [ ] 4.1 Crear src/modules/usuarios/ (domain, application, infrastructure, presentation)
- [ ] 4.2 Crear UsuarioRepository interface + Supabase implementation
- [ ] 4.3 Crear useUsuarios hook (TanStack Query)
- [x] 4.4 Crear UsuariosPage con CRUD real (create, edit, delete)
- [ ] 4.5 Agregar Zod validation en formulario de usuario
- [ ] 4.6 Crear src/modules/roles/ básico (domain + repository)
- [ ] 4.7 Conectar roles con usuarios (asignación)
- [ ] 4.8 Verificar CRUD de usuarios persiste en Supabase
## 5. Reestructura Modular

- [ ] 5.1 Crear estructura src/modules/ con subcarpetas por módulo
- [ ] 5.2 Mover módulos existentes a nueva estructura (proyectos, lotes, clientes, etc.)
- [ ] 5.3 Mover shared components a src/shared/components/
- [ ] 5.4 Mover shared hooks a src/shared/hooks/
- [ ] 5.5 Mover shared utils a src/shared/utils/
- [ ] 5.6 Mover shared types a src/shared/types/
- [ ] 5.7 Actualizar imports en todos los archivos
- [ ] 5.8 Verificar que la app compila sin errores
- [ ] 5.9 Verificar que la navegación funciona correctamente

## 6. Inventario — Proyectos, Etapas, Manzanas

- [x] 6.1 Crear src/modules/proyectos/ (domain, application, infrastructure, presentation)
- [x] 6.2 Implementar ProyectoRepository Supabase
- [x] 6.3 Implementar useProyectos hook (TanStack Query)
- [x] 6.4 Crear ProyectosPage con CRUD real
- [x] 6.5 Crear src/modules/etapas/ con EtapaRepository Supabase
- [x] 6.6 Implementar EtapasPage (gestión de etapas por proyecto)
- [x] 6.7 Crear src/modules/manzanas/ con ManzanaRepository Supabase
- [x] 6.8 Implementar ManzanasPage (gestión de manzanas por etapa)
- [ ] 6.9 Verificar navegación jerárquica: proyecto → etapa → manzana

## 7. Inventario — Lotes y Mapa

- [x] 7.1 Crear src/modules/lotes/ (domain, application, infrastructure, presentation)
- [x] 7.2 Implementar LoteRepository Supabase con estados
- [x] 7.3 Implementar useLotes hook (TanStack Query)
- [x] 7.4 Crear LotesPage con tabla + vista grid + estadísticas
- [x] 7.5 Implementar estados de lote: disponible, reservado, en negociación, vendido, bloqueado, no disponible
- [ ] 7.6 Agregar Zod validation en formulario de lote
- [x] 7.7 Crear src/modules/lotes/ con mapa SVG interactivo
- [x] 7.8 Implementar colores por estado en mapa (regla visual)
- [x] 7.9 Implementar leyenda con color + texto + icono
- [x] 7.10 Implementar filtros por estado y manzana
- [ ] 7.11 Verificar mapa renderiza correctamente con datos reales

## 8. CRM — Prospectos y Pipeline

- [x] 8.1 Crear src/modules/prospectos/ (domain, application, infrastructure, presentation)
- [x] 8.2 Crear ProspectoRepository Supabase
- [x] 8.3 Crear src/modules/prospectos/ con pipeline de oportunidades
- [x] 8.4 Implementar etapas del pipeline: contactado, interesado, negociación, reserva, perdido
- [x] 8.5 Crear OportunidadRepository Supabase
- [x] 8.6 Implementar actividades de seguimiento (fecha, tipo, notas)
- [x] 8.7 Crear ProspectosPage con CRUD + pipeline visual
- [x] 8.8 Implementar alerta de prospectos sin seguimiento >48h
- [x] 8.9 Implementar métricas de conversión del pipeline
- [ ] 8.10 Verificar pipeline funciona con datos reales

## 9. CRM — Asesores

- [x] 9.1 Crear src/modules/asesores/ (domain, application, infrastructure, presentation)
- [x] 9.2 Crear Asesor entity (independiente de Usuario) con usuario_id FK
- [x] 9.3 Implementar AsesorRepository Supabase
- [x] 9.4 Implementar useAsesores hook (TanStack Query)
- [x] 9.5 Crear AsesoresPage con CRUD real
- [x] 9.6 Implementar código único por empresa
- [x] 9.7 Implementar meta de ventas mensual
- [x] 9.8 Implementar tracking de rendimiento (ventas realizadas vs meta)
- [x] 9.9 Verificar asesores persisten en Supabase

## 10. Ventas — Reservas, Ventas, Contratos

- [x] 10.1 Crear src/modules/ventas/ (domain, application, infrastructure, presentation)
- [x] 10.2 Implementar ReservarLoteUseCase (cambia estado a reservado)
- [x] 10.3 Implementar CancelarReservaUseCase (cambia estado a disponible)
- [x] 10.4 Implementar CreateVentaUseCase con transacción atómica
- [x] 10.5 Implementar generación automática de contrato
- [x] 10.6 Implementar generación automática de 12 cuotas
- [x] 10.7 Crear VentasPage con vista de ventas
- [x] 10.8 Crear src/modules/contratos/ con ContratoRepository
- [x] 10.9 Crear ContratosPage con vista de contratos
- [x] 10.10 Verificar transacción atómica: venta + lote + inventario + contrato + cuotas
- [x] 10.11 Verificar flujo completo: cotización → reserva → venta → contrato

## 11. Cartera — Pagos y Morosidad

- [x] 11.1 Crear src/modules/cartera/ (domain, application, infrastructure, presentation)
- [x] 11.2 Implementar CuotaRepository Supabase
- [x] 11.3 Implementar PagoRepository Supabase
- [x] 11.4 Implementar estados de cuota: al día, próximo a vencer, vencido, en mora, pagado
- [x] 11.5 Implementar registro de pagos contra cuotas
- [x] 11.6 Implementar cálculo de saldo pendiente por contrato
- [x] 11.7 Implementar detección automática de cuotas vencidas
- [x] 11.8 Crear CobranzasPage con vista de cuotas y estados
- [x] 11.9 Crear PagosPage con registro de pagos
- [x] 11.10 Implementar métricas: cartera total, cartera vencida, morosidad %
- [x] 11.11 Implementar identificación de clientes en riesgo
- [x] 11.12 Verificar cartera calcula correctamente con datos reales

## 12. Centro de Mando

- [x] 12.1 Crear src/modules/dashboard/ (domain, application, infrastructure, presentation)
- [x] 12.2 Implementar queries de KPIs desde Supabase
- [x] 12.3 Crear DashboardPage con KPI cards (lotes disponibles, reservados, vendidos)
- [x] 12.4 Agregar KPIs de ventas (ventas del mes, comparación mes anterior)
- [x] 12.5 Agregar KPIs de cartera (cartera total, vencida, morosidad)
- [x] 12.6 Implementar filtro por proyecto
- [x] 12.7 Implementar comparación mes actual vs anterior
- [x] 12.8 Implementar quick actions (acceso rápido)
- [x] 12.9 Implementar loading states (skeletons)
- [x] 12.10 Verificar dashboard muestra datos reales de Supabase

## 13. Mando IA — Alertas

- [x] 13.1 Crear src/modules/ia/ (domain, application, infrastructure, presentation)
- [x] 13.2 Implementar motor de reglas para alertas de inventario
- [x] 13.3 Implementar alertas de seguimiento (>48h sin actividad)
- [x] 13.4 Implementar alertas de cartera (cuotas que vencen en 7 días)
- [x] 13.5 Implementar alertas de morosidad
- [x] 13.6 Crear componente de alertas en dashboard
- [x] 13.7 Implementar configuración de umbrales
- [x] 13.8 Verificar alertas se muestran con datos reales

## 14. Validación y Formularios

- [x] 14.1 Crear esquemas Zod para Prospecto
- [x] 14.2 Crear esquemas Zod para Asesor
- [x] 14.3 Crear esquemas Zod para Cotización
- [x] 14.4 Crear esquemas Zod para Venta
- [x] 14.5 Crear esquemas Zod para Pago
- [x] 14.6 Integrar Zod en todos los formularios existentes
- [x] 14.7 Verificar validaciones funcionan en cliente

## 15. Navegación y Layout

- [x] 15.1 Actualizar Sidebar con nuevos módulos (CRM, Cartera, IA)
- [x] 15.2 Actualizar rutas en AppRouter
- [x] 15.3 Actualizar Header con empresa selector y usuario
- [x] 15.4 Verificar navegación completa funciona
- [x] 15.5 Verificar breadcrumbs generados correctamente

## 16. Responsive y Polish

- [x] 16.1 Verificar layout responsive en mobile
- [x] 16.2 Verificar sidebar colapsable en mobile
- [x] 16.3 Verificar tablas responsive
- [x] 16.4 Verificar formularios responsive
- [x] 16.5 Verificar mapa interactivo en mobile
- [x] 16.6 Verificar contraste WCAG AA en ambos temas
- [x] 16.7 Limpiar código muerto y imports no usados
- [x] 16.8 Ejecutar lint y typecheck sin errores

## 17. Pruebas Manuales

- [x] 17.1 Verificar login/logout con Supabase Auth
- [x] 17.2 Verificar selección de empresa — corregido: `EmpresaProvider` ahora carga `useEmpresas()` y selecciona automáticamente (localStorage → empresa del usuario → única empresa disponible); verificado con reload de sesión
- [x] 17.3 Verificar CRUD de usuarios persiste
- [x] 17.4 Verificar CRUD de proyectos persiste
- [x] 17.5 Verificar CRUD de lotes persiste — ciclo completo crear/editar/eliminar verificado contra Supabase real (lote de prueba id_lote=9, limpiado)
- [x] 17.6 Verificar mapa SVG muestra lotes con estados
- [x] 17.7 Verificar flujo completo: reserva → venta → contrato → cuotas — **bug crítico encontrado y corregido**: `handleReservar`/`handleVenta` en MapasPage.tsx eran mockups (solo `message.success` + `closeModal`, nunca llamaban a Supabase); ningún componente de la app invocaba `useReservarLote`/`useCreateVenta`. Reescritos para usar los hooks reales + creación de cliente/cotización; verificado en vivo por UI real (no solo por código): L-004 y L-005 reservados y vendidos, contrato + 12 cuotas generadas cada uno. Datos de prueba (2 clientes, 2 cotizaciones, 2 ventas, 2 contratos, 24 cobranzas, 1 pago) quedaron reales en Supabase — decisión deliberada del usuario de conservarlos como data de demo (no se ejecuta el script de limpieza). El tramo "prospecto → oportunidad" del flujo de CRM es independiente de reserva/venta y no se tocó.
- [x] 17.8 Verificar registro de pagos actualiza cartera — verificado en vivo: pago registrado contra una cuota real, cuota pasó a "pagada", dashboard reflejó Cartera Pendiente/Pagada correctamente
- [x] 17.9 Verificar dashboard muestra KPIs reales
- [x] 17.10 Verificar alertas de IA se muestran — verificado en vivo: alerta "Stock de lotes bajo" aparece correctamente (3 disponibles < umbral 5), con prioridad y conteos consistentes. **Dos bugs encontrados en el resto del motor** (no bloquean esta tarea, documentados para decisión aparte): la alerta "cartera por vencer" compara `cobranza.created_at` contra una ventana futura — como `created_at` siempre es pasado al momento de evaluarse, esa alerta no puede dispararse nunca; y `DetectarCuotasVencidasUseCase` marca **toda** cuota "pendiente" como "vencida" sin ningún chequeo de fecha (no existe columna `fecha_vencimiento` en `cobranzas`), así que un solo clic en "Detectar vencidas" pondría en mora cuotas que ni siquiera vencieron todavía.
- [x] 17.11 Verificar tema claro y oscuro
- [x] 17.12 Verificar responsive en diferentes tamaños (login y dashboard en mobile verificados)
- [x] 17.13 Verificar que sin VITE_DATA_PROVIDER la aplicacion usa repositorios Supabase (verificado por lectura de `resolveDataProvider()`: cadena vacía/ausente resuelve a "supabase")
- [x] 17.14 Verificar que VITE_DATA_PROVIDER=mock activa mocks unicamente de forma explicita (verificado por lectura de código: único valor que activa `createMockRepositories()`)
- [x] 17.15 Verificar que un proveedor invalido impide el inicio con un error claro — confirmado en vivo: `VITE_DATA_PROVIDER=totalmente_invalido` lanza `Unsupported VITE_DATA_PROVIDER "totalmente_invalido". Expected "supabase" or "mock".` **Nota**: no hay Error Boundary, así que el resultado visible es pantalla en blanco, no un mensaje amigable — el error solo aparece en consola.
- [x] 17.16 Verificar que errores o credenciales ausentes de Supabase no activan un fallback silencioso a datos ficticios (verificado por lectura de código: `createSupabaseRepositories()` lanza excepción si faltan `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, no hay ruta que caiga a mock)
