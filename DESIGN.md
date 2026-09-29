---
name: Healty App
description: Entrená · Superá · Vive Mejor — entrenador personal con IA, PWA mobile-first.
colors:
  lima-voltaje: "#c8f135"
  tinta: "#000000"
  fondo-claro: "#ffffff"
  fondo-claro-secundario: "#f5f5f7"
  texto-claro-primario: "#0a0a0a"
  texto-claro-secundario: "#56565b"
  texto-claro-terciario: "#6e6e73"
  borde-claro: "#e5e5ea"
  fondo-oscuro: "#121214"
  fondo-oscuro-secundario: "#1c1c1f"
  fondo-oscuro-elevado: "#232326"
  texto-oscuro-primario: "#f5f5f7"
  texto-oscuro-secundario: "#aeaeb2"
  texto-oscuro-terciario: "#8e8e93"
  borde-oscuro: "#2c2c30"
  carbon-hero: "#0a0a0a"
  racha-naranja: "#f97316"
  semana-cielo: "#0ea5e9"
  sesion-violeta: "#8b5cf6"
  alerta-rojo: "#ef4444"
  tinta-lima-claro: "#3f6212"
  estado-bien-claro: "#3f6212"
  estado-info-claro: "#1d4ed8"
  estado-alerta-claro: "#b45309"
  estado-mal-claro: "#b91c1c"
  grafico-lima-claro: "#65a30d"
typography:
  display:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "48px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.025em"
  headline:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.05em"
  metric:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tnum"
  title:
    fontFamily: "Plus Jakarta Sans, -apple-system, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Plus Jakarta Sans, -apple-system, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: "Plus Jakarta Sans, -apple-system, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.05em"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  hero-pill: "32px"
  full: "9999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
components:
  button-primary:
    backgroundColor: "{colors.lima-voltaje}"
    textColor: "{colors.tinta}"
    typography: "{typography.label}"
    rounded: "{rounded.2xl}"
    padding: "16px 24px"
  button-primary-compact:
    backgroundColor: "{colors.lima-voltaje}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.fondo-oscuro-secundario}"
    textColor: "{colors.texto-oscuro-primario}"
    rounded: "{rounded.2xl}"
    padding: "14px 16px"
  input:
    backgroundColor: "{colors.fondo-oscuro-secundario}"
    textColor: "{colors.texto-oscuro-primario}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "16px"
  card:
    backgroundColor: "{colors.fondo-oscuro-secundario}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  card-hero:
    backgroundColor: "{colors.carbon-hero}"
    rounded: "{rounded.3xl}"
    padding: "20px"
  stat-chip:
    backgroundColor: "{colors.carbon-hero}"
    textColor: "{colors.texto-oscuro-primario}"
    typography: "{typography.metric}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  nav-bar:
    textColor: "{colors.texto-oscuro-terciario}"
    typography: "{typography.label}"
    height: "64px"
  nav-bar-active:
    textColor: "{colors.texto-oscuro-primario}"
  nav-coach:
    backgroundColor: "{colors.lima-voltaje}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.full}"
    size: "36px"
---

# Design System: Healty App

## Overview

**Creative North Star: "El Tablero del Atleta"**

Healty se lee como el tablero de un auto deportivo o la pantalla de un wearable: fondo casi negro, métricas grandes y claras, y un único indicador encendido (Lima Voltaje) que marca lo que está activo o lo próximo que hay que hacer. La información se escanea de un vistazo, con una mano, entre series. Los números mandan: racha, sesiones, series y cargas van en Bebas Neue, condensado y alto, como los dígitos de un cronómetro.

La densidad es media. Las tarjetas son generosas y redondeadas, pensadas para el pulgar, y la jerarquía sale del tamaño y del contraste, no del color. La fotografía atlética aparece como fondo del hero, del welcome y de nutrición, siempre con un degradé oscuro y paneles de vidrio ahumado que mantienen el texto legible. Todo lo demás es tonal: capas de gris carbón sobre negro.

El sistema soporta tema claro y oscuro (`auto` por defecto, según el sistema operativo), pero la identidad nace en oscuro. El hero sigue siendo negro incluso en tema claro.

