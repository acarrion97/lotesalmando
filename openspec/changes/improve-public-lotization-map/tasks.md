# Tasks

## 1. Línea base y confirmación de contratos

- [x] 1.1 Ejecutar `npm run lint` y `npm run build` antes de tocar código y registrar la salida limpia como línea base (verificación: ambos comandos terminan sin errores)
- [x] 1.2 Confirmar por inspección que el cambio asume campos que la RPC ya devuelve (`manzana`, `numero_lote`, `estado`, `poligono`) y que no hace falta ampliarla (verificación: los campos están en `supabase/migrations/015_mapa_publico_superficie_medidas.sql` sobre la función de `011`, y en `src/domain/mapa/entities/`)
- [x] 1.3 Confirmar que este cambio solo añade requisitos con títulos propios a `specs/mapa-publico/visualizacion/spec.md` sin alterar los escritos por `public-map-gallery-financing` (verificación: `openspec validate --changes` devuelve todos los cambios en verde, sin errores ni avisos en este cambio)
- [x] 1.4 Revisar las tareas pendientes de `public-map-gallery-financing` antes de sincronizar o archivar la spec compartida `mapa-publico/visualizacion` (verificación: 8.2 y 8.3 están cerradas, o queda anotado por escrito por qué no proceden cerrarlas; solo entonces se archiva ese cambio, y antes que este)

## 2. Funciones puras y sus verificaciones

- [x] 2.1 Implementar la función que devuelve el identificador público del lote, que es su `numero_lote` tal cual lo trae la fuente de datos (ya identifica la manzana por su prefijo y es único en el proyecto), y añadir `scripts/verificar-identificador-lote.ts` que compruebe el formato, la ausencia de identificador cuando falta el número y que nunca se deriva de un índice (verificación: `node scripts/verificar-identificador-lote.ts` termina sin errores)
- [x] 2.2 Implementar la función de visibilidad de etiquetas: la caja envolvente del polígono proyectada a pantalla debe admitir el texto de esa etiqueta con holgura, usando la misma fuente que pinta el plano, y añadir `scripts/verificar-visibilidad-etiquetas.ts` que verifique que lotes pequeños o textos largos quedan sin etiqueta, que las etiquetas cortas sí se muestran y que el resultado varía con la escala (verificación: `node scripts/verificar-visibilidad-etiquetas.ts` termina sin errores)
- [x] 2.3 Implementar la función que deriva el conjunto filtrado y los conteos por estado a partir de los lotes cargados, cubriendo los seis estados comerciales, y añadir `scripts/verificar-filtros-plano.ts` que verifique que la suma de conteos coincide con el total de lotes con contorno y que los estados fuera de los tres habituales aparecen contados (verificación: `node scripts/verificar-filtros-plano.ts` termina sin errores)

## 3. Etiquetas de los lotes en el plano

- [x] 3.1 Añadir la propiedad de mostrar etiquetas a `PlanoInteractivo` con valor por defecto apagado, siguiendo el precedente de `mostrarPrecio`, y pintar el `<text>` con tamaño compensado por `pxPorUnidad` y `pointerEvents: "none"` (verificación: con la propiedad sin activar, el mapa interno `/mapas` se ve exactamente igual que en la línea base)
- [x] 3.2 Conectar el identificador y la regla de visibilidad de 2.1 y 2.2 al renderizado de etiquetas (verificación: sobre el plano real, cada etiqueta cae dentro de su polígono y su texto cabe en él, y los lotes cuyo texto no cabe quedan sin texto)
- [x] 3.3 Documentar en el JSDoc del componente la regla de identificador y la de visibilidad, y verificar que la descripción coincide con el comportamiento implementado (verificación: la documentación menciona que el texto debe caber en el polígono y que no se pinta identificador cuando falta el número de lote)
- [x] 3.4 Comprobar en navegador la pestaña Mapa pública que: las etiquetas se leen sobre todos los estados, tocar encima de una etiqueta abre la ficha de ese lote y ningún polígono dejó de ser seleccionable (verificación: los tres casos observados en `/mapa/<slug>`)

