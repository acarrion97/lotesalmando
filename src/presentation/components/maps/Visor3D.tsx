import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { Button, Segmented, Tooltip } from "antd";
import { ZoomInOutlined, ZoomOutOutlined, CompressOutlined, AimOutlined } from "@ant-design/icons";
import type { PuntoPlano } from "@/domain/lote/entities";
import type { PlanoLote, UbicacionPlano } from "@/domain/mapa/entities";
import { etiquetaLote } from "./PlanoInteractivo";
import { ESTILO_ESTADO_PLANO } from "./estilosEstadoLote";
import { CapaSatelite } from "./CapaSatelite";
import { limitesDelPlano } from "./georef";

/** Inclinación de la escena: 0 = vista cenital (plano rasante), 85 = casi de canto. */
const INCLINACION_INICIAL = 58;
const INCLINACION_MIN = 0;
const INCLINACION_MAX = 85;
const ESCALA_MIN = 0.6;
const ESCALA_MAX = 3;
/** Capas apiladas que forman el volumen de cada lote (efecto extruido). */
const CAPAS_RELIEVE = 8;

export type Capa = "interna" | "aerea" | "render";

interface Visor3DProps {
  imagenUrl: string;
  /** Ubicación GPS del plano; sin ella solo se puede ver la capa interna. */
  ubicacion?: UbicacionPlano | null;
  /**
   * Render 3D del proyecto (imagen subida en Configuración). Si existe
   * aparece la capa "Render": la imagen se apoya en el plano inclinado y
   * el visitante la gira/acerca como una guía visual del emprendimiento.
   */
  renderUrl?: string | null;
  /**
   * Capa con la que arranca la escena (por defecto la interna). El modo
   * "Render 3D" la pasa como `"render"` para abrir directo sobre el render;
   * si la pedida no está disponible se cae a la interna (ver `capaActiva`).
   */
  capaInicial?: Capa;
  lotes: PlanoLote[];
  onLoteClick?: (lote: PlanoLote) => void;
  /** Si se pasa, los lotes fuera del conjunto se atenúan. */
  resaltados?: ReadonlySet<number> | null;
  mostrarPrecio?: boolean;
  onImagenError?: () => void;
  /** Alto máximo del visor (px). */
  alturaMaxima?: number;
  mostrarEtiquetas?: boolean;
}

