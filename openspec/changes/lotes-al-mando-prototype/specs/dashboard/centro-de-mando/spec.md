## Purpose

Dashboard ejecutivo que consolida indicadores de inventario, ventas y cartera para visión general del negocio.

## ADDED Requirements

### Requirement: KPI cards

El dashboard SHALL mostrar: lotes disponibles, reservados, vendidos, ventas del mes, cartera total, cartera vencida, morosidad %.

#### Scenario: Visualización de KPIs

- WHEN el usuario accede al dashboard
- THEN el sistema SHALL mostrar tarjetas con los KPIs principales actualizados

#### Scenario: KPI sin datos

- WHEN no hay datos para un KPI
- THEN el sistema SHALL mostrar valor "0" o "N/A" según corresponda

### Requirement: Real-time data

Los indicadores SHALL calcularse desde datos reales de Supabase.

#### Scenario: Cálculo en tiempo real

- WHEN el usuario carga el dashboard
- THEN el sistema SHALL ejecutar queries a Supabase para obtener datos actualizados

#### Scenario: Actualización automática

- WHEN cambian datos en el sistema
- THEN el dashboard SHALL reflejar los cambios al recargar o actualizar

### Requirement: Project filter

El dashboard SHALL filtrar por proyecto.

#### Scenario: Filtro por proyecto

- WHEN el usuario selecciona un proyecto en el filtro
- THEN el sistema SHALL recalcular todos los KPIs filtrados por dicho proyecto

#### Scenario: Sin filtro

- WHEN el usuario no selecciona proyecto
- THEN el sistema SHALL mostrar KPIs consolidados de todos los proyectos

### Requirement: Period comparison

El dashboard SHALL comparar mes actual vs mes anterior.

#### Scenario: Comparación mensual

- WHEN se muestra el dashboard
- THEN el sistema SHALL calcular variación porcentual entre mes actual y anterior para cada KPI

### Requirement: Quick actions

El dashboard SHALL permitir acceso rápido a funcionalidades clave.

#### Scenario: Acciones disponibles

- WHEN el usuario visualiza el dashboard
- THEN el sistema SHALL mostrar botones de acceso rápido a: nuevo prospecto, nuevo lote, registrar pago, ver inventario

### Requirement: Loading states

El dashboard SHALL mostrar skeletons durante carga.

#### Scenario: Carga inicial

- WHEN el dashboard está cargando datos
- THEN el sistema SHALL mostrar skeletons animados en lugar de datos vacíos

#### Scenario: Error de carga

- WHEN falla la carga de datos del dashboard
- THEN el sistema SHALL mostrar mensaje de error con opción de reintentar
