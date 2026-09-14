## Purpose

Sistema de temas con paleta Lotes al Mando (azul petróleo, verde esmeralda, dorado mineral) para tema claro y oscuro en Ant Design.

## ADDED Requirements

### Requirement: Brand palette

El tema SHALL usar colores: azul petróleo #082B33, verde esmeralda #10B981, dorado mineral #C7A35A.

#### Scenario: Paleta definida

- WHEN el sistema carga el tema
- THEN SHALL usar los colores de marca definidos en toda la interfaz

### Requirement: Light theme

Tema claro con fondo #F7F8F5, primary #082B33, cards #FFFFFF, text #102A2E.

#### Scenario: Activar tema claro

- WHEN el usuario selecciona tema claro
- THEN el sistema SHALL aplicar: fondo #F7F8F5, primary #082B33, cards #FFFFFF, text #102A2E

### Requirement: Dark theme

Tema oscuro con fondo #061D23, primary #10B981 (verde), cards #0D3740, text #F7F8F5.

#### Scenario: Activar tema oscuro

- WHEN el usuario selecciona tema oscuro
- THEN el sistema SHALL aplicar: fondo #061D23, primary #10B981, cards #0D3740, text #F7F8F5

### Requirement: Theme toggle

El usuario SHALL poder cambiar entre claro, oscuro y sistema.

#### Scenario: Cambio manual

- WHEN el usuario selecciona tema claro u oscuro
- THEN el sistema SHALL aplicar inmediatamente el tema seleccionado

#### Scenario: Modo sistema

- WHEN el usuario selecciona modo sistema
- THEN el sistema SHALL detectar preferencia del SO y aplicar tema claro u oscuro accordingly

#### Scenario: Persistencia

- WHEN el usuario cambia de tema
- THEN el sistema SHALL guardar la selección y restaurarla en sesiones futuras

### Requirement: CSS variables

Los colores SHALL exponerse como CSS variables para uso fuera de Ant Design.

#### Scenario: Variables disponibles

- WHEN el tema está activo
- THEN el sistema SHALL exponer variables CSS como --color-primary, --color-background, --color-text, etc.

#### Scenario: Uso en componentes custom

- WHEN un componente requiere estilos fuera de Ant Design
- THEN SHALL poder usar las CSS variables para mantener consistencia

### Requirement: Visual rule

Regla visual: azul=estructura, verde=acción, dorado=valor, rojo=error.

#### Scenario: Aplicación de regla

- WHEN el sistema renderiza componentes
- THEN SHALL usar azul para elementos de estructura, verde para acciones, dorado para valores, rojo para errores

### Requirement: Proporciones

Proporciones: light 60% fondo/25% azul/12% verde/3% dorado; dark 55% fondo/25% azul/15% verde/5% dorado.

#### Scenario: Proporciones en tema claro

- WHEN el tema claro está activo
- THEN el sistema SHALL mantener proporciones: 60% fondo, 25% azul, 12% verde, 3% dorado

#### Scenario: Proporciones en tema oscuro

- WHEN el tema oscuro está activo
- THEN el sistema SHALL mantener proporciones: 55% fondo, 25% azul, 15% verde, 5% dorado

### Requirement: Accessibility

Cada color SHALL tener suficiente contraste WCAG AA.

#### Scenario: Contraste de texto

- WHEN se renderiza texto sobre fondo
- THEN el contraste SHALL cumplir WCAG AA (mínimo 4.5:1 para texto normal, 3:1 para texto grande)

#### Scenario: Colores de estado

- WHEN se muestran colores de estado (éxito, error, advertencia)
- THEN SHALL tener contraste suficiente sobre fondo claro y oscuro
