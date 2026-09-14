## Why

**Lotes al Mando** es una plataforma PropTech SaaS B2B que busca centralizar la gestión, comercialización y cobranza de proyectos inmobiliarios de lotización. Actualmente, el proyecto base (`crmlotesec`) tiene una arquitectura Clean Architecture funcional con mock data, pero sin persistencia real, sin auth real, y con una estructura de carpetas que no refleja la modularidad del negocio. El sistema necesita evolucionar de un prototipo con mocks a un producto funcional con Supabase, identidad visual de marca, y los módulos completos del negocio.

## What Changes

- **Copia y renombrado**: migrar `crmlotesec` a `lotesalmando`, renombrar proyecto a "Lotes al Mando"
- **Reestructura modular**: de capas flat (`domain/`, `application/`) a módulos autocontenidos (`modules/auth/`, `modules/proyectos/`, `modules/lotes/`, etc.)
- **Tema de marca**: implementar paleta Lotes al Mando (azul petróleo `#082B33`, verde esmeralda `#10B981`, dorado mineral `#C7A35A`) en Ant Design, con tema claro y oscuro
- **Supabase como backend predeterminado**: reemplazar repositorios mock con implementaciones Supabase (PostgreSQL, Auth, RLS, Storage); los datos ficticios solo estarán disponibles cuando `VITE_DATA_PROVIDER=mock` se configure explícitamente
- **Auth real**: Supabase Auth con email/password, multi-empresa desde el día uno
- **Multi-empresa**: todas las tablas principales con `empresa_id`, RLS por empresa
- **Módulos nuevos**: asesores (entidad independiente de usuarios), prospectos, pipeline/oportunidades, actividades de seguimiento
- **Mando IA v1**: motor de reglas para alertas (inventario, seguimiento, morosidad), no IA generativa
- **Validación Zod**: esquemas de validación en formularios clave
- **CRUD real**: operaciones de edición y eliminación que persistan en Supabase

## Capabilities

### New Capabilities

- `auth/supabase-auth`: Autenticación con Supabase Auth, login/logout, sesiones, protección de rutas
- `empresas/multi-empresa`: Gestión multi-empresa con RLS, selección de empresa, aislamiento de datos
- `usuarios/gestion`: CRUD de usuarios con roles, asignación a empresas
- `proyectos/gestion`: CRUD de proyectos, etapas, manzanas — administración del portafolio inmobiliario
- `lotes/inventario`: Gestión de lotes con estados (disponible, reservado, en negociación, vendido, bloqueado), mapa interactivo SVG
- `prospectos/crm`: Prospectos, seguimiento, actividades, pipeline de ventas, oportunidades
- `asesores/gestion`: Entidad asesor independiente de usuario (código, nombre comercial, meta ventas, estado), rendimiento
- `ventas/transacciones`: Reservas, ventas, contratos, flujo completo de comercialización
- `cartera/pagos`: Planes de pago, cuotas, pagos, estados (al día, próximo a vencer, vencido, en mora, pagado)
- `dashboard/centro-de-mando`: Dashboard ejecutivo con KPIs calculados desde inventario + ventas + cartera
- `ia/alertas`: Motor de reglas para alertas de inventario, seguimiento comercial y morosidad
- `theme/marca`: Sistema de temas con paleta Lotes al Mando, tema claro/oscuro, CSS variables

### Modified Capabilities

- (ninguna — este es un cambio nuevo desde cero)

## Impact

- **Código**: migración completa de `src/` — reestructura de carpetas, renombrado de imports, movimiento de archivos
- **Dependencias**: instalar `@supabase/supabase-js`, mantener antd + TanStack Query + Zod + react-router-dom
- **Infraestructura**: crear proyecto Supabase, diseñar esquema PostgreSQL, configurar RLS, crear Edge Functions para servicios externos
- **Auth**: reemplazar mock auth (4 usuarios hardcoded) por Supabase Auth real
- **Datos**: migrar los datos iniciales a Supabase como seed data y crear repositorios Supabase para cada entidad; la aplicación no usará datos ficticios en tiempo de ejecución salvo configuración explícita
- **Tema**: reemplazar tokens Ant Design defaults por paleta de marca
- **Segmento objetivo**: desarrolladores de lotes, urbanizadores, gerentes, equipos de ventas, responsables de cartera