## 4. Filtros de disponibilidad, contadores y navegación

- [ ] 4.1 Hacer clicables los ítems de `LeyendaPlano` mediante propiedades nuevas con valor por defecto que dejan la leyenda actual sin cambios (verificación: en `/mapas` la leyenda sigue mostrando conteos y ningún ítem responde al clic)
- [ ] 4.2 Añadir el estado del filtro en `MapaPublicoPage` y traducirlo a `resaltados` sin modificar el contrato de esa propiedad (verificación: al elegir "Disponibles" se atenúan los demás y el campo `estado` de ningún lote cambia tras el filtrado)
- [ ] 4.3 Derivar los conteos de la leyenda y del resumen superior desde los lotes cargados con la función de 2.3, en lugar de `estadisticas` (verificación: la suma de los conteos coincide con el número de lotes con contorno y aparecen estados fuera de disponibles/reservados/vendidos)
- [ ] 4.4 Acotar `Anterior`/`Siguiente` de la ficha al filtro activo y cerrar la ficha cuando el lote queda fuera del filtro (verificación: con "Reservados" se salta lotes de otros estados, con "Todos" recorre el plano completo y cambiar de filtro con la ficha abierta la cierra)
- [ ] 4.5 Comprobar en navegador los escenarios del filtro: estado inicial sin filtro, filtrar, volver a "Todos", contadores coherentes y cierre de ficha al quedar fuera (verificación: los cinco casos observados en la pestaña Mapa pública)

## 5. Zoom por gesto de pinza (prerrequisito: dispositivo real)

- [ ] 5.1 Realizar el spike en un dispositivo táctil para decidir la estrategia de `touch-action` que deja un dedo para desplazar y dos para el pinch sin que el navegador amplíe la página, y registrar el resultado en `design.md` (verificación: la nota del spike queda escrita con el valor elegido y su justificación)
- [ ] 5.2 Añadir el seguimiento de punteros por `pointerId`, el manejo de `pointercancel` y la supresión del clic al terminar un gesto de dos dedos (verificación: un pinch sobre un lote no abre su ficha y un puntero cancelado no deja el visor bloqueado)
- [ ] 5.3 Ampliar `cambiarZoom` con un centro explícito opcional sin alterar el comportamiento actual cuando no se pasa (verificación: el zoom por botones sigue conservando el centro del contenedor y "Ver completo" sigue funcionando igual)
- [ ] 5.4 Implementar el pinch con anclaje al centro del gesto respetando los límites de escala existentes (verificación: en el dispositivo, el punto bajo los dedos no se desplaza al pellizcar y el zoom no supera 6x ni baja de 1x)
- [ ] 5.5 Comprobar en el dispositivo el desplazamiento con un dedo sobre el plano ampliado, el desplazamiento de la página fuera del plano y que los gestos interrumpidos no dejan el visor inservible (verificación: los tres casos observados en el dispositivo)

## 6. Validación final y comprobación en navegador

- [ ] 6.1 Ejecutar los tres scripts de verificación, `npm run lint` y `npm run build` y confirmar que pasan todos (verificación: comandos en verde, sin errores)
- [ ] 6.2 Recorrer la pestaña Mapa pública completa en navegador: etiquetas, filtros, contadores, ficha con navegación, simulador de financiamiento y registro de interés siguen funcionando (verificación: checklist cumplido en `/mapa/<slug>`)
- [ ] 6.3 Recorrer el mapa interno `/mapas` sin regresiones: selección por manzana, edición de polígonos con imán, asistente de detección, leyenda sin clic y sin etiquetas (verificación: checklist cumplido en `/mapas`)
- [ ] 6.4 Verificar que no se modificó la RPC ni se añadieron datos al enlace público (verificación: `git diff supabase/` sin cambios)
- [ ] 6.5 Verificar que no se añadieron dependencias y que la validación de specs sigue en verde (verificación: `git diff package.json package-lock.json` sin cambios y `openspec validate --changes` con todos los cambios en verde)
