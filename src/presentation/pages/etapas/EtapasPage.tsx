import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function EtapasPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Etapas</Title>
      <Card>
        <Paragraph type="secondary">
          Modulo de etapas - Gestion de etapas por proyecto.
        </Paragraph>
      </Card>
    </div>
  );
}
