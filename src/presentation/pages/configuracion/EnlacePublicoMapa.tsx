import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Input, Space, Tag, Typography, message } from "antd";
import { CopyOutlined, ExportOutlined, GlobalOutlined } from "@ant-design/icons";
import type { Mapa } from "@/domain/mapa/entities";
import { getContainer } from "@/infrastructure/container";
import { normalizarSlug } from "@/application/mapas/use-cases/PublicarMapaUseCase";

const { Text } = Typography;

interface EnlacePublicoMapaProps {
  proyectoId: number;
  proyectoNombre: string;
  mapa: Mapa;
}

/**
 * Publica el plano del proyecto en `/mapa/:slug` para compartirlo con
 * clientes sin que inicien sesión (como un mapa de disponibilidad).
 */
export function EnlacePublicoMapa({ proyectoId, proyectoNombre, mapa }: EnlacePublicoMapaProps) {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [borrador, setBorrador] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const slug = borrador ?? mapa.slug ?? normalizarSlug(proyectoNombre);
  const url = mapa.slug ? `${window.location.origin}/mapa/${mapa.slug}` : null;

  const guardar = async (valor: string | null) => {
    try {
      setGuardando(true);
      await getContainer().publicarMapa.execute(proyectoId, valor);
      await queryClient.invalidateQueries({ queryKey: ["mapa"] });
      setBorrador(null);
      messageApi.success(valor ? "Mapa publicado" : "Mapa despublicado");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo guardar el enlace");
    } finally {
      setGuardando(false);
    }
  };

  const copiar = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      messageApi.success("Enlace copiado");
    } catch {
      messageApi.error("No se pudo copiar el enlace");
    }
  };

  return (
    <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "#fafafa", border: "1px solid #f0f0f0" }}>
      {contextHolder}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <GlobalOutlined />
        <Text strong>Mapa público de disponibilidad</Text>
        {mapa.slug ? <Tag color="green">Publicado</Tag> : <Tag>No publicado</Tag>}
      </div>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
        Cualquiera con el enlace ve el plano con el estado de cada lote (sin precios ni clientes).
      </Text>

      <Space.Compact style={{ width: "100%" }}>
        <Input
          addonBefore={`${window.location.host}/mapa/`}
          value={slug}
          onChange={(e) => setBorrador(e.target.value)}
          onBlur={() => setBorrador(normalizarSlug(slug))}
          disabled={guardando}
        />
        <Button
          type="primary"
          loading={guardando}
          disabled={!slug || slug === mapa.slug}
          onClick={() => guardar(slug)}
        >
          {mapa.slug ? "Cambiar" : "Publicar"}
        </Button>
      </Space.Compact>

      {url && (
        <Space wrap style={{ marginTop: 8 }}>
          <Button size="small" icon={<CopyOutlined />} onClick={copiar}>
            Copiar enlace
          </Button>
          <Button size="small" icon={<ExportOutlined />} href={url} target="_blank">
            Abrir
          </Button>
          <Button size="small" danger disabled={guardando} onClick={() => guardar(null)}>
            Despublicar
          </Button>
        </Space>
      )}
    </div>
  );
}
