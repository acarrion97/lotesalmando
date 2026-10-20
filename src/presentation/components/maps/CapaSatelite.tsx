import { useEffect, useMemo, useRef, useState } from "react";
import type { LimitesGeo } from "./georef";
import { rejillaTiles, urlTile } from "./georef";

interface CapaSateliteProps {
  limites: LimitesGeo;
}

const ATRIBUCION = "Esri · Maxar · Earthstar Geographics";

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
  const escala = rejilla && rejilla.anchoPx > 0 ? ancho / rejilla.anchoPx : 1;

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
      {rejilla && rejilla.tiles.length > 0 && (
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
            <img
              key={`${tile.x}-${tile.y}`}
              src={urlTile(rejilla.zoom, tile.x, tile.y)}
              alt=""
              draggable={false}
              loading="lazy"
              style={{
                position: "absolute",
                left: tile.left,
                top: tile.top,
                width: 256,
                height: 256,
                userSelect: "none",
              }}
            />
          ))}
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