interface Hover {
  lote: PlanoLote;
  x: number;
  y: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function oscurecer(hex: string, factor: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const n = parseInt(match[1], 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function centroide(poligono: PuntoPlano[]): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (const [px, py] of poligono) {
    x += px;
    y += py;
  }
  return { x: x / poligono.length, y: y / poligono.length };
}

function anchoPoligono(poligono: PuntoPlano[]): number {
  const xs = poligono.map(([x]) => x);
  return Math.max(...xs) - Math.min(...xs);
}

/**
 * Vista 3D del plano: la imagen (o la capa satélite) queda tendida como una
 * mesa inclinada y cada lote se levanta como un volumen con el color de su
 * estado. Sin dependencias: es `transform` 3D del navegador + SVG.
 *
 * Controles: arrastrar para girar/inclinar, rueda para acercar, clic en un
 * lote para abrir su ficha.
 */
export function Visor3D({
  imagenUrl,
  ubicacion,
  renderUrl,
  capaInicial = "interna",
  lotes,
  onLoteClick,
  resaltados,
  mostrarPrecio = false,
  onImagenError,
  alturaMaxima,
  mostrarEtiquetas = true,
}: Visor3DProps) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [medida, setMedida] = useState<{ url: string; w: number; h: number } | null>(null);
  const natural = medida?.url === imagenUrl ? medida : null;
  /**
   * Estado de la imagen del render: proporción medida y si falló la carga.
   * Mientras está `pendiente` la escena no cae a la capa interna, para que el
   * modo "Render 3D" no muestre un destello del plano antes de llegar el
   * render (tarea «Render 3D en otra pestaña»).
   */
  const [renderInfo, setRenderInfo] = useState<{
    url: string;
    w: number;
    h: number;
    fallo: boolean;
  } | null>(null);
  const renderOk = renderInfo && renderInfo.url === renderUrl && !renderInfo.fallo;
  const naturalRender = renderOk ? renderInfo : null;
  const renderFallo = !!renderInfo && renderInfo.url === renderUrl && renderInfo.fallo;
  /** El render todavía se está cargando (hay URL, ni OK ni fallo). */
  const renderPendiente = !!renderUrl && !naturalRender && !renderFallo;
  const [visorAncho, setVisorAncho] = useState(0);
  const [inclinacion, setInclinacion] = useState(INCLINACION_INICIAL);
  const [giro, setGiro] = useState(0);
  const [escala, setEscala] = useState(1);
  const [capa, setCapa] = useState<Capa>(capaInicial);
  const [hover, setHover] = useState<Hover | null>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const arrastre = useRef<{ x: number; y: number; inclinacion: number; giro: number } | null>(null);
  const ignorarClic = useRef(false);

  useLayoutEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const medir = () => setVisorAncho(el.clientWidth);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Zoom con la rueda: listener no pasivo para poder cancelar el scroll.
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setEscala((actual) => clamp(actual * (1 - e.deltaY * 0.0016), ESCALA_MIN, ESCALA_MAX));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const altoDisponible = alturaMaxima ?? Math.max(420, window.innerHeight - 260);
  const limites = useMemo(
    () => (ubicacion && natural ? limitesDelPlano(ubicacion, natural.w / natural.h) : null),
    [ubicacion, natural],
  );
  const hayCapaAerea = !!limites;
  const hayRender = !!renderUrl && !!naturalRender;
  /**
   * Capa elegida, o la interna si la pedida no está disponible. La capa
   * Render solo se abandona cuando el render falló o no existe: mientras
   * carga se mantiene, para no destellar el plano en el modo "Render 3D".
   */
  const capaActiva: Capa =
    capa === "aerea" && !hayCapaAerea
      ? "interna"
      : capa === "render" && !hayRender && !renderPendiente
        ? "interna"
        : capa;
  // La capa Render usa la proporción de su propia imagen; el resto, la del plano.
  const aspecto =
    capaActiva === "render" && naturalRender
      ? naturalRender.w / naturalRender.h
      : natural
        ? natural.w / natural.h
        : 16 / 9;
  const anchoBase = useMemo(() => {
    if (!visorAncho) return 0;
    return Math.max(120, Math.min(visorAncho - 32, (altoDisponible - 56) * aspecto));
  }, [visorAncho, altoDisponible, aspecto]);

  const anchoLienzo = anchoBase * escala;
  const altoLienzo = anchoLienzo / aspecto;
  const altoRelieve = clamp(anchoLienzo * 0.05, 14, 60);

  const lotesDibujados = useMemo(
    () => lotes.filter((l) => l.poligono && l.poligono.length >= 3),
    [lotes],
  );

  const aPuntos = (poligono: PuntoPlano[]) =>
    natural ? poligono.map(([x, y]) => `${x * natural.w},${y * natural.h}`).join(" ") : "";

  const estiloDe = (estado: PlanoLote["estado"]) =>
    ESTILO_ESTADO_PLANO[estado] ?? ESTILO_ESTADO_PLANO.disponible;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // Los controles (botones, segmented) no deben iniciar un arrastre.
    if ((e.target as HTMLElement).closest("button, .ant-segmented")) return;
    arrastre.current = {
      x: e.clientX,
      y: e.clientY,
      inclinacion,
      giro,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const a = arrastre.current;
    if (!a) return;
    const dx = e.clientX - a.x;
    const dy = e.clientY - a.y;
    if (!arrastrando && Math.hypot(dx, dy) < 4) return;
    if (!arrastrando) {
      setArrastrando(true);
      setHover(null);
    }
    setGiro(a.giro + dx * 0.35);
    setInclinacion(clamp(a.inclinacion + dy * 0.22, INCLINACION_MIN, INCLINACION_MAX));
  };

  const terminarArrastre = () => {
    if (arrastre.current && arrastrando) ignorarClic.current = true;
    arrastre.current = null;
    setArrastrando(false);
  };

  const moverTooltip = (lote: PlanoLote, e: ReactMouseEvent) => {
    const rect = contenedorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ lote, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const clicLote = (lote: PlanoLote) => {
    if (ignorarClic.current) {
      ignorarClic.current = false;
      return;
    }
    onLoteClick?.(lote);
  };

  const estiloBoton: CSSProperties = { width: 32, height: 32 };
  const textoEtiqueta = Math.max(8, (14 * (natural?.w || 1)) / Math.max(1, anchoLienzo));

  const capas = useMemo(() => Array.from({ length: CAPAS_RELIEVE }, (_, i) => i + 1), []);

  const svgPoligonos = (children: ReactNode) =>
    natural ? (
      <svg
        viewBox={`0 0 ${natural.w} ${natural.h}`}
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {children}
      </svg>
    ) : null;

  return (
    <div
      ref={contenedorRef}
      style={{
        position: "relative",
        height: altoDisponible,
        overflow: "hidden",
        background:
          capaActiva === "aerea"
            ? "radial-gradient(ellipse at 50% 30%, #17303a 0%, #0c1a20 100%)"
            : "linear-gradient(180deg, #eef2f4 0%, #dfe7ea 100%)",
        perspective: "1400px",
        perspectiveOrigin: "50% 42%",
        cursor: arrastrando ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "pan-y",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={terminarArrastre}
      onPointerCancel={terminarArrastre}
      onMouseLeave={() => setHover(null)}
    >
      {/* Mide la proporción de la imagen aunque se esté viendo la capa satélite. */}
      <img
        src={imagenUrl}
        alt=""
        aria-hidden
        draggable={false}
        onLoad={(e) =>
          setMedida({
            url: imagenUrl,
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          })
        }
        onError={onImagenError}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />

      {/* Mide la proporción del render para que la capa Render no se deforme. */}
      {renderUrl && (
        <img
          src={renderUrl}
          alt=""
          aria-hidden
          draggable={false}
          onLoad={(e) =>
            setRenderInfo({
              url: renderUrl,
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
              fallo: false,
            })
          }
          onError={() => setRenderInfo({ url: renderUrl, w: 0, h: 0, fallo: true })}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: 4,
          background: "rgba(255,255,255,0.94)",
          borderRadius: 8,
          boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
        }}
      >
        <Tooltip title="Acercar" placement="left">
          <Button
            type="text"
            size="small"
            style={estiloBoton}
            icon={<ZoomInOutlined />}
            aria-label="Acercar"
            disabled={escala >= ESCALA_MAX}
            onClick={() => setEscala((s) => clamp(s * 1.25, ESCALA_MIN, ESCALA_MAX))}
          />
        </Tooltip>
        <Tooltip title="Alejar" placement="left">
          <Button
            type="text"
            size="small"
            style={estiloBoton}
            icon={<ZoomOutOutlined />}
            aria-label="Alejar"
            disabled={escala <= ESCALA_MIN}
            onClick={() => setEscala((s) => clamp(s / 1.25, ESCALA_MIN, ESCALA_MAX))}
          />
        </Tooltip>
        <Tooltip title={inclinacion > 5 ? "Vista cenital" : "Vista oblicua"} placement="left">
          <Button
            type="text"
            size="small"
            style={estiloBoton}
            icon={<AimOutlined />}
            aria-label="Alternar vista cenital y oblicua"
            onClick={() => setInclinacion(inclinacion > 5 ? 0 : INCLINACION_INICIAL)}
          />
        </Tooltip>
        <Tooltip title="Restablecer vista" placement="left">
          <Button
            type="text"
            size="small"
            style={estiloBoton}
            icon={<CompressOutlined />}
            aria-label="Restablecer vista"
            onClick={() => {
              setEscala(1);
              setGiro(0);
              setInclinacion(INCLINACION_INICIAL);
            }}
          />
        </Tooltip>
      </div>

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 5,
          padding: 4,
          background: "rgba(255,255,255,0.94)",
          borderRadius: 8,
          boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
        }}
      >
        <Tooltip
          title={
            hayCapaAerea
              ? undefined
              : "Definí la ubicación GPS del plano en Configuración para ver el terreno real"
          }
          placement="bottom"
        >
          <div>
            <Segmented
              size="small"
              value={capaActiva}
              onChange={(v) => setCapa(v as Capa)}
              options={[
                { label: "Plano interno", value: "interna" },
                ...(renderUrl
                  ? [{ label: "Render", value: "render" as Capa, disabled: !naturalRender }]
                  : []),
                { label: "Satélite", value: "aerea", disabled: !hayCapaAerea },
              ]}
            />
          </div>
        </Tooltip>
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: anchoLienzo,
          height: altoLienzo,
          marginLeft: -anchoLienzo / 2,
          marginTop: -altoLienzo / 2,
          transformStyle: "preserve-3d",
          transform: `rotateX(${inclinacion}deg) rotateZ(${giro}deg)`,
        }}
      >
        {/* Base: render, satélite o plano; el render es la guía visual del proyecto. */}
        {capaActiva === "render" && renderUrl ? (
          <img
            src={renderUrl}
            alt="Render 3D del proyecto"
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        ) : capaActiva === "aerea" && limites ? (
          <CapaSatelite limites={limites} mostrarEtiquetas={mostrarEtiquetas} />
        ) : (
          <img
            src={imagenUrl}
            alt="Plano del proyecto"
            draggable={false}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
        )}

        {/* Los polígonos se dibujan sobre el plano y sobre el satélite (ahí
            están georreferenciados); sobre el render no, porque el render es
            una imagen del proyecto y no guarda correspondencia con el plano. */}
        {capaActiva !== "render" &&
          natural &&
          svgPoligonos(
            lotesDibujados.map((lote) => {
              const estilo = estiloDe(lote.estado);
              const atenuado = !!resaltados && !resaltados.has(lote.id_lote);
              return (
                <polygon
                  key={`suelo-${lote.id_lote}`}
                  points={aPuntos(lote.poligono!)}
                  fill={estilo.color}
                  fillOpacity={estilo.fillOpacity ? Math.max(estilo.fillOpacity, 0.35) : 0.18}
                  stroke={estilo.color}
                  strokeOpacity={0.8}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  opacity={atenuado ? 0.3 : 1}
                  style={{ pointerEvents: "none" }}
                />
              );
            }),
          )}

        {/* Volumen: capas apiladas que simulan la extrusión de cada lote. */}
        {capaActiva !== "render" &&
          natural &&
          capas.map((i) => {
            const brillo = 0.34 + (0.58 * i) / CAPAS_RELIEVE;
            return (
              <div
                key={`relieve-${i}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  transform: `translateZ(${(altoRelieve * i) / CAPAS_RELIEVE}px)`,
                  pointerEvents: "none",
                }}
              >
                {svgPoligonos(
                  lotesDibujados.map((lote) => {
                    const estilo = estiloDe(lote.estado);
                    const atenuado = !!resaltados && !resaltados.has(lote.id_lote);
                    const color = oscurecer(estilo.color, brillo);
                    return (
                      <polygon
                        key={`pared-${lote.id_lote}`}
                        points={aPuntos(lote.poligono!)}
                        fill={color}
                        stroke={color}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                        opacity={(lote.estado === "disponible" ? 0.5 : 0.95) * (atenuado ? 0.3 : 1)}
                      />
                    );
                  }),
                )}
              </div>
            );
          })}

        {/* Cara superior: color, etiqueta y clic. */}
        {capaActiva !== "render" && natural && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `translateZ(${altoRelieve}px)`,
            }}
          >
            {svgPoligonos(
              lotesDibujados.map((lote) => {
                const estilo = estiloDe(lote.estado);
                const activo = hover?.lote.id_lote === lote.id_lote;
                const atenuado = !!resaltados && !resaltados.has(lote.id_lote);
                const disponible = lote.estado === "disponible";
                const centro = centroide(lote.poligono!);
                const ancho = anchoPoligono(lote.poligono!);
                const cabeEtiqueta = ancho * natural.w > textoEtiqueta * 3.2;
                return (
                  <g key={`cara-${lote.id_lote}`}>
                    <polygon
                      points={aPuntos(lote.poligono!)}
                      role={onLoteClick ? "button" : undefined}
                      tabIndex={onLoteClick ? 0 : undefined}
                      aria-label={`${etiquetaLote(lote)}: ${estilo.label}`}
                      fill={estilo.color}
                      fillOpacity={
                        activo
                          ? Math.max(0.45, estilo.fillOpacity)
                          : disponible
                            ? 0.42
                            : Math.max(estilo.fillOpacity, 0.85)
                      }
                      stroke={activo ? "#fff" : disponible ? estilo.color : "#ffffff"}
                      strokeWidth={activo ? 3 : 1.5}
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      opacity={atenuado ? 0.35 : 1}
                      style={{
                        cursor: onLoteClick ? "pointer" : "default",
                        outline: "none",
                        transition: "fill-opacity 120ms, stroke 120ms",
                      }}
                      onMouseMove={(e) => moverTooltip(lote, e)}
                      onMouseLeave={() => setHover(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        clicLote(lote);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onLoteClick?.(lote);
                        }
                      }}
                    />
                    {cabeEtiqueta && !atenuado && (
                      <text
                        x={centro.x * natural.w}
                        y={centro.y * natural.h}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={textoEtiqueta}
                        fontWeight={700}
                        fill="#ffffff"
                        stroke="rgba(0,0,0,0.55)"
                        strokeWidth={textoEtiqueta * 0.2}
                        paintOrder="stroke"
                        style={{ pointerEvents: "none" }}
                      >
                        {lote.numero_lote}
                      </text>
                    )}
                  </g>
                );
              }),
            )}
          </div>
        )}
      </div>

      {hover && (
        <div
          style={{
            position: "absolute",
            left: hover.x,
            top: hover.y,
            transform:
              hover.x > visorAncho - 220
                ? "translate(calc(-100% - 14px), -50%)"
                : "translate(14px, -50%)",
            zIndex: 6,
            pointerEvents: "none",
            background: "#fff",
            borderRadius: 8,
            padding: "8px 12px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
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
          {mostrarPrecio && hover.lote.precio_lista != null && (
            <div style={{ fontSize: 12, color: "#595959" }}>
              ${hover.lote.precio_lista.toLocaleString()}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 10,
          zIndex: 5,
          padding: "4px 10px",
          borderRadius: 6,
          background: "rgba(255,255,255,0.9)",
          color: "#595959",
          fontSize: 11,
          pointerEvents: "none",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        }}
      >
        Arrastrá para girar · rueda para acercar
        {onLoteClick && capaActiva !== "render" ? " · clic en un lote para ver su ficha" : ""}
        {capaActiva === "render" ? " · capa Render: imagen de referencia del proyecto" : ""}
      </div>
    </div>
  );
}
