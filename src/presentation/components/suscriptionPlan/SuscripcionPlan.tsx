import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Image,
  Progress,
  Row,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { MailOutlined } from "@ant-design/icons";
import type { PlanDto } from "@/application/plan/dto/PlanDto";
import {
  useEtapas,
  useLotes,
  useManzanas,
  usePlanDeEmpresa,
  useProyectos,
  useUsuarios,
} from "@/presentation/hooks";
import { useEmpresa } from "@/presentation/providers";
import { usePlanes } from "@/presentation/hooks/usePlanes";
import { useSeleccionarPlan } from "@/presentation/hooks/useSeleccionarPlan";
import { iconoDePlan, limitesDePlan, precioFormateado } from "@/presentation/pages/auth/planInfo";
import { PLANES_FALLBACK } from "@/presentation/pages/auth/planesPago";

const { Text, Title } = Typography;

interface LimiteUsoProps {
  titulo: string;
  usados: number;
  limite: number | null;
  detalle?: string;
}

function LimiteUso({ titulo, usados, limite, detalle }: LimiteUsoProps) {
  const porcentaje =
    limite === null
      ? null
      : limite === 0
        ? usados === 0
          ? 0
          : 100
        : Math.round((usados / limite) * 100);

  return (
    <div>
      <Text strong>{titulo}</Text>
      {detalle && (
        <div>
          <Text type="secondary">{detalle}</Text>
        </div>
      )}
      {limite === null ? (
        <div>
          <Text>{usados} usados · Sin límite</Text>
        </div>
      ) : (
        <>
          <Progress
            percent={Math.min(porcentaje ?? 0, 100)}
            format={() => `${porcentaje}%`}
            status={porcentaje !== null && porcentaje >= 100 ? "exception" : "normal"}
          />
          <Text type="secondary">
            {usados} de {limite}
          </Text>
        </>
      )}
    </div>
  );
}

