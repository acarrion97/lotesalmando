## 1. Base de datos y almacenamiento

- [x] 1.1 Crear `supabase/migrations/011_proyecto_medios.sql`: tabla `proyecto_medios` (id, id_proyecto FK cascade, tipo `imagen|video`, url, orden, created_at) con índice por proyecto
- [x] 1.2 Agregar a la migración el bucket `medios` (público, 50 MB, `image/png|jpeg|webp` + `video/mp4|webm`) y las políticas de `storage.objects` equivalentes a la migración 009
- [x] 1.3 Reemplazar en la migración la función `mapa_publico(slug)` para devolver también `precio_lista` por lote, `medios` (url y tipo en orden de carga), `estadisticas` (total/disponibles/reservados/vendidos) y `moneda` desde `configuracion`
- [x] 1.4 Ejecutar la migración en el SQL Editor de Supabase y verificar con `select public.mapa_publico('<slug>')` que los campos nuevos llegan — **pendiente del usuario**: no hay CLI de Supabase ni clave de servicio en el repo, así que no puede ejecutarse desde la agente

## 2. Dominio y aplicación (medios del proyecto)

- [x] 2.1 Crear `src/domain/proyecto/entities/ProyectoMedio.ts` (id, id_proyecto, tipo, url, orden) y `src/domain/proyecto/repositories/ProyectoMedioRepository.ts` (getByProyectoId, add, remove) con sus `index.ts`
- [x] 2.2 Crear el puerto `src/application/proyectos/ports/ProyectoMedioStorage.ts` (upload con validación de tipo/tamaño, removeByUrl; exporta además `validarArchivoMedio` que reutiliza la UI)
- [x] 2.3 Crear los casos de uso `SubirMedioProyecto` (sube y registra, borra el archivo si falla el registro), `QuitarMedioProyecto` (borra fila y objeto best-effort) y `GetMediosProyecto`
- [x] 2.4 Registrar los casos de uso y repositorios nuevos en `create-use-cases.ts` y `create-repositories.ts` para los proveedores `supabase` y `mock`

## 3. Infraestructura

- [x] 3.1 Implementar `SupabaseProyectoMedioStorage` (bucket `medios`, path `proyecto-<id>/<timestamp>-<nombre>`, límites 10 MB imagen / 50 MB video)
- [x] 3.2 Implementar `SupabaseProyectoMedioRepository` sobre la tabla `proyecto_medios`
- [x] 3.3 Implementar `MockProyectoMedioRepository` y `MockProyectoMedioStorage` con datos de ejemplo, y actualizar `MockMapaRepository` para que el modo mock devuelva `medios`, `estadisticas`, `moneda` y `precio_lista`

## 4. Configuración (carga de fotos y videos)

- [x] 4.1 Crear el hook `useMediosProyecto` (query + mutaciones de subir/borrar) siguiendo la convención de `presentation/hooks` y exportarlo en `hooks/index.ts`
- [x] 4.2 Crear el componente `GaleriaProyectoCard` (selector de proyecto, upload con prevalidación de formato/tamaño, lista con miniaturas de imagen y video, borrado con confirmación) y montarlo en `ConfiguracionPage` debajo de la tarjeta "Mapa del proyecto"
- [x] 4.3 Actualizar el copy de `EnlacePublicoMapa` y de la tarjeta de Configuración para explicar que la galería aparece en el enlace público y que el precio se muestra al elegir un lote

## 5. Datos públicos

- [x] 5.1 Ampliar `MapaPublico` y `PlanoLote` (`src/domain/mapa/entities`) con `medios`, `estadisticas`, `moneda` y `precio_lista`
- [x] 5.2 Mapear los campos nuevos en `SupabaseMapaRepository.getPublicoBySlug`

## 6. Componentes públicos

- [x] 6.1 Crear el helper puro `src/utils/financiamiento/calcularFinanciamiento.ts` (monto financiado, cuota francesa, intereses y total, con `tasa = 0`) y exportarlo desde `src/utils/index.ts`
- [x] 6.2 Crear el componente `CarruselMedios` (imagen o video, flechas anterior/siguiente con envolvimiento, contador "n de m", miniaturas y navegación con teclado)
- [x] 6.3 Crear el componente `CalculadoraFinanciamiento` (precio, enganche %, plazo en meses, tasa anual %, resultados, validaciones de rango, selector de lote y formato según la moneda)
- [x] 6.4 Crear el componente `FichaLotePublico` (modal con manzana, número, estado, precio y botones Anterior/Siguiente)

## 7. Página pública con pestañas

- [x] 7.1 Refactorizar `MapaPublicoPage` para usar `Tabs` con Galería / Mapa / Financiamiento y reflejar la pestaña activa en `?tab=`, abriendo en Mapa cuando no hay medios
- [x] 7.2 Conectar la pestaña Galería con `CarruselMedios`, la pestaña Mapa con `PlanoInteractivo` (clic que abre `FichaLotePublico`, sin `mostrarPrecio` en tooltips) y la pestaña Financiamiento con la calculadora y el resumen del proyecto
- [x] 7.3 Implementar estados vacíos: sin medios, sin plano, mapa no encontrado, y el enlace "ver en el mapa" desde la calculadora hacia la ficha del lote

## 8. Verificación

- [x] 8.1 Ejecutar `npm run lint` y `npm run build` sin errores — ambos **pasan** (`eslint .` 0 problemas; `tsc -b && vite build` genera el bundle)
- [ ] 8.2 Prueba manual (pendiente: no hay navegador de escritorio conectado a la sesión; la migración 011 ya está aplicada): subir una foto y un video en Configuración, abrir `/mapa/<slug>`, navegar el carrusel con flechas y teclado, hacer clic en un lote y ver precio + ficha, y simular financiamiento con y sin lote elegido
- [ ] 8.3 Probar el modo mock (pendiente: publicar un mapa en modo mock exige iniciar sesión en Supabase, que no está mockeado) (`VITE_DATA_PROVIDER=mock`) para confirmar que la página pública y la tarjeta de galería renderizan sin backend
