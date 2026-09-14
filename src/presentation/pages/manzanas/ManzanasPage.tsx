import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function ManzanasPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Manzanas</Title>
      <Card>
        <Paragraph type="secondary">
          Modulo de manzanas - Gestion de manzanas por etapa.
        </Paragraph>
      </Card>
    </div>
  );
}