export function SuscripcionPlan() {
  const { empresaActual } = useEmpresa();
  const plan = usePlanDeEmpresa();
  const { data: catalogoPlanes, isLoading: cargandoPlanes, isError: errorPlanes } = usePlanes();
  const { data: proyectos, isLoading: cargandoProyectos, isError: errorProyectos } = useProyectos();
  const { data: usuarios, isLoading: cargandoUsuarios, isError: errorUsuarios } = useUsuarios();
  const { data: lotes, isLoading: cargandoLotes, isError: errorLotes } = useLotes();
  const { data: manzanas, isLoading: cargandoManzanas, isError: errorManzanas } = useManzanas();
  const { data: etapas, isLoading: cargandoEtapas, isError: errorEtapas } = useEtapas();
  const seleccionarPlan = useSeleccionarPlan();
  const [planAbierto, setPlanAbierto] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const planExiste =
    !plan.clave ||
    !catalogoPlanes ||
    catalogoPlanes.some((item) => item.clave === plan.clave && item.activo);
  const nombrePlan = plan.nombre ?? plan.clave ?? "Sin plan asignado";
  const planesActivos = (catalogoPlanes ?? []).filter((item) => item.activo && !item.es_unico);
  const planesParaMostrar = planesActivos.length > 0 ? planesActivos : PLANES_FALLBACK;
  const cargando =
    cargandoPlanes ||
    cargandoProyectos ||
    cargandoUsuarios ||
    cargandoLotes ||
    cargandoManzanas ||
    cargandoEtapas;
  const hayError =
    errorPlanes || errorProyectos || errorUsuarios || errorLotes || errorManzanas || errorEtapas;

  const proyectoPorEtapa = new Map(
    (etapas ?? []).map((etapa) => [etapa.id_etapa, etapa.id_proyecto]),
  );
  const proyectoPorManzana = new Map(
    (manzanas ?? []).map((manzana) => [manzana.id_manzana, proyectoPorEtapa.get(manzana.id_etapa)]),
  );
  const lotesPorProyecto = new Map<number, number>();

  for (const lote of lotes ?? []) {
    const proyectoId = proyectoPorManzana.get(lote.id_manzana);
    if (proyectoId !== undefined) {
      lotesPorProyecto.set(proyectoId, (lotesPorProyecto.get(proyectoId) ?? 0) + 1);
    }
  }

  const proyectoConMasLotes = [...lotesPorProyecto.entries()].sort((a, b) => b[1] - a[1])[0];
  const nombreProyectoConMasLotes = proyectos?.find(
    (proyecto) => proyecto.id_proyecto === proyectoConMasLotes?.[0],
  )?.nombre;

  const elegirPlan = async (planElegido: PlanDto) => {
    if (!empresaActual?.id_empresa) {
      messageApi.error("No se pudo determinar la empresa actual.");
      return;
    }

    setPlanAbierto(planElegido.clave);
    const ventanaCheckout = planElegido.url_checkout ? window.open("", "_blank") : null;
    if (ventanaCheckout) ventanaCheckout.opener = null;

    try {
      await seleccionarPlan.mutateAsync({
        idEmpresa: empresaActual.id_empresa,
        plan: planElegido.clave,
      });
      messageApi.success(`Seleccionaste el plan ${planElegido.nombre}.`);

      if (!planElegido.url_checkout) {
        messageApi.warning(
          "Este plan aún no tiene un enlace de pago configurado. Contacta al administrador para activarlo.",
        );
        return;
      }

      if (ventanaCheckout) {
        ventanaCheckout.location.href = planElegido.url_checkout;
      } else {
        messageApi.info("Abriendo el pago en esta pestaña.");
        window.location.assign(planElegido.url_checkout);
      }
    } catch (error) {
      ventanaCheckout?.close();
      messageApi.error(
        error instanceof Error ? error.message : "No se pudo guardar el plan seleccionado.",
      );
    } finally {
      setPlanAbierto(null);
    }
  };

  return (
    <>
      {contextHolder}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 20 }}>
          <Text type="secondary">Plan actual</Text>
          <Title level={4} style={{ margin: "4px 0 0" }}>
            {nombrePlan}
          </Title>
        </div>

        {cargando ? (
          <Spin />
        ) : hayError ? (
          <Alert
            type="error"
            showIcon
            message="No se pudo cargar el uso de los límites del plan."
          />
        ) : !planExiste ? (
          <Alert
            type="warning"
            showIcon
            message="No se encontró la información del plan asignado."
          />
        ) : !plan.clave ? (
          <Text type="secondary">No hay un plan asignado a esta empresa.</Text>
        ) : (
          <Row gutter={[24, 20]}>
            <Col xs={24} md={8}>
              <LimiteUso
                titulo="Proyectos"
                usados={proyectos?.length ?? 0}
                limite={plan.max_proyectos}
              />
            </Col>
            <Col xs={24} md={8}>
              <LimiteUso
                titulo="Usuarios"
                usados={usuarios?.length ?? 0}
                limite={plan.max_usuarios}
              />
            </Col>
            <Col xs={24} md={8}>
              <LimiteUso
                titulo="Lotes por proyecto"
                usados={proyectoConMasLotes?.[1] ?? 0}
                limite={plan.max_lotes_por_proyecto}
                detalle={
                  nombreProyectoConMasLotes
                    ? `Mayor uso: ${nombreProyectoConMasLotes}`
                    : "Mayor uso entre los proyectos"
                }
              />
            </Col>
          </Row>
        )}
      </Card>

      <div style={{ marginBottom: 16 }}>
        <Title level={4}>Cambiar de plan</Title>
        <Text type="secondary">
          Al elegir otro plan se guardará como el plan de tu empresa y se abrirá su enlace de pago.
        </Text>
      </div>

      <Alert
        type="info"
        showIcon
        icon={<MailOutlined />}
        message="Paga con el mismo correo de tu cuenta"
        description="Usa en Hotmart el correo asociado a esta empresa para que podamos vincular el pago correctamente."
        style={{ marginBottom: 16 }}
      />

      {cargandoPlanes ? (
        <Card style={{ textAlign: "center" }}>
          <Spin />
        </Card>
      ) : errorPlanes ? (
        <Alert type="error" showIcon message="No se pudieron cargar los planes disponibles." />
      ) : (
        <Row gutter={[16, 16]}>
          {planesParaMostrar.map((planOpcion) => {
            const seleccionado = plan.clave === planOpcion.clave;
            const limites = limitesDePlan(planOpcion);
            return (
              <Col xs={24} md={12} xl={8} key={planOpcion.clave}>
                <Card
                  style={{
                    height: "100%",
                    borderColor: seleccionado ? "#10B981" : undefined,
                    boxShadow: seleccionado ? "0 6px 20px rgba(16,185,129,0.18)" : undefined,
                  }}
                  styles={{ body: { display: "flex", flexDirection: "column", height: "100%" } }}
                >
                  <div style={{ textAlign: "center", minHeight: 56, marginBottom: 8 }}>
                    {planOpcion.imagen_url ? (
                      <Image
                        src={planOpcion.imagen_url}
                        alt={planOpcion.nombre}
                        preview={false}
                        style={{ maxHeight: 56, maxWidth: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ fontSize: 32, color: "#10B981" }}>
                        {iconoDePlan(planOpcion.clave)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "center", marginBottom: 12 }}>
                    <Title level={5} style={{ marginBottom: 4 }}>
                      {planOpcion.nombre}
                    </Title>
                    {planOpcion.descripcion && (
                      <Text type="secondary">{planOpcion.descripcion}</Text>
                    )}
                  </div>
                  {planOpcion.precio != null && (
                    <div style={{ textAlign: "center", marginBottom: 12 }}>
                      <Title level={3} style={{ margin: 0 }}>
                        {precioFormateado(planOpcion.precio)}
                      </Title>
                      <Text type="secondary">por mes</Text>
                    </div>
                  )}
                  {limites.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {limites.map((limite) => (
                        <Text key={limite.texto}>
                          {limite.icono} {limite.texto}
                        </Text>
                      ))}
                    </div>
                  )}
                  <div style={{ flex: 1 }} />
                  {seleccionado && (
                    <div style={{ textAlign: "center", marginTop: 12 }}>
                      <Tag color="success">Plan actual</Tag>
                    </div>
                  )}
                  <Button
                    type="primary"
                    block
                    style={{ marginTop: 12 }}
                    loading={seleccionarPlan.isPending && planAbierto === planOpcion.clave}
                    disabled={seleccionarPlan.isPending}
                    onClick={() => void elegirPlan(planOpcion)}
                  >
                    {seleccionado ? "Continuar al pago" : `Elegir ${planOpcion.nombre}`}
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </>
  );
}
