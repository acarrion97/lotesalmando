# Spec Delta

## Purpose

Define la experiencia de consulta del visitante en el enlace público
`/mapa/:slug`: cómo se presentan las pestañas y los recursos del proyecto, cómo
se identifica cada lote sobre el plano, cómo se filtra por disponibilidad, cómo
se recorre la ficha y cómo se interactúa con el plano mediante cursor, teclado y
gestos, sin exponer información que solo corresponde a las pantallas internas.

## ADDED Requirements

### Requirement: Etiquetas de identificación de los lotes en el plano

La pestaña Mapa SHALL mostrar sobre cada lote con contorno su identificador
público, que es el número de lote tal como lo trae la fuente de datos (por
ejemplo `H1`, `H10` o `L1.10`). Ese número identifica la manzana por su prefijo
y es único dentro del proyecto, de modo que no hace falta componerlo con el
nombre de la manzana. Los lotes cuyo espacio no alcanza para una lectura cómoda
SHALL quedar sin etiqueta en lugar de mostrar texto ilegible o solapado. El
identificador mostrado SHALL corresponder siempre al lote sobre el que se dibuja.

#### Scenario: Lotes con espacio suficiente

- **WHEN** el visitante observa el plano con los lotes a un tamaño que permite
  leer texto sobre ellos
- **THEN** cada lote con contorno muestra su número de lote asociado a su
  propio polígono

#### Scenario: Lotes demasiado pequeños

- **WHEN** el plano está alejado de forma que los lotes no admiten texto legible
- **THEN** esas etiquetas no se muestran y los polígonos siguen siendo
  seleccionables

#### Scenario: La etiqueta no bloquea la selección

- **WHEN** el visitante hace clic o toca encima de la etiqueta de un lote
- **THEN** se abre la ficha de ese mismo lote, como si hubiera pulsado el
  polígono

#### Scenario: Lote sin identificador disponible

- **WHEN** un lote carece de número de lote
- **THEN** no se genera un identificador a partir de su posición en la lista y
  no se pinta ninguna etiqueta para ese lote

#### Scenario: Legibilidad sobre cualquier estado

- **WHEN** el lote está en cualquiera de los estados comerciales del plano
- **THEN** la etiqueta mantiene un contraste que permite leerla sobre el color
  de relleno de ese estado

### Requirement: Filtros públicos por estado de disponibilidad

La pestaña Mapa SHALL ofrecer un filtro de disponibilidad con una opción **Todos**
y una opción por cada estado comercial soportado. El filtro SHALL derivarse de
los datos ya cargados del plano y SHALL atenuar los lotes que no pertenecen al
conjunto elegido sin modificar su estado comercial. Con el plano abierto no SHALL
haber ningún filtro activo: el estado por defecto es **Todos**.

#### Scenario: Estado inicial sin filtro

- **WHEN** el visitante abre la pestaña Mapa
- **THEN** se muestran todos los lotes con contorno y ninguna opción de filtro
  aparece como activa salvo **Todos**

#### Scenario: Filtrar por un estado

- **WHEN** el visitante elige la opción **Disponibles**
- **THEN** los lotes disponibles permanecen destacados, los que tienen otro
  estado se distinguen atenuados y el estado comercial guardado de cada lote
  queda intacto

#### Scenario: Contadores de todos los estados

- **WHEN** se muestran los conteos por estado que acompañan al filtro
- **THEN** reflejan todos los estados presentes en los datos cargados, no solo
  disponibles, reservados y vendidos, y su suma coincide con el número de lotes
  con contorno

#### Scenario: Estado no cubierto por un filtro puntual

- **GIVEN** lotes en estados como en negociación, bloqueado o no disponible
- **WHEN** el visitante activa el filtro **Disponibles**
- **THEN** esos lotes no aparecen como disponibles y quedan atenuados junto al
  resto de los que no coinciden

#### Scenario: Volver a la vista completa

- **WHEN** el visitante elige **Todos** con un filtro activo
- **THEN** vuelven a mostrarse todos los lotes con contorno y desaparece la
  atenuación

#### Scenario: Cambio de filtro con la ficha abierta

