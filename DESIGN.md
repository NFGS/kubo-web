---
name: Kubo Web
description: PWA offline-first de ERP + CRM para PYMES — dashboard claro sobre navy profundo con acento azul royal.
colors:
  primary: "#2563eb"
  primary-deep: "#1d4ed8"
  primary-soft: "#dbeafe"
  primary-tint: "#93c5fd"
  ink-900: "#0b1220"
  ink-800: "#16233d"
  ink-700: "#344563"
  mist: "#c7d0dd"
  periwinkle: "#e4ecff"
  edge: "#e6eaf0"
  rowline: "#eef2f7"
  canvas: "#f8fafc"
  success-soft: "#dcfce7"
  success-deep: "#15803d"
  warning-soft: "#fef3c7"
  warning-deep: "#b45309"
  danger: "#dc2626"
  danger-soft: "#fee2e2"
  danger-deep: "#b91c1c"
  info-soft: "#dbeafe"
  info-deep: "#1d4ed8"
  violet-soft: "#ede9fe"
  violet-deep: "#7c3aed"
  pink-soft: "#fce7f3"
  pink-deep: "#be185d"
typography:
  page-title:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
  section-label:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.05em"
  body:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  secondary:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  card: "16px"
  control: "12px"
  pill: "9999px"
spacing:
  cell: "12px"
  card: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink-700}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink-900}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  nav-item-active:
    backgroundColor: "{colors.ink-800}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success-deep}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design System: Kubo Web

## Overview

**Creative North Star: "El Puente de Mando"**

Kubo se ve como el puente de mando de un barrio de comercio: casco navy profundo (sidebar y barras de título), cubierta diurna y aireada (contenido claro sobre blanco), instrumentos azul royal (acciones, enlaces, datos activos) y luces de señal pastel (badges de estado). La densidad es de herramienta de trabajo diario: mucho aire (padding 20-24px), jerarquía tipográfica discreta y color vivo solo donde hay acción o estado.

El lenguaje proviene de una referencia de dashboard SaaS de salud: sidebar navy a altura completa con wordmark blanco, ítem activo en pastilla navy más clara (nunca azul), tarjetas blancas de borde fino, cabeceras de tabla periwinkle y gráficas con degradados azul/verde. Todo texto sostiene contraste WCAG AA (≥4.5:1).

**Key Characteristics:**
- Sidebar navy #0b1220 a altura completa; ítem activo = pastilla #16233d con texto blanco.
- Acento único azul royal #2563eb para acciones, enlaces y series de datos.
- Badges pastel (verde/rojo/ámbar/azul/violeta/rosa) con texto en paso oscuro para AA.
- Barras de título de página navy redondeadas (16px) con título blanco bold.
- Tablas con cabecera periwinkle #e4ecff y texto navy semibold; divisores #eef2f7.
- Inter Variable self-hosted (offline-first, sin CDN).

## Colors

Un acento vivo sobre una base navy/blanca; el estado se expresa en pastel.

