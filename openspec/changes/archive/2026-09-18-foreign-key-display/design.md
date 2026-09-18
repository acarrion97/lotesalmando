## Context

El sistema tiene 24 llaves foráneas en 11 páginas que muestran IDs numéricos crudos. Los hooks para cargar datos de referencia ya existen (useEmpresas, useLotes, useUsuarios, etc.). No hay patrón existente para resolver IDs a nombres.

## Goals / Non-Goals

**Goals:**
- Crear hook genérico `useLookup` para resolver IDs a nombres
- Modificar 11 páginas para usar el hook
- Mantener compatibilidad con datos existentes

**Non-Goals:**
- Cambiar repositorios o hacer JOINs en Supabase
- Crear nuevos endpoints o APIs
- Modificar la estructura de entidades

## Decisions

### 1. Hook Genérico vs Hooks Específicos
**Decisión:** Hook genérico `useLookup` que acepta parámetros.
**Razón:** Un solo hook reutilizable vs múltiples hooks específicos. Más mantenible.
**Alternativa:** Crear useEmpresaName, useLoteName, etc. - rechazado por duplicación.

### 2. Lookup en Componente vs en Hook de Datos
**Decisión:** Lookup en el componente usando los hooks de datos existentes.
**Razón:** No rompe los repositorios existentes, cada componente decide qué resolver.
**Alternativa:** Enriquecer los repositorios con JOINs - rechazado por acoplamiento.

### 3. Estrategia de Fallback
**Decisión:** Mostrar ID con prefijo descriptivo (ej: "Lote #123").
**Razón:** Informativo para el usuario cuando el dato no está disponible.
**Alternativa:** Mostrar "N/A" - rechazado por menos informativo.

### 4. Cache de Datos de Referencia
**Decisión:** Reutilizar los hooks existentes que ya usan TanStack Query.
**Razón:** Ya tienen cache automático, no se duplican consultas.
**Alternativa:** Crear cache separado - rechazado por innecesario.

## Risks / Trade-offs

### Risk: Performance con muchos registros
**Mitigación:** Los datos de referencia (empresas, usuarios, lotes) suelen ser pocos registros. TanStack Query maneja el cache.

### Risk: Datos no cargados aún
**Mitigación:** El hook retorna undefined hasta que los datos se carguen, y el componente muestra el fallback.

## Migration Plan

1. Crear hook `useLookup`
2. Modificar páginas una por una
3. Verificar que no hay errores de TypeScript
4. Probar en navegador

## Open Questions

- ¿Los campos de label son correctos? (razon_social, numero_lote, nombres, etc.)
- ¿Qué fallback es preferido: "ID {id}" o "{Entidad} #{id}"?
