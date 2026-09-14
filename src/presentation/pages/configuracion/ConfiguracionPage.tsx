import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function ConfiguracionPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Configuracion</Title>
      <Card>
        <Paragraph type="secondary">
          Modulo de configuracion - Ajustes generales del sistema.
        </Paragraph>
      </Card>
    </div>
  );
}
