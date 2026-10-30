import { lazy, Suspense, useMemo, useState } from "react";
import { Empty, Segmented, Switch, Tooltip, Typography } from "antd";
import type { ReactNode } from "react";
import {
  AppstoreOutlined,
  BlockOutlined,
  GlobalOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type { PlanoLote, UbicacionPlano } from "@/domain/mapa/entities";
import { useOnlineStatus } from "@/presentation/hooks";
import type { DibujoPlano } from "./PlanoInteractivo";
import { PlanoInteractivo } from "./PlanoInteractivo";
import { Visor3D } from "./Visor3D";
import { CapaSatelite } from "./CapaSatelite";
import { limitesDelPlano } from "./georef";
import { capacidadesGraficas, disponibilidadDeLaEscena } from "./cesium/disponibilidad";

const { Text } = Typography;
const VisorCesium = lazy(() =>
  import("./cesium/VisorCesium").then((m) => ({ default: m.VisorCesium })),
);

/** Modos de visualización del mapa de un proyecto. */
export type ModoMapa = "plano" | "satelite" | "3d" | "cesium" | "render";

interface VisorMapaModosProps {
  imagenUrl: string;
  /** Ubicación GPS del plano: sin ella el modo satélite queda deshabilitado. */
  ubicacion?: UbicacionPlano | null;
  /** Render 3D del proyecto: si existe, la vista 3D ofrece la capa "Render". */
  renderUrl?: string | null;
  lotes: PlanoLote[];
  onLoteClick?: (lote: PlanoLote) => void;
  loteSeleccionadoId?: number | null;
  resaltados?: ReadonlySet<number> | null;
  mostrarPrecio?: boolean;
  onImagenError?: () => void;
  alturaMaxima?: number;
  /** Modo edición del plano: mientras se dibuja se fuerza el modo plano. */
  dibujo?: DibujoPlano | null;
  /** Modo activo (controlado por la página). */
  modo: ModoMapa;
  onModoChange: (modo: ModoMapa) => void;
  /** Elementos a la derecha del selector (p. ej. antigüedad de los datos). */
  acciones?: ReactNode;
  /**
   * Refresco de la vista 3D real: la página lo conecta a su `refetch` de
   * TanStack Query y el visor lo invoca por intervalo mientras haya
   * conexión (tarea 5.4). Los demás modos lo ignoran.
   */
  onRefrescarLotes?: () => void;
}

const OPCIONES: { label: string; value: ModoMapa; icon: ReactNode }[] = [
  { label: "Plano", value: "plano", icon: <AppstoreOutlined /> },
  { label: "Satélite", value: "cesium", icon: <GlobalOutlined /> },
  // Se ofrece solo si el proyecto cargó un render (se filtra más abajo).
  { label: "Render 3D", value: "render", icon: <BlockOutlined /> },
];

const MOTIVO_SIN_UBICACION =
  "Este proyecto todavía no tiene ubicación GPS. Cargá el centro del plano y su ancho en metros (Configuración → Mapa del proyecto) para usar la vista 3D real.";

/** Motivos de degradación del modo 3D real (design.md D10), con palabras útiles. */
const MOTIVOS_DEGRADACION = {
  "sin-webgl": "Tu navegador no soporta WebGL, que es lo que necesita la vista 3D real.",
  "sin-conexion": "Sin conexión a internet no se puede cargar la vista 3D real.",
} as const;

/**
 * Selector de modo alrededor de los visores: plano interactivo (con edición
 * de polígonos), vista satélite real georreferenciada, vista 3D del plano y
 * vista 3D geográfica Cesium. Un solo punto de entrada para ambas pantallas.
 */
export function VisorMapaModos({
  imagenUrl,
  ubicacion,
  renderUrl,
  lotes,
  onLoteClick,
  loteSeleccionadoId,
  resaltados,
  mostrarPrecio,
  onImagenError,
  alturaMaxima,
  dibujo,
  modo,
  onModoChange,
  acciones,
  onRefrescarLotes,
}: VisorMapaModosProps) {
  // Dibujando un contorno solo tiene sentido sobre el plano a sangre.
  const modoActivo: ModoMapa = dibujo ? "plano" : modo;
  const alto = alturaMaxima ?? Math.max(360, window.innerHeight - 260);
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(true);

  // La proporción de la imagen gobierna la ventana geográfica que cubre la
  // capa satélite; se mide con una imagen de carga (misma URL: un solo
  // request porque viene de la caché).
  const [aspecto, setAspecto] = useState(0);
  const limites = ubicacion && aspecto > 0 ? limitesDelPlano(ubicacion, aspecto) : null;

  // Disponibilidad del modo 3D real (tarea 6.2 / design.md D10): sin token la
  // opción no se ofrece; sin WebGL o sin conexión se ofrece deshabilitada con
  // el motivo a la vista. La medición de WebGL se cachea por sesión.
  const enLinea = useOnlineStatus();
  const disponibilidad = useMemo(
    () =>
      disponibilidadDeLaEscena({
        token: import.meta.env.VITE_CESIUM_TOKEN,
        graficas: capacidadesGraficas(),
        enLinea,
      }),
    [enLinea],
  );

  /** Por qué un modo no puede usarse ahora, o `null` si puede. */
  const motivoDesactivado = (valor: ModoMapa): string | null => {
    if (!ubicacion && (valor === "satelite" || valor === "cesium")) return MOTIVO_SIN_UBICACION;
    if (valor !== "cesium" || disponibilidad.motivo === null) return null;
    if (disponibilidad.motivo === "sin-token") return null; // sin token la opción no se muestra
    return MOTIVOS_DEGRADACION[disponibilidad.motivo];
  };

  return (
    <div style={{ position: "relative" }}>
      <img
        src={imagenUrl}
        alt=""
        aria-hidden
        draggable={false}
        onLoad={(e) =>
          setAspecto(
            e.currentTarget.naturalHeight > 0
              ? e.currentTarget.naturalWidth / e.currentTarget.naturalHeight
              : 0,
          )
        }
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 10,
        }}
      >
        <Segmented
          value={modoActivo}
          onChange={(v) => !dibujo && onModoChange(v as ModoMapa)}
          disabled={!!dibujo}
          options={OPCIONES.filter((o) => {
            // Sin token la vista 3D real no se ofrece en absoluto (D10).
            if (o.value === "cesium") return disponibilidad.motivo !== "sin-token";
            // Sin render subido en Configuración, el modo Render 3D no se ofrece.
            if (o.value === "render") return !!renderUrl;
            return true;
          }).map((o) => {
            const motivo = motivoDesactivado(o.value);
            return {
              value: o.value,
              disabled: motivo !== null,
              label: (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {o.icon}
                  {o.label}
                  {motivo && (
                    <Tooltip title={motivo}>
                      <QuestionCircleOutlined
                        aria-label={motivo}
                        style={{ fontSize: 11, opacity: 0.55 }}
                      />
                    </Tooltip>
                  )}
                </span>
              ),
            };
          })}
        />
        {ubicacion && ["satelite", "3d", "cesium", "render"].includes(modoActivo) && (
          <label
            title="Esri solo muestra los nombres publicados para esta zona y escala; algunas teselas no contienen etiquetas."
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Switch
              size="small"
              checked={mostrarEtiquetas}
              onChange={setMostrarEtiquetas}
              aria-label="Mostrar etiquetas del mapa"
            />
            <Text>Etiquetas</Text>
          </label>
        )}
        {acciones}
      </div>

      {modoActivo === "3d" ? (
        <Visor3D
          imagenUrl={imagenUrl}
          ubicacion={ubicacion}
          renderUrl={renderUrl}
          lotes={lotes}
          onLoteClick={onLoteClick}
          resaltados={resaltados}
          mostrarPrecio={mostrarPrecio}
          mostrarEtiquetas={mostrarEtiquetas}
          onImagenError={onImagenError}
          alturaMaxima={alto}
        />
      ) : modoActivo === "render" && renderUrl ? (
        // Modo "Render 3D": el mismo visor interactivo abierto sobre la capa
        // Render (girar, acercar y alternar capas como en la Vista 3D).
        <Visor3D
          imagenUrl={imagenUrl}
          ubicacion={ubicacion}
          renderUrl={renderUrl}
          capaInicial="render"
          lotes={lotes}
          onLoteClick={onLoteClick}
          resaltados={resaltados}
          mostrarPrecio={mostrarPrecio}
          mostrarEtiquetas={mostrarEtiquetas}
          onImagenError={onImagenError}
          alturaMaxima={alto}
        />
      ) : modoActivo === "cesium" && limites ? (
        <Suspense
          fallback={
            <div style={{ height: alto, display: "grid", placeItems: "center" }}>
              <Text type="secondary">Cargando vista 3D real…</Text>
            </div>
          }
        >
          <VisorCesium
            limites={limites}
            altura={alto}
            lotes={lotes}
            onLoteClick={onLoteClick}
            loteSeleccionadoId={loteSeleccionadoId}
            onRefrescarDatos={onRefrescarLotes}
            mostrarEtiquetas={mostrarEtiquetas}
          />
        </Suspense>
      ) : modoActivo === "cesium" ? (
        <div
          style={{
            height: alto,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                Este proyecto todavía no tiene ubicación GPS.
                <br />
                <Text type="secondary">
                  Cargá el centro del plano y su ancho en metros (Configuración → Mapa del proyecto)
                  para visualizarlo en 3D.
                </Text>
              </span>
            }
          />
        </div>
      ) : modoActivo === "satelite" && !limites ? (
        <div
          style={{
            height: alto,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                Este proyecto todavía no tiene ubicación GPS.
                <br />
                <Text type="secondary">
                  Cargá el centro del plano y su ancho en metros (Configuración → Mapa del proyecto)
                  para ver el terreno real.
                </Text>
              </span>
            }
          />
        </div>
      ) : (
        <PlanoInteractivo
          imagenUrl={imagenUrl}
          lotes={lotes}
          onLoteClick={onLoteClick}
          resaltados={resaltados}
          dibujo={dibujo}
          mostrarPrecio={mostrarPrecio}
          onImagenError={onImagenError}
          alturaMaxima={alto}
          capaBase={
            modoActivo === "satelite" && limites ? (
              <CapaSatelite limites={limites} mostrarEtiquetas={mostrarEtiquetas} />
            ) : undefined
          }
          mostrarImagen={modoActivo !== "satelite"}
        />
      )}
    </div>
  );
}