**Key Characteristics:**
- Un solo color de acento, Lima Voltaje, como indicador activo.
- Métricas en Bebas Neue con números tabulares.
- Superficies tonales de carbón; las sombras son secundarias.
- Foto a sangre con degradé y vidrio ahumado en los heroes.
- Componentes táctiles: radios grandes y un spring de "hundirse" al tocar.
- Labels chicos en mayúsculas con tracking amplio, como rótulos de instrumento.

## Colors

Una paleta de instrumento: neutros casi puros sobre negro, un acento eléctrico y tres colores de señal para métricas específicas.

### Primary
- **Lima Voltaje** (`lima-voltaje`): el indicador encendido. Se usa en CTAs principales ("Empezar", "Retomar", "Generar mi Plan"), en el botón central de Coach en la barra, en la racha activa (fondo al 15% y borde al 30%) y en contenedores de ícono (fondo al 10% y borde al 20%). El texto sobre lima siempre es Tinta.

### Neutral
- **Tinta** (`tinta`): texto e íconos sobre Lima Voltaje.
- **Carbón Hero** (`carbon-hero`): la tarjeta hero en tema claro y el color de marca de la app (theme-color, fondo del ícono). En tema oscuro, el hero pasa a Fondo Oscuro Elevado para no desaparecer.
- **Fondo Oscuro / Secundario / Elevado** (`fondo-oscuro`, `fondo-oscuro-secundario`, `fondo-oscuro-elevado`): los tres escalones tonales del tema oscuro: página, tarjeta y elemento elevado.
- **Texto Oscuro Primario / Secundario / Terciario**: jerarquía del texto en tema oscuro; el terciario también se usa para tabs inactivas.
- **Borde Oscuro** (`borde-oscuro`): divisores y bordes de tarjeta en oscuro.
- **Contrapartes claras** (`fondo-claro*`, `texto-claro-*`, `borde-claro`): el mismo sistema en tema claro, con valores tipo iOS.

