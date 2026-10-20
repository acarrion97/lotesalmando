import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Form, InputNumber, Space, Tag, Typography, message } from "antd";
import { EnvironmentOutlined, SaveOutlined } from "@ant-design/icons";
import type { Mapa } from "@/domain/mapa/entities";
import { ubicacionDe } from "@/domain/mapa/entities";
import { getContainer } from "@/infrastructure/container";

const { Text } = Typography;

interface UbicacionMapaFormProps {
  proyectoId: number;
  mapa: Mapa;
}

/**
 * Ubicación GPS y escala real del plano: es lo que permite superponer la
 * imagen sobre el terreno satelital (y sobre la vista 3D) en su lugar
 * exacto. La altura no se carga: se deduce de la proporción de la imagen.
 */
export function UbicacionMapaForm({ proyectoId, mapa }: UbicacionMapaFormProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [guardando, setGuardando] = useState(false);

  const ubicacion = ubicacionDe(mapa);

  const guardar = async (values: {
    centro_lat?: number | null;
    centro_lng?: number | null;
    ancho_m?: number | null;
  }) => {
    const { centro_lat, centro_lng, ancho_m } = values;
    if (centro_lat == null || centro_lng == null || ancho_m == null) {
      messageApi.error("Completá latitud, longitud y ancho del plano");
      return;
    }
    try {
      setGuardando(true);
      await getContainer().definirUbicacionMapa.execute(proyectoId, {
        centro_lat,
        centro_lng,
        ancho_m,
      });
      await queryClient.invalidateQueries({ queryKey: ["mapa"] });
      messageApi.success("Ubicación guardada: la vista satélite ya está disponible");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo guardar la ubicación");
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    try {
      setGuardando(true);
      await getContainer().definirUbicacionMapa.execute(proyectoId, null);
      await queryClient.invalidateQueries({ queryKey: ["mapa"] });
      messageApi.success("Ubicación eliminada");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo quitar la ubicación");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 10,
        background: "#fafafa",
        border: "1px solid #f0f0f0",
      }}
    >
      {contextHolder}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <EnvironmentOutlined />
        <Text strong>Ubicación del plano sobre el terreno</Text>
        {ubicacion ? <Tag color="blue">Satélite y 3D activos</Tag> : <Tag>Sin ubicación</Tag>}
      </div>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>
        Centro de la imagen en WGS84 y ancho real en metros. Con eso el mapa ubica el plano sobre
        la foto satelital y dibuja cada lote en su lugar exacto. La altura se calcula sola a partir
        de la proporción de la imagen.
      </Text>

      <Form
        layout="vertical"
        size="small"
        onFinish={guardar}
        initialValues={{
          centro_lat: ubicacion?.centro_lat,
          centro_lng: ubicacion?.centro_lng,
          ancho_m: ubicacion?.ancho_m,
        }}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Space wrap align="start" size={8}>
            <Form.Item
              name="centro_lat"
              label="Latitud"
              rules={[
                { required: true, message: "Obligatoria" },
                { type: "number", min: -90, max: 90, message: "Entre -90 y 90" },
              ]}
              style={{ marginBottom: 0, width: 150 }}
            >
              <InputNumber<number> style={{ width: "100%" }} step={0.00001} placeholder="-0.95000" />
            </Form.Item>
            <Form.Item
              name="centro_lng"
              label="Longitud"
              rules={[
                { required: true, message: "Obligatoria" },
                { type: "number", min: -180, max: 180, message: "Entre -180 y 180" },
              ]}
              style={{ marginBottom: 0, width: 150 }}
            >
              <InputNumber<number> style={{ width: "100%" }} step={0.00001} placeholder="-78.50000" />
            </Form.Item>
            <Form.Item
              name="ancho_m"
              label="Ancho real (m)"
              rules={[
                { required: true, message: "Obligatorio" },
                { type: "number", min: 1, max: 100000, message: "Entre 1 y 100.000 metros" },
              ]}
              style={{ marginBottom: 0, width: 150 }}
            >
              <InputNumber<number> style={{ width: "100%" }} step={10} placeholder="240" />
            </Form.Item>
          </Space>

          <Space wrap>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={guardando}>
              Guardar ubicación
            </Button>
            {ubicacion && (
              <Button danger disabled={guardando} onClick={quitar}>
                Quitar ubicación
              </Button>
            )}
          </Space>
        </Space>
      </Form>

      <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 8 }}>
        Cómo obtenerlo: en Google Maps, clic derecho sobre el centro del plano → “¿Qué hay aquí?”
        para lat/lng, y “Medir distancia” sobre un borde para el ancho en metros.
      </Text>
    </div>
  );
}
