# Racha

Tracker de hábitos con parties: invitas amigos, cada uno pone sus hábitos, se suman puntos, hay 3 vidas por semana y el domingo se cierra la tabla. Incluye perfil con status (loyalty) y trofeos.

Es un prototipo funcional: web app instalable en el celular (PWA), sin build, con Supabase para cuentas y base de datos.

## Cómo está armado

| Archivo | Qué hace |
|---|---|
| `index.html` | Shell de la app y todos los estilos |
| `app.js` | Pantallas, navegación y lógica (puntos, vidas, status) |
| `api.js` | Única capa que habla con Supabase |
| `config.js` | URL y anon key de Supabase |
| `schema.sql` | Tablas, reglas de seguridad (RLS) y funciones |
| `mock.js` | Backend falso en memoria. Abre la app con `?mock` para probar sin Supabase |

## Montarlo desde cero

1. Crea un proyecto en [Supabase](https://supabase.com).
2. En **SQL Editor** pega `schema.sql` completo y dale Run.
3. En **Authentication → Sign In / Providers → Email** apaga *Confirm email* (para pruebas).
4. Copia el Project URL y la anon key en `config.js`.
5. Publica el repo en GitHub Pages (Settings → Pages → Deploy from branch → `main` / root).
6. Abre el link en Safari del iPhone → Compartir → **Agregar a pantalla de inicio**.

## Reglas del juego (en `app.js`, función `weekCalc`)

- +10 por hábito cumplido, +5 por día perfecto, +30 por semana sin perder vidas.
- Cada día que no completas tus hábitos en juego pierdes una vida. Sin vidas, tus puntos se congelan hasta el lunes.
- Status: puntos de los últimos 90 días. Semilla 0 · Constante 300 · Imparable 1,500 · Leyenda 5,000.

## Pendiente

Notificaciones push, widget de iOS, matching (Tribu), aliados reales para los canjes, cierre semanal calculado en el servidor.
