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
- [ ] 3.6 Crear src/modules/empresas/ con EmpresaProvider
- [ ] 3.7 Implementar selección de empresa (localStorage persistence)
- [ ] 3.8 Crear EmpresaRepository Supabase
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

- [ ] 6.1 Crear src/modules/proyectos/ (domain, application, infrastructure, presentation)
- [ ] 6.2 Implementar ProyectoRepository Supabase
- [ ] 6.3 Implementar useProyectos hook (TanStack Query)
- [x] 6.4 Crear ProyectosPage con CRUD real
- [ ] 6.5 Crear src/modules/etapas/ con EtapaRepository Supabase
- [ ] 6.6 Implementar EtapasPage (gestión de etapas por proyecto)
- [ ] 6.7 Crear src/modules/manzanas/ con ManzanaRepository Supabase
- [ ] 6.8 Implementar ManzanasPage (gestión de manzanas por etapa)
- [ ] 6.9 Verificar navegación jerárquica: proyecto → etapa → manzana

## 7. Inventario — Lotes y Mapa

- [ ] 7.1 Crear src/modules/lotes/ (domain, application, infrastructure, presentation)
- [ ] 7.2 Implementar LoteRepository Supabase con estados
- [ ] 7.3 Implementar useLotes hook (TanStack Query)
- [x] 7.4 Crear LotesPage con tabla + vista grid + estadísticas
- [ ] 7.5 Implementar estados de lote: disponible, reservado, en negociación, vendido, bloqueado, no disponible
- [ ] 7.6 Agregar Zod validation en formulario de lote
- [ ] 7.7 Crear src/modules/lotes/ con mapa SVG interactivo
- [ ] 7.8 Implementar colores por estado en mapa (regla visual)
- [ ] 7.9 Implementar leyenda con color + texto + icono
- [ ] 7.10 Implementar filtros por estado y manzana
- [ ] 7.11 Verificar mapa renderiza correctamente con datos reales

## 8. CRM — Prospectos y Pipeline

- [ ] 8.1 Crear src/modules/prospectos/ (domain, application, infrastructure, presentation)
- [ ] 8.2 Crear ProspectoRepository Supabase
- [ ] 8.3 Crear src/modules/prospectos/ con pipeline de oportunidades
- [ ] 8.4 Implementar etapas del pipeline: contactado, interesado, negociación, reserva, perdido
- [ ] 8.5 Crear OportunidadRepository Supabase
- [ ] 8.6 Implementar actividades de seguimiento (fecha, tipo, notas)
- [ ] 8.7 Crear ProspectosPage con CRUD + pipeline visual
- [ ] 8.8 Implementar alerta de prospectos sin seguimiento >48h
- [ ] 8.9 Implementar métricas de conversión del pipeline
- [ ] 8.10 Verificar pipeline funciona con datos reales

## 9. CRM — Asesores

- [ ] 9.1 Crear src/modules/asesores/ (domain, application, infrastructure, presentation)
- [ ] 9.2 Crear Asesor entity (independiente de Usuario) con usuario_id FK
- [ ] 9.3 Implementar AsesorRepository Supabase
- [ ] 9.4 Implementar useAsesores hook (TanStack Query)
- [ ] 9.5 Crear AsesoresPage con CRUD real
- [ ] 9.6 Implementar código único por empresa
- [ ] 9.7 Implementar meta de ventas mensual
- [ ] 9.8 Implementar tracking de rendimiento (ventas realizadas vs meta)
- [ ] 9.9 Verificar asesores persisten en Supabase

## 10. Ventas — Reservas, Ventas, Contratos

- [ ] 10.1 Crear src/modules/ventas/ (domain, application, infrastructure, presentation)
- [ ] 10.2 Implementar ReservarLoteUseCase (cambia estado a reservado)
- [ ] 10.3 Implementar CancelarReservaUseCase (cambia estado a disponible)
- [ ] 10.4 Implementar CreateVentaUseCase con transacción atómica
- [ ] 10.5 Implementar generación automática de contrato
- [ ] 10.6 Implementar generación automática de 12 cuotas
- [ ] 10.7 Crear VentasPage con vista de ventas
- [ ] 10.8 Crear src/modules/contratos/ con ContratoRepository
- [ ] 10.9 Crear ContratosPage con vista de contratos
- [ ] 10.10 Verificar transacción atómica: venta + lote + inventario + contrato + cuotas
- [ ] 10.11 Verificar flujo completo: cotización → reserva → venta → contrato

## 11. Cartera — Pagos y Morosidad

