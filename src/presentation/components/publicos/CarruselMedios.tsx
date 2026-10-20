import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Button, Empty, Typography } from "antd";
import { LeftOutlined, PlayCircleOutlined, RightOutlined } from "@ant-design/icons";
import type { MapaPublicoMedio } from "@/domain/mapa/entities";

const { Text } = Typography;

interface CarruselMediosProps {
  medios: MapaPublicoMedio[];
  /** Texto alternativo base para las imágenes. */
  alt?: string;
}

/**
 * Visor de recursos del proyecto al estilo "ficha de producto": un recurso a
 * la vez, flechas anterior/siguiente que envuelven, contador "n de m",
 * miniaturas navegables y teclado (←/→). Los videos usan los controles
 * nativos y no arrancan solos al cambiar de recurso.
 */
export function CarruselMedios({ medios, alt = "Recurso del proyecto" }: CarruselMediosProps) {
  const [indice, setIndice] = useState(0);

  // Si la lista cambia (nueva subida, borrado), el índice queda dentro de rango.
  const total = medios.length;
  const indiceSeguro = total ? ((indice % total) + total) % total : 0;

  const irA = useCallback(
    (delta: number) =>
      setIndice((prev) => (total ? (((prev + delta) % total) + total) % total : 0)),
    [total],
  );

  useEffect(() => {
    if (total < 2) return;
    const onTecla = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const destino = e.target as HTMLElement | null;
      const tag = destino?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || destino?.isContentEditable) {
        return;
      }
      e.preventDefault();
      irA(e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onTecla);
    return () => window.removeEventListener("keydown", onTecla);
  }, [total, irA]);

  if (!total) {
    return (
      <Empty
        style={{ padding: "60px 0" }}
        description="Todavía no hay fotos ni videos de este proyecto"
      />
    );
  }

  const actual = medios[indiceSeguro];
  const hayFlechas = total > 1;

  const estiloFleja: CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: "50%",
    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <div
        style={{
          position: "relative",
          borderRadius: 14,
          overflow: "hidden",
          background: "#111",
          minHeight: 260,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {actual.tipo === "imagen" ? (
          <img
            key={actual.url}
            src={actual.url}
            alt={`${alt} ${indiceSeguro + 1}`}
            style={{ display: "block", width: "100%", maxHeight: "62vh", objectFit: "contain" }}
          />
        ) : (
          <video
            key={actual.url}
            src={actual.url}
            controls
            preload="metadata"
            playsInline
            style={{ display: "block", width: "100%", maxHeight: "62vh", background: "#000" }}
          />
        )}

        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 2,
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            borderRadius: 20,
            padding: "3px 12px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {indiceSeguro + 1} de {total}
        </div>

        {hayFlechas && (
          <>
            <Button
              aria-label="Recurso anterior"
              type="primary"
              shape="circle"
              icon={<LeftOutlined />}
              style={{ ...estiloFleja, left: 14 }}
              onClick={() => irA(-1)}
            />
            <Button
              aria-label="Recurso siguiente"
              type="primary"
              shape="circle"
              icon={<RightOutlined />}
              style={{ ...estiloFleja, right: 14 }}
              onClick={() => irA(1)}
            />
          </>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginTop: 12,
          justifyContent: total <= 6 ? "center" : "flex-start",
        }}
      >
        {medios.map((medio, i) => {
          const activo = i === indiceSeguro;
          return (
            <button
              key={medio.url}
              type="button"
              onClick={() => setIndice(i)}
              aria-label={`Ver recurso ${i + 1}`}
              style={{
                position: "relative",
                width: 92,
                height: 64,
                padding: 0,
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                border: activo ? "3px solid #1677ff" : "2px solid #e5e5e5",
                background: "#000",
                flexShrink: 0,
              }}
            >
              {medio.tipo === "imagen" ? (
                <img
                  src={medio.url}
                  alt={`Miniatura ${i + 1}`}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    background: "linear-gradient(135deg,#333,#111)",
                  }}
                >
                  <PlayCircleOutlined style={{ fontSize: 22 }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {hayFlechas && (
        <Text type="secondary" style={{ display: "block", marginTop: 8, fontSize: 12 }}>
          Usá las flechas del teclado ← → para recorrer los recursos
        </Text>
      )}
    </div>
  );
}