Los tokens reactivos al tema viven en `src/index.css` como custom properties (`--bg-primary`, `--bg-secondary`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--border`, `--surface-hero`, `--nav-bg`, `--badge-bg`). El único token de Tailwind es `--color-brand`, que genera `bg-brand` y `text-brand`.

### Colores de señal
- **Racha Naranja** (`racha-naranja`): el ícono de llama de la racha.
- **Semana Cielo** (`semana-cielo`): sesiones de la semana y calendario.
- **Sesión Violeta** (`sesion-violeta`): próxima sesión.
- **Alerta Rojo** (`alerta-rojo`): errores y acciones destructivas.

Los colores de señal aparecen como ícono sobre un círculo del mismo color al 12% de opacidad. Nunca son fondos sólidos ni texto de párrafo.

### Tinta y estados según el tema
El lima y los colores de estado del tema oscuro no llegan al contraste mínimo sobre blanco. Cuando se usan como **texto o ícono** en una superficie que sigue el tema, van por token: `--brand-ink` (lima en oscuro, `tinta-lima-claro` en claro), `--status-good`, `--status-info`, `--status-warn` y `--status-bad`, y `--chart-accent` para las líneas de gráficos. Los valores en claro están en el frontmatter con sufijo `-claro`; en oscuro coinciden con Lima Voltaje y los 400 de Tailwind.

**Superficies siempre oscuras:** el hero con foto, la tarjeta "Entrenamiento de hoy" (`--surface-hero`), Onboarding, Auth, PlanUpload, la sesión de entrenamiento y las hojas modales (DayPopup, DailyCheckin, ExerciseHistory, PRCelebration). Ahí se usan `white/…` y `zinc` fijos. Todo lo demás en las tabs sigue el tema.

### Named Rules
**The One Light Rule.** Lima Voltaje es la única luz encendida del tablero. Si una pantalla tiene más de un CTA en lima, uno de los dos está mal. Los estados seleccionados de formularios usan blanco translúcido, no lima.

**The Ink-on-Lime Rule.** Sobre Lima Voltaje el texto y los íconos son siempre negros (`#000`). Nunca blanco.

## Typography

**Display Font:** Bebas Neue (con sans-serif como fallback)
**Body Font:** Plus Jakarta Sans (con -apple-system y system-ui)
**Label Font:** stack del sistema (SF Pro en iOS). Se aplica con la utilidad `font-mono`, aunque no es monoespaciada.

**Character:** Bebas pone la voz de marcador deportivo: condensada, en mayúsculas y con impacto. Plus Jakarta es la voz del coach: redonda, cercana y legible. Los labels del sistema son los rótulos del instrumento.

### Hierarchy
- **Display** (Bebas 48px, line-height 1): el nombre del usuario en el hero de Gym.
- **Headline** (Bebas 30–36px, en mayúsculas, tracking amplio): títulos de pantalla en flujos como PlanUpload ("REVISÁ TU PLAN", "¡PLAN CARGADO!").
- **Metric** (Bebas 30px, números tabulares): valores de las stat chips (racha, semana), contadores y timers.
- **Title** (Jakarta 700, 14–16px): títulos de tarjeta y opciones de selección.
- **Body** (Jakarta 500, 14px): texto de tarjetas y mensajes del coach.
- **Caption** (Jakarta 600, 12px): metadatos y subtítulos.
- **Label** (sistema 700, 10px, mayúsculas, tracking 0.05–0.1em): rótulos de tabs, de campos, de stats y chips.

### Named Rules
**The Scoreboard Rule.** Todo número que el usuario "gana" (racha, sesiones, PR, series) va en Bebas con `tabular-nums`. El texto explicativo nunca va en Bebas.

**The Label Floor Rule.** 10px es el mínimo para labels. Los usos actuales de 8–9px son deuda, no parte del sistema.

## Layout

Columna única mobile-first, centrada con un máximo de `max-w-lg` (512px), con gutter lateral de 16–24px. El ritmo usa pasos de 4px; los más comunes son 16px (padding de tarjeta chica y separaciones) y 20px (padding de tarjeta estándar), y las secciones se separan con 24px.

Safe areas: `env(safe-area-inset-top)` arriba, y abajo 64px de tab bar más `env(safe-area-inset-bottom)`. Las pantallas de onboarding, welcome y auth son fijas (`inset-0`, sin scroll) sobre foto a sangre.

Las métricas agrupadas usan grillas de 3 columnas con gap de 8px. La tab bar es una grilla de 5 columnas.

## Elevation & Depth

La profundidad es **tonal primero**: página → tarjeta → elevado, como tres escalones de gris carbón (`--bg-primary` → `--bg-secondary` → `--bg-elevated`). Las sombras existen pero son de apoyo: `shadow-sm` en tarjetas y `shadow-lg` debajo de los CTAs lima, para que el botón principal "flote" sobre el tablero.

La otra capa de profundidad es el **vidrio ahumado** sobre foto: paneles `bg-black/40` con `backdrop-blur` (sm/md) y bordes `white/10`. La tab bar usa el mismo recurso con blur de 20px sobre `--nav-bg` translúcido.

### Named Rules
**The Smoked Glass Rule.** El texto sobre fotografía siempre va sobre un degradé (transparente → negro al 90%) y, si es contenido importante, además sobre un panel de vidrio ahumado. Nunca texto blanco directo sobre la foto.

## Shapes

Formas generosas y amables al pulgar. Escala de radios: 6–8px para badges y campos mínimos; 12px para inputs, opciones y botones compactos; 16px para tarjetas estándar y CTAs grandes; 24px para heroes y sheets; 32px para el panel pill del saludo; y círculo completo para avatares, contenedores de ícono y el botón de Coach.

Los bordes son de 1px, sutiles (`white/10` en oscuro, `--border` en claro). El borde se hace visible (`white/40–60`) solo para marcar foco o selección.

## Components

### Buttons
Táctiles y firmes: grandes, a lo ancho y con un spring de hundirse al tocar.
- **Shape:** 16px en CTAs grandes y 12px en compactos.
- **Primary:** Lima Voltaje con texto Tinta, peso bold, y a menudo mayúsculas con tracking amplio y `shadow-lg`. Alto de 52–56px (`py-3.5`/`py-4`) en CTAs de pantalla y ~40px en compactos.
- **Press:** `whileTap scale 0.96` con spring (stiffness 400, damping 17). Hover: lima al 90%.
- **Secondary:** superficie tonal (`--bg-secondary`), texto primario y sin borde.
- **Disabled:** opacidad 50%.

### Chips (selección)
- **Style:** tarjetas-opción de 12px de radio y 14–16px de padding, en `white/5` con borde `white/10` y texto `white/70`.
- **State:** al seleccionarse pasan a `white/15`, borde `white/60`, texto blanco y `shadow-md`, con un check. La selección es blanca, no lima.

### Cards / Containers
- **Corner Style:** 16px las estándar y 24px la hero.
- **Background:** `--bg-secondary` sobre la página, o `white/5` en superficies sobre foto u oscuro fijo.
- **Shadow Strategy:** tonal; `shadow-sm` opcional.
- **Border:** 1px `--border` o `white/10`.
- **Internal Padding:** 16–20px.

### Inputs / Fields
- **Style:** fondo `white/5`, borde 1px `white/10`, radio 12px, padding de 16px y texto de 16px (evita el zoom de iOS). Placeholder en `white/20`.
- **Focus:** el borde sube a `white/40`, sin glow ni outline de color.
- **Label:** Label de 10px en mayúsculas y color terciario, arriba del campo.

### Navigation
- **Tab bar:** fija abajo, de 64px más la safe area, con vidrio (`--nav-bg` y blur de 20px) y borde superior hairline. Tiene 5 tabs con ícono Lucide de 20px y label de 10px bold en mayúsculas.
- **States:** inactivo en texto terciario y activo en texto primario. No hay indicador de color, salvo en Coach.
- **Coach (central):** círculo de 36px con ícono de 24px; en reposo, lima al 10% con ícono en texto primario, y activo en Lima Voltaje sólido con ícono Tinta y label en lima.

### Stat Chip (signature)
Instrumento del tablero. Es una celda de una grilla de 3, con radio de 16px y padding de 16px, en vidrio ahumado (`black/40` con blur y borde `white/10`). Lleva un ícono de señal en un círculo de 32px al 12%, el valor en Metric (Bebas 30px) y un Label en mayúsculas debajo. Si la métrica está "encendida" (por ejemplo, racha > 0), la celda pasa a lima al 15% con borde lima al 30%.

### Hero Card (signature)
Tarjeta de 420px de alto y radio 24px, con foto a sangre (variante según género) y un degradé de transparente a negro al 90%. Adentro, abajo, van el saludo en un pill de vidrio de 32px de radio (Display con el nombre) y la grilla de Stat Chips. Los botones circulares de 40px en las esquinas usan vidrio blanco al 15%.

## Do's and Don'ts

### Do:
- **Do** usar `bg-brand` / `text-brand` / `var(--color-brand)` para el lima. El token es la única fuente.
- **Do** usar los tokens reactivos (`var(--bg-*)`, `var(--text-*)`, `var(--border)`) en toda superficie que tenga que funcionar en claro y en oscuro.
- **Do** poner las métricas en Bebas con `tabular-nums` y el label en mayúsculas de 10px debajo.
- **Do** dar a todo elemento tocable al menos 40px de alto y el spring de tap (scale 0.96, stiffness 400, damping 17).
- **Do** usar íconos Lucide con `strokeWidth` 1.5–2; los colores de señal van como ícono sobre un círculo al 12%.
- **Do** escribir en voseo rioplatense en la interfaz ("Retomá", "Revisá tu plan").

### Don't:
- **Don't** escribir `#c8f135` o `rgba(200,241,53,…)` hardcodeado. Hoy hay más de 40 casos; son deuda y hay que migrarlos a `brand`.
- **Don't** usar `hover:bg-lime-400` en CTAs lima: cambia el tono. El hover es `bg-brand/90`.
- **Don't** mezclar las escalas `zinc` y `neutral` para grises; en superficies nuevas usá los tokens del tema.
- **Don't** usar colores `white/…` fijos en pantallas que viven dentro de la app con tema claro, porque desaparecen sobre blanco. Esos colores fijos quedan solo para superficies siempre oscuras (foto, onboarding, sesión de entrenamiento).
- **Don't** usar emojis como íconos de interfaz; se reemplazaron deliberadamente por Lucide.
- **Don't** usar más de un CTA lima por pantalla (The One Light Rule).
- **Don't** bajar los labels de 10px.
