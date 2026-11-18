import { useMemo, useState } from "react";
import { Alert, Col, Descriptions, Form, Input, InputNumber, Modal, Radio, Row, Select, message } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useProspectos, useOportunidades, useAsesorDeSesion } from "@/presentation/hooks";
import { useAuth, useEmpresa } from "@/presentation/providers";
import { getContainer } from "@/infrastructure/container";
import type { Lote } from "@/domain/lote/entities/Lote";
import type { Prospecto } from "@/domain/prospecto/entities/Prospecto";
import { formatCurrency } from "@/utils";

type Modo = "existente" | "nuevo";

interface AsignarProspectoModalProps {
  open: boolean;
  lote: Lote | null;
  manzanaNombre?: string;
  onClose: () => void;
  /** Se llama después de asignar, para que la página cierre y refresque. */
  onAssigned?: (prospecto: Prospecto) => void;
}

/**
 * Asigna a un lote ya reservado un prospecto en etapa Reserva.
 *
 * El caso típico es un lote que quedó reservado sin prospecto (o cuyo
 * prospecto se perdió): la tabla de Reservas ofrece "Asignar prospecto" en
 * lugar de "Realizar venta". Desde acá se elige un prospecto existente o se
 * crea uno nuevo, y se capturan los datos del cliente que después usa la venta.
 */
