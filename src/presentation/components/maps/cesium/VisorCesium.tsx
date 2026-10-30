import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Segmented, Spin, Typography } from "antd";
import { SlidersOutlined, WarningOutlined } from "@ant-design/icons";
import type { Cesium3DTileset, Viewer } from "cesium";
import type { PlanoLote } from "@/domain/mapa/entities";
import { useOnlineStatus } from "@/presentation/hooks";
import type { LimitesGeo } from "../georef";
import { PLANTILLA_TILE_ESRI, PLANTILLAS_ETIQUETAS_ESRI } from "../georef";
import { nivelMaximoEsriConCobertura } from "../tilesEsri";
import { PanelControlesEscena } from "./PanelControlesEscena";
import type { CalidadEscena } from "./controlesEscena";
import {
  CALIDAD_INICIAL,
  RANGO_ESCALA_RESOLUCION,
  aplicarErrorPantalla,
  clampRango,
  fechaParaHora,
  horaInicial,
} from "./controlesEscena";
import { actualizarEntidadesLote, type EntidadesLoteCesium } from "./lotes";
import { INTERVALO_REFRESCO_MS, crearProveedorRefresco, productorPorIntervalo } from "./refresco";
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
type ClickPosition = import("cesium").ScreenSpaceEventHandler.PositionedEvent;

/** Inclinación de la cámara en el vuelo inicial: negativa = mirando hacia abajo. */
const PITCH_INICIAL = -35;
const DURACION_VUELO = 2;
const ZOOM_MAXIMO_IMAGEN_ESRI = 20;

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
const CREDITO_ETIQUETAS_ESRI =
  "Esri · HERE · Garmin · © OpenStreetMap contributors · GIS user community";

interface VisorCesiumProps {
  /** Ventana geográfica del plano, ya calculada por el padre con `limitesDelPlano()`. */
  limites: LimitesGeo;
  /** Alto del visor en píxeles. */
  altura: number;
  lotes: PlanoLote[];
  onLoteClick?: (lote: PlanoLote) => void;
  loteSeleccionadoId?: number | null;
  mostrarEtiquetas: boolean;
  /**
   * Refresco de datos (tarea 5.4): el tick del proveedor le pide al padre que
   * reconsulte por sus hooks existentes. Los lotes llegan como props y se
   * mutan en el lugar; el visor no se recrea ni se mueve la cámara (design.md
   * D5/D11). Sin este callback no se programa ningún refresco.
   */
  onRefrescarDatos?: () => void;
}

/**
 * Clasifica el fallo de la capa fotográfica para poder explicárselo al usuario
 * con palabras útiles en vez de con el error crudo de la red.
 */
function clasificarFallo(error: unknown): MotivoRespaldo {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "sin-conexion";
  const mensaje =
    typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : String(error);
  const texto = error instanceof Error ? `${error.name} ${mensaje}` : mensaje;
  return /quota|credit|402|403|401|429|authoriz|access|token|payment/i.test(texto)
    ? "sin-cuota"
    : "sin-cobertura";
}

/**
 * Encuadra la escena sobre el conjunto de puntos dado. Con `range = 0` la
 * cámara sola calcula la distancia que hace falta para que entre todo.
 */
function volarAEscena(
  viewer: Viewer,
  motor: MotorCesium,
  puntos: readonly CoordenadaWgs84[],
): void {
  if (puntos.length === 0) return;
  const esfera = motor.BoundingSphere.fromPoints(
    puntos.map(([lng, lat]) => motor.Cartesian3.fromDegrees(lng, lat)),
  );
  viewer.camera.flyToBoundingSphere(esfera, {
    duration: DURACION_VUELO,
    offset: new motor.HeadingPitchRange(0, motor.Math.toRadians(PITCH_INICIAL), 0),
  });
}

function volarALote(
  viewer: Viewer,
  motor: MotorCesium,
  lote: PlanoLote,
  limites: LimitesGeo,
): void {
  if (!lote.poligono || lote.poligono.length < 3) return;
  const posiciones = poligonoAWgs84(lote.poligono, limites).map(([lng, lat]) =>
    motor.Cartesian3.fromDegrees(lng, lat),
  );
  const esfera = motor.BoundingSphere.fromPoints(posiciones);
  viewer.camera.flyToBoundingSphere(esfera, {
    duration: DURACION_VUELO,
    offset: new motor.HeadingPitchRange(0, motor.Math.toRadians(PITCH_INICIAL), 0),
  });
}

