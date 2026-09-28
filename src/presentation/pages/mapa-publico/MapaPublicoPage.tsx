import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Empty, Result, Spin, Typography } from "antd";
import { EnvironmentOutlined } from "@ant-design/icons";
import { useMapaPublico } from "@/presentation/hooks";
import { LeyendaPlano, PlanoInteractivo } from "@/presentation/components/maps/PlanoInteractivo";

const { Title, Text } = Typography;

/**
 * Mapa de disponibilidad público (`/mapa/:slug`): se comparte con clientes
 * y no requiere sesión. Solo muestra estado, manzana y número de cada lote.
 */
export function MapaPublicoPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: mapa, isLoading, isError } = useMapaPublico(slug);
  const [imagenFallida, setImagenFallida] = useState(false);

  useEffect(() => {
    document.title = mapa ? `${mapa.proyecto} - Mapa de disponibilidad` : "Mapa de disponibilidad";
  }, [mapa]);

  let contenido: React.ReactNode;
  if (isLoading) {
    contenido = (
      <div style={{ display: "flex", justifyContent: "center", padding: 120 }}>
        <Spin size="large" />
      </div>
    );
  } else if (isError) {
    contenido = (
      <Result status="warning" title="No se pudo cargar el mapa" subTitle="Intente de nuevo en unos minutos." />
    );
  } else if (!mapa) {
    contenido = (
      <Result status="404" title="Mapa no encontrado" subTitle="El enlace no existe o ya no está publicado." />
    );
  } else if (!mapa.url_publica || imagenFallida) {
    contenido = <Empty style={{ padding: 120 }} description="Este proyecto todavía no tiene plano" />;
  } else {
    contenido = (
      <>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 16px" }}>
          <LeyendaPlano lotes={mapa.lotes} />
        </div>
        <PlanoInteractivo
          imagenUrl={mapa.url_publica}
          lotes={mapa.lotes}
          onImagenError={() => setImagenFallida(true)}
          alturaMaxima={Math.max(360, window.innerHeight - 190)}
        />
      </>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fafafa" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #f0f0f0", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#e6f4ff",
              color: "#1677ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            <EnvironmentOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <Title level={4} style={{ margin: 0 }} ellipsis>
              {mapa?.proyecto ?? "Mapa de disponibilidad"}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Mapa de disponibilidad
            </Text>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>{contenido}</main>

      <footer style={{ borderTop: "1px solid #f0f0f0", background: "#fff", padding: "10px 16px", textAlign: "center" }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Powered by <strong>Lotes al Mando</strong> · Sistema de gestión de lotes
        </Text>
      </footer>
    </div>
  );
}
