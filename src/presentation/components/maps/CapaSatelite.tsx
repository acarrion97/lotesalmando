import { useEffect, useMemo, useRef, useState } from "react";
import type { LimitesGeo } from "./georef";
import { recorteTileAncestro, rejillaTiles, urlTile } from "./georef";
import { disponibilidadTilesEsri, tileEsriDisponible } from "./tilesEsri";

interface CapaSateliteProps {
  limites: LimitesGeo;
}

const ATRIBUCION = "Esri · Maxar · Earthstar Geographics";
const TAMANO_TILE = 256;

interface TileSateliteProps {
  zoomPedido: number;
  x: number;
  y: number;
  left: number;
  top: number;
  disponibilidadInicial: boolean | undefined;
}

function TileSatelite({
  zoomPedido,
  x,
  y,
  left,
  top,
  disponibilidadInicial,
}: TileSateliteProps) {
  const [zoomActual, setZoomActual] = useState(() =>
    disponibilidadInicial === false ? Math.max(0, zoomPedido - 1) : zoomPedido,
  );
  const [disponible, setDisponible] = useState<boolean | null>(
    disponibilidadInicial === true ? true : null,
  );
  const [sinImagen, setSinImagen] = useState(false);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState(false);
  const tile = useMemo(
    () => (sinImagen ? null : recorteTileAncestro(zoomPedido, x, y, zoomActual)),
    [sinImagen, zoomPedido, x, y, zoomActual],
  );

  useEffect(() => {
    if (disponible !== null || sinImagen || !tile) return;
    let vivo = true;
    void tileEsriDisponible(tile.zoom, tile.x, tile.y)
      .then((resultado) => {
        if (!vivo) return;
        if (resultado) {
          setDisponible(true);
        } else if (zoomActual === 0) {
          setSinImagen(true);
        } else {
          setZoomActual((actual) => actual - 1);
        }
      })
      .catch((error: unknown) => {
        console.error("No se pudo comprobar la cobertura de una imagen satelital.", error);
        if (vivo) setErrorDisponibilidad(true);
      });
    return () => {
      vivo = false;
    };
  }, [disponible, sinImagen, tile, zoomActual]);

  return (
    <div
      role={sinImagen ? "img" : undefined}
      aria-label={sinImagen ? "Imagen satelital no disponible para esta zona" : undefined}
      style={{
        position: "absolute",
        left,
        top,
        width: TAMANO_TILE,
        height: TAMANO_TILE,
        overflow: "hidden",
        background: "linear-gradient(160deg, #1d3b2f 0%, #14281f 100%)",
      }}
    >
      {disponible && tile ? (
        <img
          src={urlTile(tile.zoom, tile.x, tile.y)}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          onError={() => {
            setDisponible(null);
            if (zoomActual === 0) setSinImagen(true);
            else setZoomActual((actual) => actual - 1);
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: TAMANO_TILE,
            height: TAMANO_TILE,
            transform: `translate(${-tile.desplazamientoX}px, ${-tile.desplazamientoY}px) scale(${tile.escala})`,
            transformOrigin: "top left",
            userSelect: "none",
          }}
        />
      ) : sinImagen || errorDisponibilidad ? (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "rgba(255,255,255,0.7)",
            fontSize: 11,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          {errorDisponibilidad ? "No se pudo comprobar la cobertura" : "Sin imagen satelital"}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Capa satélite de tiles (Esri World Imagery, sin API key) recortada a la
 * ventana geográfica del plano: se dibuja debajo de la imagen del plano y
 * los polígonos de lotes caen exactamente sobre el terreno real.
 *
 * Se mide sola (ResizeObserver) para poder vivir dentro del visor del plano
 * o bajo la escena 3D sin que el caller tenga que pasarle tamaños.
 */
export function CapaSatelite({ limites }: CapaSateliteProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [resultadoDisponibilidad, setResultadoDisponibilidad] = useState<{
    clave: string;
    disponibles: ReadonlyMap<string, boolean> | null;
    error: boolean;
  } | null>(null);

  // Se desestructura para que el useMemo no dependa de un objeto nuevo
  // creado en cada render del padre.
  const { norte, sur, este, oeste } = limites;

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const medir = () => setAncho(el.clientWidth);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rejilla = useMemo(
    () => (ancho > 0 ? rejillaTiles({ norte, sur, este, oeste }, ancho) : null),
    [norte, sur, este, oeste, ancho],
  );
  const claveDisponibilidad = rejilla
    ? `${rejilla.zoom}:${rejilla.tiles.map(({ x, y }) => `${x}/${y}`).join(",")}`
    : null;
  const escala = rejilla && rejilla.anchoPx > 0 ? ancho / rejilla.anchoPx : 1;

  useEffect(() => {
    if (!rejilla || claveDisponibilidad === null) return;
    let vivo = true;
    void disponibilidadTilesEsri(
      rejilla.zoom,
      rejilla.tiles.map(({ x, y }) => ({ x, y })),
    )
      .then((disponibles) => {
        if (vivo) setResultadoDisponibilidad({ clave: claveDisponibilidad, disponibles, error: false });
      })
      .catch((error: unknown) => {
        console.error("No se pudo consultar la cobertura satelital de Esri.", error);
        if (vivo) {
          setResultadoDisponibilidad({ clave: claveDisponibilidad, disponibles: null, error: true });
        }
      });
    return () => {
      vivo = false;
    };
  }, [claveDisponibilidad, rejilla]);

  const tilesDisponibles =
    resultadoDisponibilidad?.clave === claveDisponibilidad
      ? resultadoDisponibilidad.disponibles
      : null;

  return (
    <div
      ref={contenedorRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "linear-gradient(160deg, #1d3b2f 0%, #14281f 100%)",
      }}
      aria-label="Vista satélite del terreno"
    >
      {rejilla && rejilla.tiles.length > 0 && tilesDisponibles && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: rejilla.anchoPx,
            height: rejilla.altoPx,
            transform: `scale(${escala})`,
            transformOrigin: "0 0",
          }}
        >
          {rejilla.tiles.map((tile) => (
            <TileSatelite
              key={`${rejilla.zoom}-${tile.x}-${tile.y}`}
              zoomPedido={rejilla.zoom}
              x={tile.x}
              y={tile.y}
              left={tile.left}
              top={tile.top}
              disponibilidadInicial={tilesDisponibles.get(`${tile.x}/${tile.y}`)}
            />
          ))}
        </div>
      )}
      {resultadoDisponibilidad?.clave === claveDisponibilidad && resultadoDisponibilidad.error && (
        <div
          role="status"
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontSize: 13,
            textAlign: "center",
            background: "rgba(0,0,0,0.35)",
          }}
        >
          No se pudo comprobar la cobertura satelital.
        </div>
      )}
      <div
        style={{
          position: "absolute",
          right: 6,
          bottom: 4,
          padding: "1px 6px",
          borderRadius: 4,
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          fontSize: 10,
          lineHeight: "14px",
          pointerEvents: "none",
        }}
      >
        {ATRIBUCION}
      </div>
    </div>
  );
}
