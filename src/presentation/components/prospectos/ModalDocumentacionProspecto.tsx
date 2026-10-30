import { useMemo, useState } from "react";
import { Button, List, Modal, Space, Tag, Typography } from "antd";
import {
  CheckCircleOutlined,
  EyeOutlined,
  FileProtectOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import type { DocumentoProspecto } from "@/domain/portalProspecto/entities";
import { DOCUMENTOS_REQUERIDOS } from "@/domain/portalProspecto/entities";
import type { Prospecto } from "@/domain/prospecto/entities/Prospecto";
import { ModalRevisionProspecto } from "./ModalRevisionProspecto";

const { Text } = Typography;

const ESTADO: Record<string, { color: string; label: string }> = {
  pendiente: { color: "blue", label: "En revisión" },
  aprobado: { color: "green", label: "Aprobado" },
  rechazado: { color: "red", label: "Rechazado" },
};

export function ModalDocumentacionProspecto({
  prospecto,
  documentos,
  open,
  onClose,
}: {
  prospecto: Prospecto | null;
  documentos: DocumentoProspecto[];
  open: boolean;
  onClose: () => void;
}) {
  const [documentoRevision, setDocumentoRevision] = useState<DocumentoProspecto | null>(null);

  const documentosDelProspecto = useMemo(() => {
    if (!prospecto) return [];
    return documentos.filter((documento) => documento.id_prospecto === prospecto.id_prospecto);
  }, [documentos, prospecto]);

  const checklist = DOCUMENTOS_REQUERIDOS.map((requerido) => ({
    ...requerido,
    documento: documentosDelProspecto.find((documento) => documento.tipo === requerido.tipo) ?? null,
  }));
  const enviados = checklist.filter((item) => item.documento).length;
  const pendientes = checklist.filter((item) => item.documento?.estado === "pendiente").length;

  const cerrar = () => {
    setDocumentoRevision(null);
    onClose();
  };

  return (
    <>
      <Modal
        title={
          <Space>
            <FileProtectOutlined />
            <span>Documentación de {prospecto?.nombres ?? "prospecto"}</span>
          </Space>
        }
        open={open}
        onCancel={cerrar}
        footer={<Button onClick={cerrar}>Cerrar</Button>}
        width={640}
        destroyOnHidden
      >
        {prospecto && (
          <>
            <Text type="secondary">
              {enviados} de {DOCUMENTOS_REQUERIDOS.length} documentos enviados
              {pendientes > 0 ? ` · ${pendientes} por revisar` : ""}
            </Text>
            <List
              style={{ marginTop: 12 }}
              dataSource={checklist}
              renderItem={(item) => {
                const documento = item.documento;
                const estado = documento ? ESTADO[documento.estado] : null;
                return (
                  <List.Item
                    actions={[
                      <Button
                        key="review"
                        size="small"
                        icon={<EyeOutlined />}
                        disabled={!documento}
                        onClick={() => documento && setDocumentoRevision(documento)}
                      >
                        {documento ? "Revisar" : "No enviado"}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        documento ? (
                          <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18 }} />
                        ) : (
                          <MinusCircleOutlined style={{ color: "#bfbfbf", fontSize: 18 }} />
                        )
                      }
                      title={
                        <Space wrap>
                          <span>{item.nombre}</span>
                          {estado ? (
                            <Tag color={estado.color}>{estado.label}</Tag>
                          ) : (
                            <Tag>Sin enviar</Tag>
                          )}
                        </Space>
                      }
                      description={
                        documento
                          ? documento.archivo_nombre ?? "Archivo enviado"
                          : item.descripcion
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </>
        )}
      </Modal>

      <ModalRevisionProspecto
        open={!!documentoRevision}
        documento={documentoRevision}
        onClose={() => setDocumentoRevision(null)}
      />
    </>
  );
}
