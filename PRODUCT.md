# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

PWA instalable (standalone, orientación portrait), pensada para usarse en el celular dentro y fuera del gimnasio.

## Users

Entrenado recreativo: persona que va al gimnasio (o entrena en casa) por su cuenta, sin entrenador personal, y quiere un plan serio con seguimiento real. Usa la app antes de entrenar (qué toca hoy, cómo llego), durante la sesión (series, descansos, técnica) y después (progreso, récords, racha).

## Product Purpose

Healty App es un entrenador personal con IA: arma un plan de entrenamiento a medida y acompaña su ejecución día a día. El éxito es que el usuario entrene con constancia, progrese de forma medible (cargas, PRs, racha) y sienta que alguien sigue su proceso.

## Positioning

Dos cosas juntas que una app de registro de entrenamientos no ofrece:

1. **Plan hecho por IA** a partir del perfil completo: objetivo, experiencia, días preferidos, duración, lugar (gym / casa / ambos, por día), equipamiento, lesiones, ejercicios a evitar, zonas a priorizar y otras actividades deportivas de la semana.
2. **Coach proactivo** que habla según el contexto: check-in diario e índice de preparación, racha, récords y el entrenamiento del día, en lugar de esperar a que el usuario pregunte.

## Operating Context

- Onboarding extenso de perfil que termina en "Generar mi Plan", seguido de un walkthrough de los pilares del plan.
- Alternativa: subir un plan existente (documento) para que la IA lo interprete.
- Rutina diaria: check-in → tarjeta "Hoy" → sesión guiada (intro, ejercicio, descanso con timer, transición, resumen) → celebración de PR.
- Recordatorio matutino por push notification.
- Tabs: Gym, Biblioteca (ejercicios), Nutrición, Coach, Yo (estadísticas y rendimiento), Perfil.
- Uso en el gimnasio: una mano, pantalla bloqueándose (wake lock), atención parcial.

## Capabilities and Constraints

- Stack existente: React 19 + Vite + Tailwind 4, servidor Express, Gemini (`@google/genai`) del lado del servidor, Supabase (auth con Google, datos), web-push.
- La IA genera: plan de entrenamiento, plan de nutrición, parseo de planes subidos, mensajes del coach (contextual y diario).
- Latencia de Gemini es una restricción real: el comentario post-entrenamiento se revirtió por latencia. Las funciones de IA en momentos críticos del flujo deben tolerar espera o evitarla.
- Rendimiento: historial por ejercicio, récords, progresión, racha inteligente por días de entrenamiento.
- Etapa: hoy uso personal y amigos; rumbo a lanzamiento con usuarios reales. Monetización, precios y modelo de negocio: **sin decidir**.

## Brand Commitments

- Nombre: **Healty App** (así escrito en el código, manifest y metadata).
- Lema: "Entrená · Superá · Vive Mejor".
- Idioma y voz: castellano rioplatense con voseo ("Entrená", "Generá"), cercano y directo.
- Íconos de interfaz con Lucide; los emojis de UI se reemplazaron deliberadamente.

## Evidence on Hand

- Imágenes: `public/welcome-bg.jpg`, `public/auth-bg.png`, `public/onboarding-bg.*`, `public/gym-hero.jpg`, `public/gym-hero-female.jpg`, `public/nutrition-hero.jpg`, `public/nutrition-empty-bg.jpg`.
- Íconos de app: `public/icon-192.png`, `public/icon-512.png`.
- No hay testimonios, métricas de usuarios, casos ni prensa. No inventarlos.

## Product Principles

1. **El plan es personal o no sirve.** Cada dato del perfil debe notarse en el plan; nada genérico.
2. **El coach aparece antes de que lo busquen**, con algo concreto que decir sobre hoy, no motivación vacía.
3. **En el gym, la sesión manda.** Durante el entrenamiento, lo único que importa es la próxima serie; nada debe frenar ni distraer.
4. **Progreso visible.** Récords, racha y progresión tienen que sentirse ganados y mostrarse con claridad.
5. **Velocidad sobre ornamento en la IA.** Si una respuesta de IA no llega a tiempo en un momento crítico, no va en ese momento.
