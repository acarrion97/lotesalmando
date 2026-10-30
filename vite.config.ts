import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * CesiumJS 1.146 llega modularizado: `cesium` es un envoltorio que re-exporta
 * `@cesium/engine` y `@cesium/widgets`. Los assets que el runtime pide por URL
 * (terreno aproximado, workers, draco/ktx) viven en `@cesium/engine/Build`, no
 * en la carpeta histórica `cesium/Build/Cesium`. `Widgets` no se copia: su CSS
 * se importa desde node_modules y sus imágenes son data-URI.
 *
 * `cesium` y `vite-plugin-static-copy` son la PRIMERA excepción a la regla de
 * "sin dependencias nuevas" del subsistema de mapas (`Visor3D`, `georef` y
 * `CapaSatelite` están hechos a mano). Se admiten porque no hay motor 3D
 * geográfico razonable que escribir a mano. Razonamiento completo en
 * `openspec/changes/cesium-vista-3d-mapas/design.md` (D1 y D3).
 */
const CESIUM_BUILD = "node_modules/@cesium/engine/Build";
const CESIUM_ASSET_DIRS = ["Assets", "Workers", "ThirdParty"] as const;
/**
 * Carpeta servida desde la raíz del sitio y a la que apunta `CESIUM_BASE_URL`.
 * Relativa: `vite-plugin-static-copy` la resuelve contra `build.outDir`.
 */
const CESIUM_DIR = "cesium";
const CESIUM_BASE_URL = `/${CESIUM_DIR}/`;
/**
 * `vite-plugin-static-copy` reconstruye `dest` con la ruta completa del archivo
 * medida desde la raíz del proyecto, y `rename.stripBase` la recorta por la
 * izquierda dejando la cola. 4 = la profundidad de `node_modules/@cesium/engine
 * /Build`, de modo que `Assets/Textures/x.png` cae en `cesium/Assets/Textures/`.
 */
const CESIUM_STRIP_BASE = 4;
/** Nombre fijo del chunk diferido de Cesium, para poder excluirlo del precache. */
const CESIUM_CHUNK = "VisorCesium";
/** Nombre del chunk de motor Cesium que Rolldown genera para la importación dinámica. */
const CESIUM_ENGINE_CHUNK = "Cesium";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: CESIUM_ASSET_DIRS.map((dir) => ({
          src: `${CESIUM_BUILD}/${dir}`,
          dest: CESIUM_DIR,
          rename: { stripBase: CESIUM_STRIP_BASE },
        })),
      }),
      VitePWA({
        registerType: "prompt",
        injectRegister: false,
        // Precache only the build's own static assets. No runtimeCaching here on
        // purpose: the app shell and the Supabase API cache are architecturally
        // separate (see openspec/changes/pwa-offline-support/specs/offline/app-shell).
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
          // El bundle principal (~2,1 MB desde el cambio aceptar-cotizacion-genera-venta)
          // supera el default de workbox de 2 MiB; sin esto el service worker no
          // genera la precarga y se pierde el arranque sin conexión.
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          // Cesium se sirve en vivo desde /cesium y se importa con React.lazy:
          // ni sus assets estáticos (~8 MB) ni su chunk entran a la precarga, o
          // el service worker dejaría de generarse y se perdería el arranque
          // offline (spec mapa/visualizacion-3d: "El motor 3D no ensucia el
          // paquete de la aplicación").
          globIgnores: [
            `${CESIUM_DIR}/**`,
            `**/${CESIUM_CHUNK}*.js`,
            `**/${CESIUM_ENGINE_CHUNK}*.js`,
          ],
        },
        manifest: {
          name: "Lotes al Mando",
          short_name: "Lotes al Mando",
          description:
            "Plataforma inmobiliaria integral para gestión, comercialización y cobranza de proyectos de lotización.",
          theme_color: "#082B33",
          background_color: "#082B33",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    ],
    // ffmpeg.wasm arranca su propio worker: el pre-bundle de Vite lo rompe.
    optimizeDeps: {
      exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
      // Inverso del `exclude` de arriba: Cesium sale más rápido pre-empaquetado
      // que como miles de módulos ESM sueltos en dev.
      include: ["cesium"],
    },
    build: {
      rollupOptions: {
        output: {
          // Nombre estable para el chunk diferido de Cesium: sin el hash es
          // posible excluirlo del precache sin adivinar el sufijo.
          chunkFileNames: (chunk) =>
            chunk.name === CESIUM_CHUNK
              ? `assets/${CESIUM_CHUNK}.js`
              : chunk.name === CESIUM_ENGINE_CHUNK
                ? `assets/${CESIUM_ENGINE_CHUNK}.js`
                : "assets/[name]-[hash].js",
        },
      },
    },
    // Cesium resuelve Assets/ y Workers/ contra CESIUM_BASE_URL, no contra la
    // URL del módulo: sin esto pide los archivos a la raíz y falla.
    //
    // OJO: `define` alcanza a los módulos de node_modules en `vite build`
    // (verificado: `typeof CESIUM_BASE_URL` queda plegado a "/cesium/"), pero NO
    // alcanza al pre-bundle de deps en `vite dev`, donde el `typeof` queda crudo
    // y Cesium caería a `import.meta.url` → /node_modules/.vite/deps/Assets/.
    // Por eso el loader diferido de Cesium asigna además
    // `globalThis.CESIUM_BASE_URL` antes de crear el Viewer: es el mecanismo que
    // Cesium ya usa él solo para propagar la URL a sus workers. Los dos valores
    // deben coincidir siempre con CESIUM_BASE_URL.
    //
    // loadEnv permite configurar CESIUM_TOKEN sin prefijo VITE_. Como el
    // visor es una SPA, el valor se compila en el cliente y no es un secreto.
    define: {
      CESIUM_BASE_URL: JSON.stringify(CESIUM_BASE_URL),
      "import.meta.env.CESIUM_TOKEN": JSON.stringify(env.CESIUM_TOKEN ?? ""),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