export function AsignarProspectoModal({
  open,
  lote,
  manzanaNombre,
  onClose,
  onAssigned,
}: AsignarProspectoModalProps) {
  const { data: prospectos, isLoading: loadingProspectos } = useProspectos();
  const { data: oportunidades } = useOportunidades();
  const { idAsesor } = useAsesorDeSesion();
  const { empresaActual } = useEmpresa();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const container = getContainer();
  const [form] = Form.useForm();
  const [modo, setModo] = useState<Modo>("existente");
  const [guardando, setGuardando] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // Un prospecto en etapa Reserva ya está ligado a otro lote. Los perdidos se
  // dejan afuera para no revivir una reserva descartada por accidente.
  const disponibles = useMemo(() => {
    const enReserva = new Set(
      (oportunidades ?? [])
        .filter((oportunidad) => oportunidad.etapa === "reserva")
        .map((oportunidad) => oportunidad.id_prospecto),
    );
    return (prospectos ?? []).filter(
      (prospecto) =>
        prospecto.estado !== "reserva" &&
        prospecto.estado !== "perdido" &&
        !enReserva.has(prospecto.id_prospecto),
    );
  }, [prospectos, oportunidades]);

  const sinProspectos = !loadingProspectos && disponibles.length === 0;
  const modoActivo: Modo = sinProspectos ? "nuevo" : modo;

  const cambiarModo = (nuevoModo: Modo) => {
    setModo(nuevoModo);
    // Al cambiar de modo se limpian los datos del cliente: no queremos reservar
    // a una persona con el nombre de la otra.
    form.resetFields(["id_prospecto", "nombres", "cedula_ruc", "email", "telefono", "origen", "notas", "entrada"]);
    if (nuevoModo === "nuevo") form.setFieldsValue({ origen: "directo" });
  };

  const elegirProspecto = (idProspecto: number) => {
    const prospecto = disponibles.find((p) => p.id_prospecto === idProspecto);
    if (!prospecto) return;
    form.setFieldsValue({
      nombres: prospecto.nombres ?? "",
      email: prospecto.email ?? "",
      telefono: prospecto.telefono ?? "",
      cedula_ruc: "",
    });
  };

  const cerrar = () => {
    if (guardando) return;
    form.resetFields();
    setModo("existente");
    onClose();
  };

  const confirmar = async () => {
    if (!lote) return;
    if (!empresaActual?.id_empresa) {
      messageApi.error("No se pudo determinar la empresa actual");
      return;
    }
    if (!user?.id_usuario) {
      messageApi.error("No se pudo identificar el usuario actual");
      return;
    }

    let values: {
      id_prospecto?: number;
      nombres: string;
      cedula_ruc?: string;
      email?: string;
      telefono?: string;
      origen?: string;
      notas?: string;
      entrada: number;
    };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    setGuardando(true);
    try {
      const resultado = await container.asignarProspectoReserva.execute({
        idEmpresa: empresaActual.id_empresa,
        idLote: lote.id_lote,
        usuarioId: user.id_usuario,
        idAsesor,
        idProspecto: modoActivo === "existente" ? values.id_prospecto ?? null : null,
        nuevo: modoActivo === "nuevo" ? { origen: values.origen ?? "directo", notas: values.notas } : null,
        cliente: {
          nombres: values.nombres,
          cedula_ruc: values.cedula_ruc ?? "",
          email: values.email ?? "",
          telefono: values.telefono?.trim() ? values.telefono : null,
        },
        // La seña solo se pide al crear el prospecto, igual que en Prospectos.
        entrada: { monto: values.entrada },
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lotes"] }),
        queryClient.invalidateQueries({ queryKey: ["prospectos"] }),
        queryClient.invalidateQueries({ queryKey: ["oportunidades"] }),
        queryClient.invalidateQueries({ queryKey: ["entradasReserva"] }),
      ]);
      messageApi.success(
        `${resultado.prospecto.nombres} quedó asignado al lote ${lote.numero_lote} en etapa Reserva`,
      );
      form.resetFields();
      setModo("existente");
      onAssigned?.(resultado.prospecto);
      onClose();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "No se pudo asignar el prospecto a la reserva",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={`Asignar prospecto${lote ? ` · Lote ${lote.numero_lote}` : ""}`}
        open={open}
        onCancel={cerrar}
        onOk={confirmar}
        okText="Asignar a la reserva"
        cancelText="Cancelar"
        okButtonProps={{ icon: <UserAddOutlined /> }}
        confirmLoading={guardando}
        width={560}
        destroyOnHidden
      >
        {lote && (
          <div style={{ marginTop: 12 }}>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Lote">{lote.numero_lote}</Descriptions.Item>
              <Descriptions.Item label="Manzana">
                {manzanaNombre ?? `Manzana ${lote.id_manzana}`}
              </Descriptions.Item>
              <Descriptions.Item label="Precio lista" span={2}>
                {formatCurrency(lote.precio_lista)}
              </Descriptions.Item>
            </Descriptions>

            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="El prospecto pasará a la etapa Reserva"
              description="Los datos del cliente se guardan con la reserva y se usan después para realizar la venta."
            />

            <Form form={form} layout="vertical">
              <Form.Item label="Prospecto">
                <Radio.Group
                  value={modoActivo}
                  onChange={(event) => cambiarModo(event.target.value as Modo)}
                  optionType="button"
                  buttonStyle="solid"
                  style={{ marginBottom: 8 }}
                >
                  <Radio.Button value="existente" disabled={sinProspectos}>
                    Elegir existente
                  </Radio.Button>
                  <Radio.Button value="nuevo">Crear nuevo</Radio.Button>
                </Radio.Group>
              </Form.Item>

              {modoActivo === "existente" ? (
                <Form.Item
                  name="id_prospecto"
                  label="Prospecto"
                  rules={[{ required: true, message: "Seleccione el prospecto" }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Buscar prospecto por nombre o email"
                    loading={loadingProspectos}
                    onChange={elegirProspecto}
                    options={disponibles.map((prospecto) => ({
                      value: prospecto.id_prospecto,
                      label: `${prospecto.nombres}${prospecto.email ? ` · ${prospecto.email}` : ""}`,
                    }))}
                    notFoundContent={
                      loadingProspectos
                        ? "Cargando prospectos..."
                        : "No hay prospectos disponibles; cree uno nuevo"
                    }
                  />
                </Form.Item>
              ) : (
                <Row gutter={12}>
                  <Col span={10}>
                    <Form.Item
                      name="origen"
                      label="Origen"
                      initialValue="directo"
                      rules={[{ required: true, message: "Seleccione el origen" }]}
                    >
                      <Select
                        options={[
                          { value: "directo", label: "Directo" },
                          { value: "referido", label: "Referido" },
                          { value: "web", label: "Web" },
                          { value: "publicidad", label: "Publicidad" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={14}>
                    <Form.Item name="notas" label="Notas">
                      <Input placeholder="Opcional" maxLength={1000} />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              <Form.Item
                name="nombres"
                label="Nombre del cliente"
                rules={[
                  { required: true, message: "Ingrese el nombre del cliente" },
                  { min: 2, message: "Mínimo 2 caracteres" },
                  { max: 200, message: "Máximo 200 caracteres" },
                ]}
              >
                <Input placeholder="Nombre completo" />
              </Form.Item>
              <Form.Item
                name="cedula_ruc"
                label="Cédula / RUC"
                rules={[{ min: 5, message: "Mínimo 5 caracteres" }]}
                extra="Opcional; se puede completar antes de vender."
              >
                <Input placeholder="1712345678" maxLength={20} />
              </Form.Item>
              <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email inválido" }]}>
                <Input placeholder="email@ejemplo.com" />
              </Form.Item>
              <Form.Item name="telefono" label="Teléfono" rules={[{ max: 50, message: "Máximo 50 caracteres" }]}>
                <Input placeholder="0991234567" />
              </Form.Item>
                <Form.Item
                  name="entrada"
                  label="Entrada obligatoria"
                  rules={[{ required: true, message: "Ingrese la entrada" }, { type: "number", min: 0.01, message: "La entrada debe ser mayor que 0" }]}
                  extra={`Entrada obligatoria. Máximo ${formatCurrency(
                    Math.max(0, (lote.precio_lista ?? 0) - 1),
                  )}.`}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0.01}
                    max={Math.max(0, (lote.precio_lista ?? 0) - 1)}
                    step={100}
                    placeholder="Ingrese el monto"
                  />
                </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </>
  );
}
