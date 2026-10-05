import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import { Button, Tooltip } from "antd";
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CompressOutlined,
} from "@ant-design/icons";
import type { LoteEstado, PuntoPlano } from "@/domain/lote/entities";
import type { PlanoLote } from "@/domain/mapa/entities";

/**
 * Color de cada estado sobre el plano. Los disponibles van transparentes
 * (se ve el dibujo del plano) y solo se marcan al pasar el mouse; el resto
 * se tapa con el color del estado.
 */
export const ESTILO_ESTADO_PLANO: Record<
  LoteEstado,
  { color: string; fillOpacity: number; label: string }
> = {
  disponible: { color: "#52c41a", fillOpacity: 0, label: "Disponible" },
  reservado: { color: "#faad14", fillOpacity: 0.6, label: "Reservado" },
  en_negociacion: { color: "#1677ff", fillOpacity: 0.55, label: "En negociación" },
  vendido: { color: "#8b1a1a", fillOpacity: 0.72, label: "Vendido" },
  bloqueado: { color: "#595959", fillOpacity: 0.6, label: "Bloqueado" },
  no_disponible: { color: "#595959", fillOpacity: 0.6, label: "No disponible" },
};

const estiloDe = (estado: LoteEstado) => ESTILO_ESTADO_PLANO[estado] ?? ESTILO_ESTADO_PLANO.disponible;

