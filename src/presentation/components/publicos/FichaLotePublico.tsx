import { Alert, Button, Descriptions, Modal, Tag, Typography } from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CalculatorOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import type { PlanoLote } from "@/domain/mapa/entities";
import { ESTILO_ESTADO_PLANO, etiquetaLote } from "@/presentation/components/maps/PlanoInteractivo";
import { formatCurrency } from "@/utils";

const { Text } = Typography;

interface FichaLotePublicoProps {
  /** Lote abierto desde la pestaña Mapa, o `null` si no hay ficha abierta. */
  lote: PlanoLote | null;
  moneda: string;
  onCerrar: () => void;
  onAnterior: () => void;
  onSiguiente: () => void;
  /** Cambia a la pestaña Financiamiento con este lote prellenado. */
  onSimular: (lote: PlanoLote) => void;
}

/**
 * Ficha de un lote en el mapa público: los mismos datos que se ven al hacer
 * clic en Lotes/Mapas (número, manzana, estado y precio de lista), sin
 * acciones comerciales. El precio se revela recién acá y en la calculadora.
 */
export function FichaLotePublico({
  lote,
  moneda,
  onCerrar,
  onAnterior,
  onSiguiente,
  onSimular,
}: FichaLotePublicoProps) {
  const estilo = lote
    ? (ESTILO_ESTADO_PLANO[lote.estado] ?? ESTILO_ESTADO_PLANO.disponible)
    : ESTILO_ESTADO_PLANO.disponible;

  const money = (valor: number) => {
    try {
      return formatCurrency(valor, moneda || "USD");
    } catch {
      return formatCurrency(valor, "USD");
    }
  };

  return (
    <Modal open={!!lote} onCancel={onCerrar} footer={null} width={480} centered>
      {lote && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${estilo.color}22`,
                border: `2px solid ${estilo.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HomeOutlined style={{ color: estilo.color, fontSize: 22 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Lote {lote.numero_lote}</div>
              <Tag color={estilo.color} style={{ margin: 0 }}>
                {estilo.label}
              </Tag>
            </div>
          </div>

          <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
            <Descriptions.Item label="Manzana">{etiquetaLote(lote)}</Descriptions.Item>
            <Descriptions.Item label="Número">{lote.numero_lote}</Descriptions.Item>
            <Descriptions.Item label="Precio de lista" span={2}>
              {lote.precio_lista != null ? (
                <span style={{ fontWeight: 700, fontSize: 18, color: "#1677ff" }}>
                  {money(lote.precio_lista)}
                </span>
              ) : (
                <Text type="secondary">Sin precio publicado</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Estado" span={2}>
              <Tag color={estilo.color}>{estilo.label}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Información orientativa"
            description="Estado y precio según la última actualización del proyecto; no es una garantía en tiempo real ni una oferta de compra."
          />

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={onAnterior} style={{ flex: 1 }}>
              Anterior
            </Button>
            <Button icon={<ArrowRightOutlined />} onClick={onSiguiente} style={{ flex: 1 }}>
              Siguiente
            </Button>
          </div>

          <Button
            type="primary"
            block
            size="large"
            icon={<CalculatorOutlined />}
            onClick={() => onSimular(lote)}
          >
            Simular financiamiento de {etiquetaLote(lote)}
          </Button>
        </div>
      )}
    </Modal>
  );
}