- **GIVEN** la ficha de un lote está abierta
- **WHEN** el visitante activa un filtro que excluye ese lote
- **THEN** la ficha se cierra en lugar de seguir apuntando a un lote que ya no
  se ve en el plano

### Requirement: Navegación de la ficha acotada al filtro activo

Los botones **Anterior**/**Siguiente** de la ficha del lote SHALL recorrer
únicamente los lotes incluidos en el filtro activo. Con el filtro **Todos** la
navegación SHALL recorrer todos los lotes con contorno, de modo que el
comportamiento por defecto es el de siempre.

#### Scenario: Navegando con un filtro activo

- **WHEN** con el filtro **Reservados** activo el visitante pulsa **Siguiente**
- **THEN** la ficha pasa al siguiente lote reservado y no visita lotes de otro
  estado

#### Scenario: Navegación con el filtro en Todos

- **WHEN** sin ningún filtro el visitante pulsa **Siguiente**
- **THEN** la ficha recorre todos los lotes con contorno del plano

#### Scenario: Envolver en los extremos del filtro

- **WHEN** el visitante pulsa **Siguiente** estando en el último lote
  incluido en el filtro
- **THEN** la ficha muestra el primer lote de ese mismo conjunto

#### Scenario: Un solo lote en el filtro

- **WHEN** el filtro activo incluye un único lote
- **THEN** **Anterior** y **Siguiente** mantienen la ficha en ese lote

### Requirement: Zoom por gesto de pinza sobre el plano

El plano SHALL admitir zoom con dos dedos en dispositivos táctiles, dentro de los
mismos límites de escala que los controles existentes. El zoom SHALL aplicarse
sobre el punto del gesto para que el plano no salte, y un gesto de dos dedos no
SHALL seleccionar ningún lote. Al interrumpirse un gesto, el estado del mismo
SHALL quedar limpio para que los gestos siguientes funcionen.

#### Scenario: Acercar y alejar con los dedos

- **WHEN** el visitante junta o separa dos dedos sobre el plano
- **THEN** el plano se acerca o aleja dentro de sus límites de escala y el punto
  bajo los dedos permanece en la misma posición de la pantalla

#### Scenario: El gesto no selecciona lotes

- **WHEN** el visitante realiza un gesto de dos dedos sobre un lote
- **THEN** no se abre ninguna ficha por ese gesto

#### Scenario: Gesto interrumpido

- **GIVEN** un gesto de pincha en curso
- **WHEN** el sistema cancela el puntero o el visitante retira la mano de forma
  inesperada
- **THEN** el gesto se limpia y un gesto nuevo funciona correctamente después

#### Scenario: Desplazamiento con un dedo

- **WHEN** el plano está ampliado y el visitante arrastra un dedo sobre él
- **THEN** la zona visible del plano se desplaza en la dirección del arrastre

#### Scenario: La página fuera del plano sigue siendo desplazable

- **WHEN** el visitante arrastra el dedo sobre el resto de la página pública
- **THEN** la página se desplaza con normalidad, sin interferencia del plano

#### Scenario: Ratón y teclado sin regresión

- **WHEN** un visitante de escritorio usa el ratón o el teclado sobre el plano
- **THEN** siguen funcionando la selección de lotes, los controles de zoom, la
  pantalla completa y el foco de los polígonos

### Requirement: El plano público no amplía los datos expuestos

Las mejoras del plano SHALL servirse del mismo canal de acceso anónimo que ya
usa el enlace público y SHALL devolver exactamente los mismos datos que hoy.
Seleccionar un lote o cambiar el filtro no SHALL provocar ninguna reserva, venta
ni cambio de estado comercial.

#### Scenario: Mismos datos con el filtro cambiado

- **WHEN** el visitante cambia de filtro o amplía el plano
- **THEN** no se solicitan datos de proyectos, clientes o interacciones que el
  enlace público no pedía antes

#### Scenario: Seleccionar no reserva

- **WHEN** el visitante abre la ficha de un lote disponible
- **THEN** el lote sigue estando disponible y no se crea ninguna reserva, venta
  ni registro comercial por esa selección
