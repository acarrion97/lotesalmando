import { useEffect, useMemo, useRef, useState } from "react";
import { Segmented, Spin, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import type { Cesium3DTileset, Viewer } from "cesium";
import type { PlanoLote } from "@/domain/mapa/entities";
import type { LimitesGeo } from "../georef";
import { PLANTILLA_TILE_ESRI } from "../georef";
import type { CoordenadaWgs84 } from "./proyectar";
import { poligonoAWgs84 } from "./proyectar";

const { Text } = Typography;

/**
 * Vista 3D real del proyecto sobre terreno y malla fotogramétrica de Cesium.
 *
 * Todo lo que es Cesium vive en un chunk diferido (`assets/VisorCesium.js`):
 * ni el código, ni sus assets, ni su CSS entran al bundle principal ni al
 * precache de la PWA. Los modos Plano, Satélite y Visor 3D no pagan nada por
 * tener esta vista disponible (design.md D3).
 */
type MotorCesium = typeof import("cesium");

/** Inclinación de la cámara en el vuelo inicial: negativa = mirando hacia abajo. */
const PITCH_INICIAL = -35;
const DURACION_VUELO = 2;

/** Capas base conmutables de la escena. */
export type CapaBaseCesium = "terreno" | "fotografica";

/** Por qué la capa fotográfica volvió a terreno + edificios. */
type MotivoRespaldo = "sin-cobertura" | "sin-cuota" | "sin-conexion";

const MENSAJE_RESPALDO: Record<MotivoRespaldo, string> = {
  "sin-cobertura":
    "Esta zona no tiene cobertura fotográfica. Se volvió a la vista de terreno y edificios.",
  "sin-cuota":
    "Se agotó la cuota mensual de Cesium ion para la capa fotográfica. Se volvió a la vista de terreno y edificios.",
  "sin-conexion":
    "Sin conexión a internet no se puede descargar la capa fotográfica. Se volvió a la vista de terreno y edificios.",
};

const OPCIONES_CAPA: { label: string; value: CapaBaseCesium }[] = [
  { label: "Terreno y edificios", value: "terreno" },
  { label: "Vista fotográfica", value: "fotografica" },
];

/** Crédito exigido por Esri para su capa satélital. */
const CREDITO_ESRI = "Esri · Maxar · Earthstar Geographics";

interface VisorCesiumProps {
  /** Ventana geográfica del plano, ya calculada por el padre con `limitesDelPlano()`. */
  limites: LimitesGeo;
  /** Alto del visor en píxeles. */
  altura: number;
  lotes: PlanoLote[];
}

/**
 * Clasifica el fallo de la capa fotográfica para poder explicárselo al usuario
 * con palabras útiles en vez de con el error crudo de la red.
 */
function clasificarFallo(error: unknown): MotivoRespaldo {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "sin-conexion";
  const texto = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /quota|credit|403|401|authoriz|access/i.test(texto) ? "sin-cuota" : "sin-cobertura";
}

/**
 * Encuadra la escena sobre el conjunto de puntos dado. Con `range = 0` la
 * cámara sola calcula la distancia que hace falta para que entre todo.
 */
function volarAEscena(viewer: Viewer, motor: MotorCesium, puntos: readonly CoordenadaWgs84[]): void {
  if (puntos.length === 0) return;
  const esfera = motor.BoundingSphere.fromPoints(
    puntos.map(([lng, lat]) => motor.Cartesian3.fromDegrees(lng, lat)),
  );
  viewer.camera.flyToBoundingSphere(esfera, {
    duration: DURACION_VUELO,
    offset: new motor.HeadingPitchRange(0, motor.Math.toRadians(PITCH_INICIAL), 0),
  });
}

export function VisorCesium({ limites, altura, lotes }: VisorCesiumProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const motorRef = useRef<MotorCesium | null>(null);
  const edificiosRef = useRef<Cesium3DTileset | null>(null);
  const mallaRef = useRef<Cesium3DTileset | null>(null);
  const posicionesRef = useRef<CoordenadaWgs84[]>([]);

  const [cargando, setCargando] = useState(true);
  const [capaBase, setCapaBase] = useState<CapaBaseCesium>("terreno");
  const [motivoRespaldo, setMotivoRespaldo] = useState<MotivoRespaldo | null>(null);

  const { norte, sur, este, oeste } = limites;
  const posiciones = useMemo<CoordenadaWgs84[]>(() => {
    // El encuadre cubre la ventana completa del plano, no solo los lotes: la
    // vista tiene que enseñar el proyecto entero aunque aún no haya ninguno
    // ubicado. Los vértices se suman por si alguno pica fuera de `[0..1]`.
    const ventana: LimitesGeo = { norte, sur, este, oeste };
    const puntos: CoordenadaWgs84[] = [
      [oeste, norte],
      [este, norte],
      [este, sur],
      [oeste, sur],
    ];
    for (const lote of lotes) {
      if (lote.poligono) puntos.push(...poligonoAWgs84(lote.poligono, ventana));
    }
    return puntos;
  }, [norte, sur, este, oeste, lotes]);

  // El creador del Viewer corre una sola vez y por tanto no puede depender de
  // la ventana; se le pasa por ref, sincronizado en un effect y no en render.
  useEffect(() => {
    posicionesRef.current = posiciones;
  }, [posiciones]);

  // El Viewer se crea una vez por sesión de modo activo y se destruye en el
  // cleanup (design.md D4). En desarrollo `<StrictMode>` monta → desmonta →
  // monta: sin esto quedan dos Viewers y dos contextos WebGL.
  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    // Guard del doble montaje: si el cleanup ya corrió, la continuación
    // asíncrona no debe llegar a crear un segundo Viewer.
    let vivo = true;
    let viewer: Viewer | null = null;

    void (async () => {
      try {
        // El CSS de los widgets va en este mismo chunk: es lo único que hay
        // que traer de `@cesium/widgets`, y su hoja solo es un puñado de
        // `@import` hacia los CSS de los widgets.
        await import("@cesium/widgets/Source/widgets.css");
        const cesium = await import("cesium");
        if (!vivo) return;

        const globalCesium = globalThis as typeof globalThis & { CESIUM_BASE_URL?: string };
        globalCesium.CESIUM_BASE_URL = "/cesium/";

        const token = String(import.meta.env.VITE_CESIUM_TOKEN ?? "").trim();
        if (token) cesium.Ion.defaultAccessToken = token;

        // No se pasa `creditContainer`: la atribución queda donde Cesium la
        // pone por defecto, visible y sin atajos de CSS (design.md D9).
        viewer = new cesium.Viewer(contenedor, {
          // La misma fotografía del territorio que ya usan el modo Satélite y
          // la capa aérea del Visor 3D: sin API key y sin cuota ion.
          baseLayer: new cesium.ImageryLayer(
            new cesium.UrlTemplateImageryProvider({
              url: PLANTILLA_TILE_ESRI,
              credit: CREDITO_ESRI,
              maximumLevel: 19,
            }),
          ),
          terrain: cesium.Terrain.fromWorldTerrain(),
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
          // Solo se usa la escena 3D: libera la memoria de GPU de las
          // proyecciones 2D y Columbus View que nunca se van a ver.
          scene3DOnly: true,
          // Renderizar a la resolución nativa del dispositivo: en pantallas
          // retina es el doble de nitidez por la misma geometría.
          useBrowserRecommendedResolution: false,
        });

        motorRef.current = cesium;
        viewerRef.current = viewer;

        const escena = viewer.scene;
        // Sin luz solar el slider de hora del día no tendría ningún efecto
        // sobre terreno ni sobre los edificios (design.md D1).
        viewer.shadows = true;
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
        if (viewer.scene.sun) viewer.scene.sun.show = true;
        if (viewer.scene.moon) viewer.scene.moon.show = true;
        escena.highDynamicRange = true;
        if (escena.postProcessStages.fxaa) {
          escena.postProcessStages.fxaa.enabled = true;
        }

        if (vivo) setCargando(false);
        volarAEscena(viewer, cesium, posicionesRef.current);

        // OSM Buildings viene de ion: si falla (sin red, sin cuota, sin
        // token) la escena sigue siendo útil con el terreno solo, así que la
        // ausencia de edificios no es un error de la vista.
        try {
          const edificios = await cesium.createOsmBuildingsAsync();
          if (!vivo) {
            edificios.destroy();
            return;
          }
          escena.primitives.add(edificios);
          edificiosRef.current = edificios;
        } catch {
          // Silencio a propósito: es una capa menos, no una vista rota.
        }
      } catch (error) {
        if (!vivo) return;
        // Última red de seguridad: un fallo al crear la escena debe decir
        // algo y no dejar un contenedor vacío.
        contenedor.textContent = `No se pudo abrir la vista 3D: ${
          error instanceof Error ? error.message : "error desconocido"
        }`;
        setCargando(false);
      }
    })();

    return () => {
      vivo = false;
      edificiosRef.current = null;
      motorRef.current = null;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewer = null;
      viewerRef.current = null;
      // React no vuelve a crear el div en el remontaje de StrictMode: vaciarlo
      // a mano es lo que garantiza que no quede un canvas huérfano.
      contenedor.innerHTML = "";
    };
  }, []);

  // Vuelo a la ventana del plano cuando cambia la georreferenciación. En el
  // primer montaje no hace nada: el vuelo inicial lo lanza el creador.
  useEffect(() => {
    const viewer = viewerRef.current;
    const motor = motorRef.current;
    if (!viewer || !motor) return;
    volarAEscena(viewer, motor, posiciones);
  }, [posiciones]);

  // La capa fotográfica solo se pide cuando alguien la pide: descargarla en
  // segundo plano agotaría la cuota ion sin que nadie la haya mirado.
  useEffect(() => {
    const viewer = viewerRef.current;
    const motor = motorRef.current;
    if (!viewer || !motor || capaBase !== "fotografica") return;

    let vivo = true;
    void (async () => {
      try {
        const malla = await motor.createGooglePhotorealistic3DTileset();
        if (!vivo) {
          malla.destroy();
          return;
        }
        // La malla trae su propio relieve en la geometría. En vez de apilar
        // dos superficies encima de la misma posición (y ver z-fighting), el
        // globo se oculta mientras ella está activa; donde no llega su
        // cobertura, el respaldo automático de abajo lo recupera.
        viewer.scene.globe.show = false;
        viewer.scene.primitives.add(malla);
        mallaRef.current = malla;
      } catch (error) {
        if (!vivo) return;
        setMotivoRespaldo(clasificarFallo(error));
        setCapaBase("terreno");
      }
    })();

    return () => {
      vivo = false;
      if (viewer.isDestroyed()) return;
      const malla = mallaRef.current;
      // `remove()` ya destruye la primitiva: la colección destruye lo que
      // quita por defecto, volver a llamar `destroy()` lanzaría.
      if (malla) viewer.scene.primitives.remove(malla);
      mallaRef.current = null;
      viewer.scene.globe.show = true;
    };
  }, [capaBase]);

  return (
    <div style={{ position: "relative", height: altura, background: "#0b0d12", borderRadius: 8, overflow: "hidden" }}>
      <div ref={contenedorRef} style={{ position: "absolute", inset: 0 }} />

      <div style={{ position: "absolute", top: 10, left: 10, zIndex: 5 }}>
        <Segmented
          value={capaBase}
          onChange={(v) => {
            if (v !== capaBase) setMotivoRespaldo(null);
            setCapaBase(v as CapaBaseCesium);
          }}
          options={OPCIONES_CAPA}
        />
      </div>

      {motivoRespaldo && (
        <div
          style={{
            position: "absolute",
            top: 52,
            left: 10,
            right: 10,
            zIndex: 5,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            fontSize: 12,
            color: "#595959",
          }}
        >
          <WarningOutlined style={{ color: "#faad14", marginTop: 2 }} />
          <span>{MENSAJE_RESPALDO[motivoRespaldo]}</span>
        </div>
      )}

      {cargando && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            background: "#0b0d12",
          }}
        >
          <Spin />
          <Text style={{ color: "rgba(255, 255, 255, 0.75)" }}>Abriendo la vista 3D real…</Text>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 22,
          zIndex: 5,
          padding: "4px 10px",
          borderRadius: 6,
          background: "rgba(255, 255, 255, 0.9)",
          color: "#595959",
          fontSize: 11,
          pointerEvents: "none",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
        }}
      >
        Arrastrá para girar · rueda para acercar
        {capaBase === "fotografica"
          ? " · la vista fotográfica tiene su propia iluminación grabada"
          : " · mové la hora del día para ver cambiar la luz"}
      </div>
    </div>
  );
}