/** "A" -> "Manzana A - Lote 3"; "Manzana A" no se duplica. */
export function etiquetaLote(lote: Pick<PlanoLote, "manzana" | "numero_lote">): string {
  const manzana = /^(manzana|mz)/i.test(lote.manzana) ? lote.manzana : `Manzana ${lote.manzana}`;
  return `${manzana} - Lote ${lote.numero_lote}`;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 6;
const PASO_ZOOM = 1.5;
/** Radio (px de pantalla) dentro del cual un clic se pega a un vértice existente. */
const RADIO_IMAN = 9;

export interface DibujoPlano {
  puntos: PuntoPlano[];
  /** Lote que se está dibujando: se oculta su contorno anterior. */
  loteId?: number;
  onAgregarPunto: (punto: PuntoPlano) => void;
}

interface PlanoInteractivoProps {
  imagenUrl: string;
  lotes: PlanoLote[];
  onLoteClick?: (lote: PlanoLote) => void;
  /** Si se pasa, los lotes fuera del conjunto se atenúan (p. ej. otra manzana). */
  resaltados?: ReadonlySet<number> | null;
  /** Modo edición: cada clic en el plano agrega un vértice. */
  dibujo?: DibujoPlano | null;
  mostrarPrecio?: boolean;
  onImagenError?: () => void;
  /** Alto máximo del visor fuera de pantalla completa (px). */
  alturaMaxima?: number;
}

interface Hover {
  lote: PlanoLote;
  x: number;
  y: number;
}

export function PlanoInteractivo({
  imagenUrl,
  lotes,
  onLoteClick,
  resaltados,
  dibujo,
  mostrarPrecio = false,
  onImagenError,
  alturaMaxima,
}: PlanoInteractivoProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const visorRef = useRef<HTMLDivElement>(null);
  // Se guarda junto con la URL medida: si cambia la imagen, deja de valer sola.
  const [medida, setMedida] = useState<{ url: string; w: number; h: number } | null>(null);
  const natural = medida?.url === imagenUrl ? medida : null;
  const [visor, setVisor] = useState({ ancho: 0, altoVentana: typeof window === "undefined" ? 800 : window.innerHeight });
  const [zoom, setZoom] = useState(1);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);

  // Centro (en fracción del lienzo) a conservar cuando cambia el zoom.
  const centroZoom = useRef<{ x: number; y: number } | null>(null);
  const arrastre = useRef<{ x: number; y: number; left: number; top: number; movido: boolean } | null>(null);
  const ignorarClic = useRef(false);

  useLayoutEffect(() => {
    const el = visorRef.current;
    if (!el) return;
    const medir = () => setVisor({ ancho: el.clientWidth, altoVentana: window.innerHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener("resize", medir);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  useEffect(() => {
    const onCambio = () => setPantallaCompleta(document.fullscreenElement === contenedorRef.current);
    document.addEventListener("fullscreenchange", onCambio);
    return () => document.removeEventListener("fullscreenchange", onCambio);
  }, []);

  const altoDisponible = pantallaCompleta
    ? visor.altoVentana
    : (alturaMaxima ?? Math.max(320, visor.altoVentana - 220));

  // Ancho base: la imagen entera cabe en el visor (ni más ancha ni más alta).
  const anchoBase = useMemo(() => {
    if (!natural || !visor.ancho) return visor.ancho || 0;
    return Math.min(visor.ancho, (altoDisponible * natural.w) / natural.h);
  }, [natural, visor.ancho, altoDisponible]);

  const anchoLienzo = anchoBase * zoom;
  const pxPorUnidad = natural ? anchoLienzo / natural.w : 1;

  useLayoutEffect(() => {
    const el = visorRef.current;
    const centro = centroZoom.current;
    if (!el || !centro || !natural) return;
    centroZoom.current = null;
    const altoLienzo = (anchoLienzo * natural.h) / natural.w;
    el.scrollLeft = centro.x * anchoLienzo - el.clientWidth / 2;
    el.scrollTop = centro.y * altoLienzo - el.clientHeight / 2;
  }, [anchoLienzo, natural]);

  const cambiarZoom = useCallback(
    (siguiente: number) => {
      const el = visorRef.current;
      const nuevo = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, siguiente));
      if (el && natural && anchoLienzo) {
        const altoLienzo = (anchoLienzo * natural.h) / natural.w;
        centroZoom.current = {
          x: (el.scrollLeft + el.clientWidth / 2) / anchoLienzo,
          y: altoLienzo ? (el.scrollTop + el.clientHeight / 2) / altoLienzo : 0.5,
        };
      }
      setZoom(nuevo);
    },
    [natural, anchoLienzo],
  );

  const alternarPantallaCompleta = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void contenedorRef.current?.requestFullscreen?.();
  };

  // --- Arrastre para mover el plano con el mouse cuando hay zoom ---
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || zoom === 1) return;
    const el = visorRef.current;
    if (!el) return;
    arrastre.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, movido: false };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const a = arrastre.current;
    const el = visorRef.current;
    if (!a || !el) return;
    const dx = e.clientX - a.x;
    const dy = e.clientY - a.y;
    if (!a.movido && Math.hypot(dx, dy) < 4) return;
    a.movido = true;
    setHover(null);
    el.scrollLeft = a.left - dx;
    el.scrollTop = a.top - dy;
  };
  const terminarArrastre = () => {
    if (arrastre.current?.movido) ignorarClic.current = true;
    arrastre.current = null;
  };

  // --- Modo dibujo ---
  const verticesExistentes = useMemo(
    () => lotes.filter((l) => l.id_lote !== dibujo?.loteId).flatMap((l) => l.poligono ?? []),
    [lotes, dibujo?.loteId],
  );

  const onClicLienzo = (e: ReactMouseEvent<SVGSVGElement>) => {
    if (ignorarClic.current) {
      ignorarClic.current = false;
      return;
    }
    if (!dibujo || !natural) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;

    // Imán: los lotes vecinos comparten esquinas; pegarse al vértice más
    // cercano evita huecos y solapes entre contornos.
    let mejor = RADIO_IMAN;
    for (const [vx, vy] of [...verticesExistentes, ...dibujo.puntos]) {
      const d = Math.hypot((vx - x) * rect.width, (vy - y) * rect.height);
      if (d < mejor) {
        mejor = d;
        x = vx;
        y = vy;
      }
    }
    dibujo.onAgregarPunto([x, y]);
  };

  const moverTooltip = (lote: PlanoLote, e: ReactMouseEvent) => {
    const rect = contenedorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ lote, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const aPuntos = (poligono: PuntoPlano[]) =>
    natural ? poligono.map(([x, y]) => `${x * natural.w},${y * natural.h}`).join(" ") : "";

  const lotesDibujados = lotes.filter(
    (l) => l.poligono && l.poligono.length >= 3 && l.id_lote !== dibujo?.loteId,
  );

  const estiloBotonControl: CSSProperties = { width: 32, height: 32 };

  return (
    <div
      ref={contenedorRef}
      style={{
        position: "relative",
        background: pantallaCompleta ? "#111" : "#f5f5f5",
        height: pantallaCompleta ? "100vh" : undefined,
      }}
      onMouseLeave={() => setHover(null)}
    >
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 3,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: 4,
          background: "rgba(255,255,255,0.92)",
          borderRadius: 8,
          boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
        }}
      >
        <Tooltip title="Acercar" placement="left">
          <Button
            type="text"
            size="small"
            style={estiloBotonControl}
            icon={<ZoomInOutlined />}
            aria-label="Acercar"
            disabled={zoom >= ZOOM_MAX}
            onClick={() => cambiarZoom(zoom * PASO_ZOOM)}
          />
        </Tooltip>
        <Tooltip title="Alejar" placement="left">
          <Button
            type="text"
            size="small"
            style={estiloBotonControl}
            icon={<ZoomOutOutlined />}
            aria-label="Alejar"
            disabled={zoom <= ZOOM_MIN}
            onClick={() => cambiarZoom(zoom / PASO_ZOOM)}
          />
        </Tooltip>
        {zoom > ZOOM_MIN && (
          <Tooltip title="Ver completo" placement="left">
            <Button
              type="text"
              size="small"
              style={estiloBotonControl}
              icon={<CompressOutlined />}
              aria-label="Ver completo"
              onClick={() => cambiarZoom(1)}
            />
          </Tooltip>
        )}
        <Tooltip title={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"} placement="left">
          <Button
            type="text"
            size="small"
            style={estiloBotonControl}
            icon={pantallaCompleta ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            aria-label="Pantalla completa"
            onClick={alternarPantallaCompleta}
          />
        </Tooltip>
      </div>

      <div
        ref={visorRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={terminarArrastre}
        onPointerLeave={terminarArrastre}
        style={{
          overflow: "auto",
          maxHeight: altoDisponible,
          height: pantallaCompleta ? "100%" : undefined,
          display: "flex",
          alignItems: zoom === 1 ? "center" : "flex-start",
          cursor: dibujo ? "crosshair" : zoom > 1 ? "grab" : "default",
          userSelect: "none",
          touchAction: zoom > 1 ? "pan-x pan-y" : "auto",
        }}
      >
        <div
          style={{
            position: "relative",
            width: anchoLienzo || "100%",
            flexShrink: 0,
            margin: "0 auto",
          }}
        >
          <img
            src={imagenUrl}
            alt="Plano del proyecto"
            draggable={false}
            onLoad={(e) =>
              setMedida({
                url: imagenUrl,
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
            onError={onImagenError}
            style={{ display: "block", width: "100%", height: "auto" }}
          />
          {natural && (
            <svg
              viewBox={`0 0 ${natural.w} ${natural.h}`}
              preserveAspectRatio="none"
              onClick={onClicLienzo}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            >
              {lotesDibujados.map((lote) => {
                const estilo = estiloDe(lote.estado);
                const activo = hover?.lote.id_lote === lote.id_lote && !dibujo;
                const atenuado = !!resaltados && !resaltados.has(lote.id_lote);
                const disponible = lote.estado === "disponible";
                return (
                  <polygon
                    key={lote.id_lote}
                    points={aPuntos(lote.poligono!)}
                    role={onLoteClick ? "button" : undefined}
                    tabIndex={onLoteClick && !dibujo ? 0 : undefined}
                    aria-label={`${etiquetaLote(lote)}: ${estilo.label}`}
                    fill={estilo.color}
                    fillOpacity={activo ? Math.max(0.35, estilo.fillOpacity) : estilo.fillOpacity}
                    stroke={activo ? "#fff" : disponible ? (resaltados && !atenuado ? estilo.color : "transparent") : estilo.color}
                    strokeWidth={activo ? 2.5 : 1}
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={atenuado ? 0.35 : 1}
                    style={{
                      cursor: dibujo ? "crosshair" : onLoteClick ? "pointer" : "default",
                      outline: "none",
                      pointerEvents: dibujo ? "none" : "auto",
                      transition: "fill-opacity 120ms, stroke 120ms",
                    }}
                    onMouseMove={(e) => moverTooltip(lote, e)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => {
                      const box = contenedorRef.current?.getBoundingClientRect();
                      if (box) setHover({ lote, x: box.width / 2, y: 40 });
                    }}
                    onBlur={() => setHover(null)}
                    onClick={(e) => {
                      if (dibujo) return;
                      e.stopPropagation();
                      if (ignorarClic.current) {
                        ignorarClic.current = false;
                        return;
                      }
                      onLoteClick?.(lote);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onLoteClick?.(lote);
                      }
                    }}
                  />
                );
              })}

              {dibujo && dibujo.puntos.length > 0 && (
                <g style={{ pointerEvents: "none" }}>
                  <polygon
                    points={aPuntos(dibujo.puntos)}
                    fill="#1677ff"
                    fillOpacity={dibujo.puntos.length >= 3 ? 0.3 : 0}
                    stroke="#1677ff"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                  />
                  {dibujo.puntos.map(([x, y], i) => (
                    <circle
                      key={i}
                      cx={x * natural.w}
                      cy={y * natural.h}
                      r={(i === 0 ? 6 : 4.5) / pxPorUnidad}
                      fill={i === 0 ? "#fff" : "#1677ff"}
                      stroke="#1677ff"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              )}
            </svg>
          )}
        </div>
      </div>

      {hover && !dibujo && (
        <div
          style={{
            position: "absolute",
            left: hover.x,
            top: hover.y,
            transform:
              hover.x > visor.ancho - 220
                ? "translate(calc(-100% - 14px), -50%)"
                : "translate(14px, -50%)",
            zIndex: 4,
            pointerEvents: "none",
            background: "#fff",
            borderRadius: 8,
            padding: "8px 12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            whiteSpace: "nowrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: estiloDe(hover.lote.estado).color,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: estiloDe(hover.lote.estado).color,
              }}
            />
            {estiloDe(hover.lote.estado).label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#1f1f1f", marginTop: 2 }}>
            {etiquetaLote(hover.lote)}
          </div>
          {(hover.lote.superficie_m2 != null || hover.lote.medidas) && (
            <div style={{ fontSize: 12, color: "#595959" }}>
              {[
                hover.lote.superficie_m2 != null
                  ? `${hover.lote.superficie_m2.toLocaleString("es")} m²`
                  : null,
                hover.lote.medidas,
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
          {mostrarPrecio && hover.lote.precio_lista != null && (
            <div style={{ fontSize: 12, color: "#595959" }}>
              ${hover.lote.precio_lista.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface LeyendaPlanoProps {
  lotes: PlanoLote[];
}

/** Leyenda con el conteo por estado de los lotes dibujados. */
export function LeyendaPlano({ lotes }: LeyendaPlanoProps) {
  const conteo = useMemo(() => {
    const c = new Map<LoteEstado, number>();
    for (const l of lotes) c.set(l.estado, (c.get(l.estado) ?? 0) + 1);
    return c;
  }, [lotes]);

  const estados = (Object.keys(ESTILO_ESTADO_PLANO) as LoteEstado[]).filter(
    (e) => conteo.has(e) || e === "disponible" || e === "vendido",
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {estados.map((estado) => {
        const estilo = ESTILO_ESTADO_PLANO[estado];
        return (
          <div
            key={estado}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              background: "#fff",
              border: "1px solid #f0f0f0",
              borderRadius: 6,
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                border: `2px solid ${estilo.color}`,
                background: estilo.fillOpacity ? estilo.color : "transparent",
              }}
            />
            {estilo.label}
            <strong>{conteo.get(estado) ?? 0}</strong>
          </div>
        );
      })}
    </div>
  );
}