export function VisorCesium({
  limites,
  altura,
  lotes,
  onLoteClick,
  loteSeleccionadoId = null,
  mostrarEtiquetas,
  onRefrescarDatos,
}: VisorCesiumProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const motorRef = useRef<MotorCesium | null>(null);
  const edificiosRef = useRef<Cesium3DTileset | null>(null);
  const mallaRef = useRef<Cesium3DTileset | null>(null);
  const posicionesRef = useRef<CoordenadaWgs84[]>([]);
  const limitesRef = useRef(limites);
  const lotesRef = useRef(lotes);
  const entidadesLoteRef = useRef<EntidadesLoteCesium>(new Map());
  const onLoteClickRef = useRef(onLoteClick);
  const loteSeleccionadoIdRef = useRef(loteSeleccionadoId);
  const onRefrescarDatosRef = useRef(onRefrescarDatos);

  const [cargando, setCargando] = useState(true);
  const [capaBase, setCapaBase] = useState<CapaBaseCesium>("terreno");
  const [motivoRespaldo, setMotivoRespaldo] = useState<MotivoRespaldo | null>(null);
  const [avisoEscena, setAvisoEscena] = useState<string | null>(null);
  const [errorEscena, setErrorEscena] = useState(false);
  // Controles de escena (tareas 5.1 y 5.2): el creador del Viewer los lee por
  // ref porque corre una vez y no puede re-renderizar con su cambio.
  const [hora, setHora] = useState(() => horaInicial());
  const [calidad, setCalidad] = useState<CalidadEscena>(CALIDAD_INICIAL);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const horaRef = useRef(hora);
  const calidadRef = useRef(calidad);
  const enLinea = useOnlineStatus();

  const { norte, sur, este, oeste } = limites;
  const posiciones = useMemo<CoordenadaWgs84[]>(() => {
    // Encuadrar los lotes ubicados evita que los márgenes vacíos del plano
    // reduzcan el proyecto. Si todavía no hay polígonos, mostrar la ventana
    // completa; también incluir vértices fuera de [0..1] para no recortarlos.
    const ventana: LimitesGeo = { norte, sur, este, oeste };
    const puntos: CoordenadaWgs84[] = [];
    for (const lote of lotes) {
      if (lote.poligono) puntos.push(...poligonoAWgs84(lote.poligono, ventana));
    }
    if (puntos.length === 0) {
      puntos.push(
        [oeste, norte],
        [este, norte],
        [este, sur],
        [oeste, sur],
      );
    }
    return puntos;
  }, [norte, sur, este, oeste, lotes]);

  // El creador del Viewer corre una sola vez y por tanto no puede depender de
  // la ventana; se le pasa por ref, sincronizado en un effect y no en render.
  useEffect(() => {
    posicionesRef.current = posiciones;
  }, [posiciones]);

  useEffect(() => {
    limitesRef.current = limites;
    lotesRef.current = lotes;
    const viewer = viewerRef.current;
    const cesium = motorRef.current;
    if (viewer && cesium) {
      actualizarEntidadesLote(viewer, cesium, lotes, limites, entidadesLoteRef.current);
    }
  }, [limites, lotes]);

  useEffect(() => {
    onLoteClickRef.current = onLoteClick;
  }, [onLoteClick]);

  useEffect(() => {
    loteSeleccionadoIdRef.current = loteSeleccionadoId;
    const viewer = viewerRef.current;
    const cesium = motorRef.current;
    const lote = lotesRef.current.find((item) => item.id_lote === loteSeleccionadoId);
    if (viewer && cesium && lote?.poligono && lote.poligono.length >= 3) {
      volarALote(viewer, cesium, lote, limitesRef.current);
    }
  }, [loteSeleccionadoId]);

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

        let nivelMaximoImagen: number | null;
        try {
          nivelMaximoImagen = await nivelMaximoEsriConCobertura(
            limitesRef.current,
            ZOOM_MAXIMO_IMAGEN_ESRI,
          );
        } catch (error) {
          console.warn(
            "No se pudo determinar la cobertura de imágenes Esri; se limita el zoom satelital.",
            error,
          );
          nivelMaximoImagen = 17;
          if (vivo) {
            setAvisoEscena(
              "No se pudo comprobar la cobertura satelital; se usará una resolución conservadora.",
            );
          }
        }
        if (!vivo) return;

        // No se pasa `creditContainer`: la atribución queda donde Cesium la
        // pone por defecto, visible y sin atajos de CSS (design.md D9).
        viewer = new cesium.Viewer(contenedor, {
          // La misma fotografía del territorio que ya usan el modo Satélite y
          // la capa aérea del Visor 3D: sin API key y sin cuota ion.
          baseLayer:
            nivelMaximoImagen === null
              ? false
              : new cesium.ImageryLayer(
                  new cesium.UrlTemplateImageryProvider({
                    url: PLANTILLA_TILE_ESRI,
                    credit: CREDITO_ESRI,
                    maximumLevel: nivelMaximoImagen,
                  }),
                ),
          terrain: cesium.Terrain.fromWorldTerrain(),
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: cesium.IonGeocodeProviderType.GOOGLE,
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
        if (nivelMaximoImagen === null) {
          setAvisoEscena(
            "Esri no tiene imágenes satelitales disponibles para esta ubicación. El terreno y los lotes siguen visibles.",
          );
        }
        actualizarEntidadesLote(
          viewer,
          cesium,
          lotesRef.current,
          limitesRef.current,
          entidadesLoteRef.current,
        );
        viewer.screenSpaceEventHandler.setInputAction((movement: ClickPosition) => {
          const picked = viewer?.scene.pick(movement.position);
          const pickedEntity =
            picked?.id instanceof cesium.Entity
              ? picked.id
              : typeof picked?.id === "string"
                ? { id: picked.id }
                : null;
          const idLote = pickedEntity?.id.startsWith("lote:")
            ? Number(pickedEntity.id.slice("lote:".length))
            : NaN;
          const lote = Number.isSafeInteger(idLote)
            ? lotesRef.current.find((item) => item.id_lote === idLote)
            : undefined;
          if (lote) onLoteClickRef.current?.(lote);
        }, cesium.ScreenSpaceEventType.LEFT_CLICK);

        const escena = viewer.scene;
        // Sin luz solar el slider de hora del día no tendría ningún efecto
        // sobre terreno ni sobre los edificios (design.md D1).
        viewer.shadows = true;
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
        if (viewer.scene.sun) viewer.scene.sun.show = true;
        if (viewer.scene.moon) viewer.scene.moon.show = true;
        // El reloj no avanza solo: la hora la gobierna el slider (tarea 5.1),
        // con la luz de ahora como punto de partida.
        viewer.clock.shouldAnimate = false;
        viewer.clock.currentTime = cesium.JulianDate.fromDate(fechaParaHora(horaRef.current));
        // La calidad inicial es la de los props del panel (tarea 5.2); los
        // tilesets que lleguen después reciben su valor en su propia alta.
        viewer.resolutionScale = clampRango(
          calidadRef.current.escalaResolucion,
          RANGO_ESCALA_RESOLUCION,
        );
        escena.highDynamicRange = calidadRef.current.hdr;
        if (escena.postProcessStages.fxaa) {
          escena.postProcessStages.fxaa.enabled = calidadRef.current.fxaa;
        }

        if (vivo) setCargando(false);
        volarAEscena(viewer, cesium, posicionesRef.current);
        const loteSeleccionado = lotesRef.current.find(
          (lote) => lote.id_lote === loteSeleccionadoIdRef.current,
        );
        if (loteSeleccionado?.poligono && loteSeleccionado.poligono.length >= 3) {
          volarALote(viewer, cesium, loteSeleccionado, limitesRef.current);
        }

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
          // El control de calidad no depende de cuándo llegó el tileset: su
          // nivel de nitidez se aplica también en cada alta (tarea 5.2).
          aplicarErrorPantalla(edificios, calidadRef.current.errorPantalla);
          aplicarErrorPantalla(edificios, calidadRef.current.errorPantalla);
        } catch (error) {
          console.warn("No se pudieron cargar los edificios OSM para la escena Cesium.", error);
          if (vivo) {
            setAvisoEscena("No se pudieron cargar los edificios; el terreno sigue disponible.");
          }
        }
      } catch (error) {
        if (!vivo) return;
        console.error("No se pudo iniciar el visor Cesium.", error);
        if (viewer && !viewer.isDestroyed()) viewer.destroy();
        viewer = null;
        viewerRef.current = null;
        motorRef.current = null;
        contenedor.innerHTML = "";
        setErrorEscena(true);
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

  // La carga o actualización de lotes no debe mover la cámara; solo se vuelve
  // a encuadrar si cambia la ubicación geográfica del plano.
  useEffect(() => {
    const viewer = viewerRef.current;
    const motor = motorRef.current;
    if (!viewer || !motor) return;
    volarAEscena(viewer, motor, posicionesRef.current);
  }, [norte, sur, este, oeste]);

  // La capa fotográfica solo se pide cuando alguien la pide: descargarla en
  // segundo plano agotaría la cuota ion sin que nadie la haya mirado.
  useEffect(() => {
    const viewer = viewerRef.current;
    const motor = motorRef.current;
    if (!viewer || !motor || capaBase !== "fotografica") return;

    let vivo = true;
    let retirarEventosMalla: (() => void)[] = [];
    void (async () => {
      try {
        const malla = await motor.createGooglePhotorealistic3DTileset({
          onlyUsingWithGoogleGeocoder: true,
        });
        if (!vivo) {
          malla.destroy();
          return;
        }
        let cargoAlgunTile = false;
        retirarEventosMalla = [
          malla.tileLoad.addEventListener(() => {
            cargoAlgunTile = true;
          }),
          malla.initialTilesLoaded.addEventListener(() => {
            if (vivo && !cargoAlgunTile) {
              setMotivoRespaldo("sin-cobertura");
              setCapaBase("terreno");
            }
          }),
          malla.tileFailed.addEventListener((error: unknown) => {
            if (vivo) {
              setMotivoRespaldo(clasificarFallo(error));
              setCapaBase("terreno");
            }
          }),
        ];
        // La malla trae su propio relieve en la geometría. En vez de apilar
        // dos superficies encima de la misma posición (y ver z-fighting), el
        // globo se oculta mientras ella está activa; donde no llega su
        // cobertura, el respaldo automático de abajo lo recupera.
        viewer.scene.globe.show = false;
        viewer.scene.primitives.add(malla);
        mallaRef.current = malla;
        aplicarErrorPantalla(malla, calidadRef.current.errorPantalla);
      } catch (error) {
        if (!vivo) return;
        setMotivoRespaldo(clasificarFallo(error));
        setCapaBase("terreno");
      }
    })();

    return () => {
      vivo = false;
      retirarEventosMalla.forEach((retirar) => retirar());
      retirarEventosMalla = [];
      if (viewer.isDestroyed()) return;
      const malla = mallaRef.current;
      // `remove()` ya destruye la primitiva: la colección destruye lo que
      // quita por defecto, volver a llamar `destroy()` lanzaría.
      if (malla) viewer.scene.primitives.remove(malla);
      mallaRef.current = null;
      viewer.scene.globe.show = true;
    };
  }, [capaBase]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const motor = motorRef.current;
    if (
      cargando ||
      !mostrarEtiquetas ||
      capaBase !== "terreno" ||
      !viewer ||
      !motor ||
      viewer.isDestroyed() ||
      viewer.imageryLayers.length === 0
    ) {
      return;
    }

    const capas = PLANTILLAS_ETIQUETAS_ESRI.map((url) =>
      viewer.imageryLayers.addImageryProvider(
        new motor.UrlTemplateImageryProvider({
          url,
          credit: CREDITO_ETIQUETAS_ESRI,
          maximumLevel: ZOOM_MAXIMO_IMAGEN_ESRI,
        }),
      ),
    );
    return () => {
      if (viewer.isDestroyed()) return;
      capas.forEach((capa) => viewer.imageryLayers.remove(capa, true));
    };
  }, [cargando, capaBase, mostrarEtiquetas]);

  // Tarea 5.1: la hora del día gobierna el reloj del Viewer. Con
  // `globe.enableLighting` encendido, el instante del reloj es lo que decide
  // la posición del sol, el cielo y el sombreado de terreno y edificios; la
  // malla fotogramétrica conserva su iluminación grabada y el panel lo dice.
  useEffect(() => {
    horaRef.current = hora;
    const viewer = viewerRef.current;
    const motor = motorRef.current;
    if (!viewer || !motor || viewer.isDestroyed()) return;
    viewer.clock.currentTime = motor.JulianDate.fromDate(fechaParaHora(hora));
  }, [hora]);

  // Tarea 5.2: la calidad muta la escena viva —nunca la recrea— (design.md
  // D4/D8). Los tilesets ya montados reciben el nitidez al instante; los que
  // carguen después la reciben en su propia alta.
  useEffect(() => {
    calidadRef.current = calidad;
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.resolutionScale = clampRango(calidad.escalaResolucion, RANGO_ESCALA_RESOLUCION);
    viewer.scene.highDynamicRange = calidad.hdr;
    const fxaa = viewer.scene.postProcessStages.fxaa;
    if (fxaa) fxaa.enabled = calidad.fxaa;
    aplicarErrorPantalla(edificiosRef.current, calidad.errorPantalla);
    aplicarErrorPantalla(mallaRef.current, calidad.errorPantalla);
  }, [calidad]);

  useEffect(() => {
    onRefrescarDatosRef.current = onRefrescarDatos;
  }, [onRefrescarDatos]);

  // Tareas 5.3 y 5.4: el proveedor de refresco nace con el productor por
  // intervalo y se retira con el effect. Sin callback de refresco —o sin
  // conexión— no se programa ningún tick: la escena se queda en el último
  // estado conocido con su aviso, que es el contrato de la spec.
  useEffect(() => {
    if (!onRefrescarDatos || !enLinea) return;
    const proveedor = crearProveedorRefresco(productorPorIntervalo(INTERVALO_REFRESCO_MS));
    const desuscribir = proveedor.subscribe(() => {
      // El productor solo avisa: refrescar datos es del padre, a través de sus
      // hooks existentes (design.md D11). Los lotes llegan como props y el
      // effect de `lotes` hace el diff por id_lote; aquí se reaplica además el
      // estado vigente, mutando entidades sin tocar la cámara ni recrear nada.
      const viewer = viewerRef.current;
      const motor = motorRef.current;
      if (viewer && motor && !viewer.isDestroyed()) {
        actualizarEntidadesLote(
          viewer,
          motor,
          lotesRef.current,
          limitesRef.current,
          entidadesLoteRef.current,
        );
      }
      onRefrescarDatosRef.current?.();
    });
    return () => {
      desuscribir();
      proveedor.dispose();
    };
  }, [onRefrescarDatos, enLinea]);

  return (
    <div
      style={{
        position: "relative",
        height: altura,
        background: "#0b0d12",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
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

      {!cargando && !errorEscena && (
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 6 }}>
          <Button
            size="small"
            aria-label="Controles de la escena"
            aria-expanded={panelAbierto}
            icon={<SlidersOutlined />}
            onClick={() => setPanelAbierto((abierto) => !abierto)}
          />
        </div>
      )}

      {panelAbierto && !cargando && !errorEscena && (
        <div
          role="group"
          aria-label="Controles de la escena"
          style={{
            position: "absolute",
            top: 48,
            right: 10,
            zIndex: 6,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.96)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          }}
        >
          <PanelControlesEscena
            hora={hora}
            onHora={setHora}
            calidad={calidad}
            onCalidad={setCalidad}
            capaBase={capaBase}
          />
        </div>
      )}

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

      {avisoEscena && !motivoRespaldo && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: 52,
            left: 10,
            right: 10,
            zIndex: 5,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(255, 255, 255, 0.94)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
            fontSize: 12,
            color: "#595959",
          }}
        >
          {avisoEscena}
        </div>
      )}

      {errorEscena && (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(11, 13, 18, 0.94)",
            color: "#fff",
            textAlign: "center",
          }}
        >
          No se pudo iniciar la vista 3D real. Verificá la conexión y la configuración de Cesium e
          intentá de nuevo.
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

      {!enLinea && (
        <div
          role="status"
          style={{
            position: "absolute",
            left: 12,
            bottom: 50,
            zIndex: 5,
            padding: "4px 10px",
            borderRadius: 6,
            background: "rgba(255, 250, 235, 0.95)",
            color: "#8c6d1f",
            fontSize: 11,
            pointerEvents: "none",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
          }}
        >
          Sin conexión · mostrando el último estado conocido de los lotes
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
          : " · probá la hora del día desde el panel de controles"}
      </div>
    </div>
  );
}