- [ ] 11.1 Crear src/modules/cartera/ (domain, application, infrastructure, presentation)
- [ ] 11.2 Implementar CuotaRepository Supabase
- [ ] 11.3 Implementar PagoRepository Supabase
- [ ] 11.4 Implementar estados de cuota: al día, próximo a vencer, vencido, en mora, pagado
- [ ] 11.5 Implementar registro de pagos contra cuotas
- [ ] 11.6 Implementar cálculo de saldo pendiente por contrato
- [ ] 11.7 Implementar detección automática de cuotas vencidas
- [ ] 11.8 Crear CobranzasPage con vista de cuotas y estados
- [ ] 11.9 Crear PagosPage con registro de pagos
- [ ] 11.10 Implementar métricas: cartera total, cartera vencida, morosidad %
- [ ] 11.11 Implementar identificación de clientes en riesgo
- [ ] 11.12 Verificar cartera calcula correctamente con datos reales

## 12. Centro de Mando

- [ ] 12.1 Crear src/modules/dashboard/ (domain, application, infrastructure, presentation)
- [ ] 12.2 Implementar queries de KPIs desde Supabase
- [ ] 12.3 Crear DashboardPage con KPI cards (lotes disponibles, reservados, vendidos)
- [ ] 12.4 Agregar KPIs de ventas (ventas del mes, comparación mes anterior)
- [ ] 12.5 Agregar KPIs de cartera (cartera total, vencida, morosidad)
- [ ] 12.6 Implementar filtro por proyecto
- [ ] 12.7 Implementar comparación mes actual vs anterior
- [ ] 12.8 Implementar quick actions (acceso rápido)
- [ ] 12.9 Implementar loading states (skeletons)
- [ ] 12.10 Verificar dashboard muestra datos reales de Supabase

## 13. Mando IA — Alertas

- [ ] 13.1 Crear src/modules/ia/ (domain, application, infrastructure, presentation)
- [ ] 13.2 Implementar motor de reglas para alertas de inventario
- [ ] 13.3 Implementar alertas de seguimiento (>48h sin actividad)
- [ ] 13.4 Implementar alertas de cartera (cuotas que vencen en 7 días)
- [ ] 13.5 Implementar alertas de morosidad
- [ ] 13.6 Crear componente de alertas en dashboard
- [ ] 13.7 Implementar configuración de umbrales
- [ ] 13.8 Verificar alertas se muestran con datos reales

## 14. Validación y Formularios

- [ ] 14.1 Crear esquemas Zod para Prospecto
- [ ] 14.2 Crear esquemas Zod para Asesor
- [ ] 14.3 Crear esquemas Zod para Cotización
- [ ] 14.4 Crear esquemas Zod para Venta
- [ ] 14.5 Crear esquemas Zod para Pago
- [ ] 14.6 Integrar Zod en todos los formularios existentes
- [ ] 14.7 Verificar validaciones funcionan en cliente

## 15. Navegación y Layout

- [ ] 15.1 Actualizar Sidebar con nuevos módulos (CRM, Cartera, IA)
- [ ] 15.2 Actualizar rutas en AppRouter
- [ ] 15.3 Actualizar Header con empresa selector y usuario
- [ ] 15.4 Verificar navegación completa funciona
- [ ] 15.5 Verificar breadcrumbs generados correctamente

## 16. Responsive y Polish

- [ ] 16.1 Verificar layout responsive en mobile
- [ ] 16.2 Verificar sidebar colapsable en mobile
- [ ] 16.3 Verificar tablas responsive
- [ ] 16.4 Verificar formularios responsive
- [ ] 16.5 Verificar mapa interactivo en mobile
- [ ] 16.6 Verificar contraste WCAG AA en ambos temas
- [ ] 16.7 Limpiar código muerto y imports no usados
- [ ] 16.8 Ejecutar lint y typecheck sin errores

## 17. Pruebas Manuales

- [ ] 17.1 Verificar login/logout con Supabase Auth
- [ ] 17.2 Verificar selección de empresa
- [ ] 17.3 Verificar CRUD de usuarios persiste
- [ ] 17.4 Verificar CRUD de proyectos persiste
- [ ] 17.5 Verificar CRUD de lotes persiste
- [ ] 17.6 Verificar mapa SVG muestra lotes con estados
- [ ] 17.7 Verificar flujo completo: prospecto → oportunidad → reserva → venta → contrato → cuotas
- [ ] 17.8 Verificar registro de pagos actualiza cartera
- [ ] 17.9 Verificar dashboard muestra KPIs reales
- [ ] 17.10 Verificar alertas de IA se muestran
- [ ] 17.11 Verificar tema claro y oscuro
- [ ] 17.12 Verificar responsive en diferentes tamaños
- [ ] 17.13 Verificar que sin VITE_DATA_PROVIDER la aplicacion usa repositorios Supabase
- [ ] 17.14 Verificar que VITE_DATA_PROVIDER=mock activa mocks unicamente de forma explicita
- [ ] 17.15 Verificar que un proveedor invalido impide el inicio con un error claro
- [ ] 17.16 Verificar que errores o credenciales ausentes de Supabase no activan un fallback silencioso a datos ficticios
