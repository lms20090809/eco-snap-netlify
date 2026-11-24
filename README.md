# Eco Snap — despliegue en Netlify

Este directorio es un paquete independiente de `eco-snap/`, listo para publicarse como sitio estático con una Netlify Function del lado del servidor. El código fuente está en `C:\Users\axele\Downloads\WEBS\eco-snap-netlify`.

## Publicación recomendada: conectar un repositorio

1. Sube el contenido de **esta carpeta** a un repositorio Git (no incluyas `.env` ni `node_modules`).
2. En Netlify, selecciona **Add new site → Import an existing project** y conecta ese repositorio.
3. Usa la carpeta raíz del paquete como base. `netlify.toml` define `publish = "public"`, `netlify/functions` y la ruta `/api/analyze`.
4. Antes de publicar, en **Site configuration → Environment variables**, añade `OPENROUTER_API_KEY` con una **clave nueva**. Opcionalmente, añade `OPENROUTER_MODEL`; el predeterminado es `openai/gpt-4o-mini`.
5. Inicia o vuelve a ejecutar el deploy después de guardar las variables. Las Functions leen las variables del entorno en tiempo de ejecución; la clave nunca se incluye en el JavaScript del navegador.

## Publicación con Netlify CLI

La opción Git de arriba no requiere instalar nada en tu PC. La CLI es solo una alternativa; requiere Node.js 20 o posterior.

Instala Netlify CLI globalmente si aún no está disponible:

```powershell
npm install --global netlify-cli
netlify login
netlify init
```

Para evitar poner la clave en el historial del terminal, configura `OPENROUTER_API_KEY` en el panel de Netlify como se indicó arriba. Después, inicia el sitio local:

```powershell
netlify dev
```

La función local usa `OPENROUTER_API_KEY` del entorno y permite `OPENROUTER_MODEL`. Para publicar el sitio enlazado, ejecuta:

```powershell
netlify deploy --build
netlify deploy --build --prod
```

`npm run build` revisa estáticamente el paquete. `npm test` ejecuta pruebas locales con OpenRouter simulado; no realiza llamadas ni necesita una clave.

> **Importante:** arrastrar y soltar una carpeta a Netlify publica archivos estáticos, pero **no despliega Netlify Functions**. Usa la conexión Git recomendada o Netlify CLI para publicar la función `/api/analyze`.

## Clave y seguridad

Sí, hace falta configurar una clave para habilitar el análisis real. Crea una **clave nueva de OpenRouter** y revoca la que compartiste anteriormente; considera esa credencial anterior expuesta. Configura únicamente la nueva en Netlify, en **Site configuration → Environment variables**, con el nombre exacto `OPENROUTER_API_KEY`, y vuelve a desplegar. No la pongas en `app.js`, `.env.example`, el repositorio ni el chat. El archivo `.env.example` contiene solo un marcador, y `.gitignore` excluye `.env`.

El límite de selección de foto en la interfaz es 8 MiB; las fotos que necesitan enviarse se reducen y comprimen en el navegador para que la imagen Base64 transmitida no supere 4 MiB. Esta adaptación es necesaria porque Netlify impone un límite no configurable de 6 MB al payload buffered de una Function y Base64 añade aproximadamente un 33 %; sin la adaptación, una imagen de 8 MiB no alcanzaría la Function. La Function también valida JSON, Base64, MIME y firma del archivo. La salida de OpenRouter se valida antes de devolver `{ "message": "...", "materials": ["plastic"], "tip": "..." }`. Los errores del proveedor y su respuesta bruta no se exponen. La API no habilita CORS. Consulta el [límite de payload de Netlify Functions](https://docs.netlify.com/build/functions/configuration/).

Un endpoint público puede incurrir en cargos por abuso. Antes de producción, añade autenticación o una verificación de usuario confiable, rate limiting, límites de gasto/alertas y monitorización; utiliza HTTPS. Netlify debe tener permiso para pasar `OPENROUTER_API_KEY` a las Functions de producción.