### Primary
- **Azul Royal** (#2563eb, token `kubo-600`): botones primarios, enlaces/acciones, iconos de acción en hover, precio en el POS. Hover en #1d4ed8 (`kubo-700`).
- **Azul Suave** (#dbeafe, `kubo-100`): fondos de insignia info, tile de icono KPI info, anillo de foco de inputs.

### Secondary (semánticos de estado)
- **Verde** (#22c55e series / #dcfce7 pastel / #15803d texto): éxito, serie de barras de ranking, diferencia cuadrada de caja.
- **Rojo** (#dc2626 botón peligro / #fee2e2 pastel / #b91c1c texto): peligro y error.
- **Ámbar** (#fef3c7 pastel / #b45309 texto): advertencia y stock bajo.
- **Violeta** (#ede9fe / #7c3aed): estado "Suspendido" (plataforma).
- **Rosa** (#fce7f3 / #be185d): etiquetas tipo "API error" (tono `pink`, disponible).

### Neutral
- **Navy Tinta** (#0b1220 / #16233d / #344563, tokens `ink-900/800/700`): sidebar, barras de título, pastilla activa, texto fuerte.
- **Bruma** (#c7d0dd, `mist`): etiquetas del sidebar y subtítulos sobre navy.
- **Periwinkle** (#e4ecff): fondo de cabeceras de tabla.
- **Borde** (#e6eaf0, `edge`): borde 1px de tarjetas e inputs.
- **Línea de fila** (#eef2f7, `rowline`): divisores de filas de tabla.
- **Lienzo** (#f8fafc): fondo de la aplicación; las tarjetas son blancas sobre él.

### Named Rules
**La Regla del Navy Estructural.** El navy es estructura (sidebar, barras, texto); nunca acción. El azul royal es acción y dato; nunca estructura. No se mezclan.
**La Regla del Pastel AA.** Toda insignia pastel lleva su texto en el paso -700 de la misma familia (violeta usa -600, que ya sostiene 4.8:1). Los pares exactos de la referencia que caían bajo 4.5:1 (ámbar-600, rojo-600, rosa-600 sobre su pastel) se subieron a -700.

## Typography

**Display/Body Font:** Inter Variable (self-hosted vía `@fontsource-variable/inter`, fallback `Inter`, `ui-sans-serif`, `system-ui`)
**Label/Mono Font:** misma Inter; datos tabulares y códigos SKU en `font-mono` del sistema.

**Character:** una sola familia variable, neutra y de alta legibilidad para una herramienta de operación diaria; la jerarquía se construye con peso, caja alta y tracking, no con familias distintas.

### Hierarchy
- **Título de página** (700, 18px, blanco): dentro de la barra navy redondeada; subtítulo 14px en bruma.
- **Etiqueta de sección** (600, 12px, uppercase, tracking 0.05em, slate-500): títulos de Card y cabeceras de tabla (estas últimas en navy sobre periwinkle).
- **Cuerpo** (400, 14px): texto de trabajo.
- **Secundario** (400, 12-13px, slate-500): pistas, metadatos, ejes de gráficas (#64748b).

## Layout

Sidebar fijo de 256px (navy) a altura completa; en móvil se desliza con backdrop navy translúcido. Barra superior sticky blanca (estado de conexión, cola pendiente, sincronizar, menú móvil). Cada página abre con su barra de título navy redondeada (16px, padding 20px) alineada a la izquierda con acciones a la derecha. El contenido fluye en tarjetas blancas con separación vertical de 24px y rejillas responsivas (KPIs 1→2→4 columnas).

## Elevation & Depth

Plano por defecto. Una sola sombra ambiental en tarjetas (`0 1px 2px rgb(11 18 32 / 0.04)`) y `shadow-xl` solo en el panel del modal. La profundidad de las tablas la dan el fondo periwinkle de cabecera y los divisores de fila; la del sidebar, la pastilla activa más clara.

## Shapes

Tarjetas y barras de título: 16px. Botones, inputs y selects: 12px. Insignias: pastilla completa. Bordes 1px `edge` en tarjetas e inputs; nada de bordes gruesos ni dobles.

## Components

### Buttons
- **Shape:** 12px, padding 10px 16px, 14px semibold.
- **Primary:** azul royal #2563eb, hover #1d4ed8, disabled #93c5fd.
- **Secondary:** blanco, texto navy #344563, borde `edge`, hover slate-50.
- **Danger:** #dc2626, hover #b91c1c.
- **Focus:** anillo global `*:focus-visible` (outline 2px azul royal, offset 2px).

### Badges (pastillas de estado)
- **Shape:** pastilla, 12px semibold, padding 4px 10px.
- **Tones:** neutral (slate-100/slate-700), success, warning, danger, info (kubo-100/kubo-700), violet, pink. Texto siempre en paso AA (ver Regla del Pastel AA).

### Tables
- **Cabecera:** fila con fondo periwinkle #e4ecff, texto navy #16233d semibold 12px uppercase, celdas con padding 10px 12px.
- **Filas:** blancas, divisores #eef2f7, hover slate-50.
- **Acciones:** iconos slate-400 que al hover pasan a azul royal (editar) o rojo (borrar) sobre slate-100.

### Cards / Containers
- **Corner:** 16px; borde 1px #e6eaf0; sombra ambiental única; padding 20px.
- **Título:** etiqueta de sección 12px uppercase con tracking; acción opcional a la derecha.

### Inputs / Fields
- **Style:** blanco, borde 1px #e6eaf0, radio 12px, texto navy #0b1220.
- **Focus:** borde #3b82f6 + anillo 2px #dbeafe.
- **Labels:** 12px uppercase semibold slate-600 sobre el campo.

### Navigation (sidebar)
- **Wordmark:** "KUBO." blanco bold uppercase con tracking 0.2em junto al cuadro K azul royal.
- **Items:** icono 18px + etiqueta en bruma #c7d0dd; hover slate translúcido; activo = pastilla #16233d con texto blanco.
- **Pie:** tarjeta navy #16233d con negocio/correo/rol y "Cerrar sesión" fijados abajo.

### Signature: barra de título navy
Cada página dentro del layout abre con una barra navy #0b1220 redondeada (16px) con título blanco 18px bold y subtítulo en bruma; los botones y badges de la página conviven sobre ella.

### Charts (recharts)
- **Serie principal (ventas):** barras verticales con degradado #93c5fd → #2563eb.
- **Ranking (top productos):** barras con degradado #86efac → #22c55e.
- **Donut (medios de pago):** pastel menta #a7f3d0, azul #93c5fd, rosa #f9a8d4, ámbar #fcd34d, violeta #c4b5fd, con la cuota del medio dominante al centro.
- **Ejes y tooltip:** texto #64748b; tooltip blanco con borde `edge`.

## Do's and Don'ts

### Do:
- **Do** recolorear desde los tokens de `@theme` en `src/index.css` (`kubo-*`, `ink-*`, `edge`, `rowline`, `periwinkle`, `mist`); los nombres son estables.
- **Do** mantener el texto de badges en el paso -700 (violeta -600) para sostener AA.
- **Do** usar azul royal solo para acciones, enlaces y datos activos.
- **Do** mantener `focus-visible` (outline azul) y el focus-trap del modal intactos.
- **Do** self-hostear activos tipográficos (offline-first); nada de CDN de fuentes.
- **Do** sobre las barras navy, usar texto claro (`mist`/blanco) y controles con borde claro: los filtros y etiquetas que viven ahí no pueden llevar texto oscuro (contraste AA).

### Don't:
- **Don't** usar esmeralda/rosa (verde/rojo de la referencia) ni colores fuera del set semántico.
- **Don't** poner iconos grises sobre fondos de color en hover (regla del detector: gray-on-color); usar slate-100 + icono de color.
- **Don't** usar azul royal en el ítem activo del sidebar (es pastilla navy #16233d).
- **Don't** introducir hex crudos en componentes; los degradados de recharts son la única excepción documentada.
- **Don't** apilar sombras; la elevación es la ambiental de tarjeta y la del modal, nada más.
