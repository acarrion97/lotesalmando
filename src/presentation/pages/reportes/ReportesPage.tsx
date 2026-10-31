import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { TableColumnType } from "antd";
import { DownloadOutlined, FilePdfOutlined } from "@ant-design/icons";
import {
  useAsesores,
  useClientes,
  useCobranzas,
  useCotizaciones,
  useEtapas,
  useInfoContratos,
  useLotes,
  useManzanas,
  usePagos,
  useProspectos,
  useProyectos,
  usePuede,
  useVentas,
  useContratos,
  useLogoByEmpresa,
} from "@/presentation/hooks";
import { useEmpresa } from "@/presentation/providers";
import type { Pago } from "@/domain/pago/entities";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import {
  FiltroRangoFechas,
  FILTRO_FECHAS_INICIAL,
  type FiltroFechas,
} from "@/presentation/components/ventas/FiltroRangoFechas";
import { generarReportePdf } from "@/infrastructure/documents/generadorReporteDocumento";
import {
  exportarReporteXlsx,
  type HojaReporte,
  type TipoColumnaReporte,
} from "@/infrastructure/export/exportarReporte";
import {
  aCentavos,
  agruparPagos,
  antiguedadDeSaldos,
  cuotasEnCartera,
  deCentavos,
  desempenoPorAsesor,
  embudoProspectos,
  ESTADOS_LOTE,
  formaPagoPrincipal,
  mesDe,
  mesesDelRango,
  resumenInventario,
  resumirVentas,
  totalPagos,
  ventasPorMes,
  type CuotaEnCartera,
  type FilaAgrupada,
  type FilaAntiguedad,
  type FilaAsesor,
  type FilaInventario,
  type VentasPorMes,
} from "@/application/reportes/calcularReportes";
import {
  descargarArchivo,
  dentroDelRango,
  diaEnEmpresa,
  etiquetaNumeroLote,
  formatCurrency,
  formatDateOnly,
} from "@/utils";

const { Text } = Typography;

const TIPOS_VENTA_COLOR: Record<string, string> = {
  completada: "green",
  pendiente: "orange",
  cancelada: "red",
};
const TIPOS_COBRANZA_COLOR: Record<string, string> = {
  pagada: "green",
  pendiente: "orange",
  vencida: "red",
};
const FORMA_PAGO_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  deposito: "Depósito",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
  otro: "Otro",
  no_especificada: "No especificada",
};

/** Etiqueta legible de la forma de pago de un pago; sin dato => "No especificada". */
const etiquetaFormaPago = (p: { forma_pago?: string }): string =>
  FORMA_PAGO_LABEL[p.forma_pago ?? "no_especificada"] ?? "Otro";

interface ReporteListo {
  base: string;
  titulo: string;
  hojas: HojaReporte[];
}

/** Botones de exportación a Excel y PDF; sólo se muestran con el permiso `exportar_reportes`. */
function BotonesExportar({
  generar,
  contextoPdf,
  disabled,
}: {
  generar: () => ReporteListo;
  /** Empresa, logo y líneas de contexto (período, filtros) que encabezan el PDF. */
  contextoPdf: () => { empresa: string; logoUrl?: string | null; detalle: string[] };
  disabled?: boolean;
}) {
  const puedeExportar = usePuede("exportar_reportes");
  const [cargando, setCargando] = useState<"xlsx" | "pdf" | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  if (!puedeExportar) return null;

  const ejecutar = (formato: "xlsx" | "pdf") => async () => {
    setCargando(formato);
    try {
      const reporte = generar();
      const archivo = `reporte-${reporte.base}-${diaEnEmpresa(new Date())}`;
      if (formato === "xlsx") {
        await exportarReporteXlsx(archivo, reporte.hojas);
      } else {
        const blob = await generarReportePdf({
          ...contextoPdf(),
          titulo: reporte.titulo,
          hojas: reporte.hojas,
        });
        const url = URL.createObjectURL(blob);
        descargarArchivo(url, `${archivo}.pdf`);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      messageApi.error(`No se pudo generar el archivo ${formato === "xlsx" ? "de Excel" : "PDF"}`);
    } finally {
      setCargando(null);
    }
  };

  return (
    <Space>
      {contextHolder}
      <Button
        icon={<DownloadOutlined />}
        loading={cargando === "xlsx"}
        disabled={disabled}
        onClick={ejecutar("xlsx")}
      >
        Exportar a Excel
      </Button>
      <Button
        icon={<FilePdfOutlined />}
        loading={cargando === "pdf"}
        disabled={disabled}
        onClick={ejecutar("pdf")}
      >
        Exportar a PDF
      </Button>
    </Space>
  );
}

const TITULOS_REPORTE: Record<string, string> = {
  ventas: "Reporte de ventas",
  cartera: "Reporte de cartera y mora",
  recaudacion: "Reporte de recaudación",
  inventario: "Reporte de inventario",
  comercial: "Reporte comercial",
};

/** Tipo de presentación (PDF) de una columna según su título. */
function tipoDeColumna(titulo: string): TipoColumnaReporte | undefined {
  if (titulo.includes("%")) return "porcentaje";
  if (/^(Monto|Precio|Valor|Meta)/.test(titulo)) return "moneda";
  return undefined;
}

export function ReportesPage() {
  const { empresaActual } = useEmpresa();
  const { data: logoEmpresa } = useLogoByEmpresa(empresaActual?.id_empresa ?? 0);
  const { data: ventas = [], isLoading: cargandoVentas } = useVentas();
  const { data: cobranzas = [], isLoading: cargandoCobranzas } = useCobranzas();
  const { data: pagos = [] } = usePagos();
  const { data: lotes = [] } = useLotes();
  const { data: manzanas = [] } = useManzanas();
  const { data: etapas = [] } = useEtapas();
  const { data: proyectos = [] } = useProyectos();
  const { data: clientes = [] } = useClientes(empresaActual?.id_empresa ?? 0);
  const { data: asesores = [] } = useAsesores();
  const { data: prospectos = [] } = useProspectos();
  const { data: cotizaciones = [] } = useCotizaciones();
  const { data: contratos = [] } = useContratos();
  const { infoDeCobranza } = useInfoContratos();

  const [filtroFechas, setFiltroFechas] = useState<FiltroFechas>(FILTRO_FECHAS_INICIAL);
  const [idProyecto, setIdProyecto] = useState<number | undefined>();
  const [idAsesor, setIdAsesor] = useState<number | undefined>();

  // ---- Resolución de nombres: lote -> manzana -> etapa -> proyecto ----
  const mapas = useMemo(() => {
    const manzana = new Map(manzanas.map((m) => [m.id_manzana, m]));
    const etapa = new Map(etapas.map((e) => [e.id_etapa, e]));
    const proyecto = new Map(proyectos.map((p) => [p.id_proyecto, p]));
    const idProyectoDeLote = (idLote: number): number | undefined => {
      const l = lotes.find((x) => x.id_lote === idLote);
      const mz = l && manzana.get(l.id_manzana);
      return mz ? etapa.get(mz.id_etapa)?.id_proyecto : undefined;
    };
    return {
      manzana,
      etapa,
      proyecto,
      idProyectoDeLote,
      lote: new Map(lotes.map((l) => [l.id_lote, l])),
      cliente: new Map(clientes.map((c) => [c.id_cliente, c])),
      asesor: new Map(asesores.map((a) => [a.id_asesor, a])),
      venta: new Map(ventas.map((v) => [v.id_venta, v])),
      contrato: new Map(contratos.map((c) => [c.id_contrato, c])),
    };
  }, [manzanas, etapas, proyectos, lotes, clientes, asesores, ventas, contratos]);

  const etiquetaLote = (idLote: number): string => {
    const l = mapas.lote.get(idLote);
    if (!l) return `Lote #${idLote}`;
    return etiquetaNumeroLote(l.numero_lote, mapas.manzana.get(l.id_manzana)?.nombre_codigo);
  };
  const nombreProyectoDeLote = (idLote: number) => {
    const id = mapas.idProyectoDeLote(idLote);
    return id === undefined ? undefined : mapas.proyecto.get(id)?.nombre;
  };

  const hoy = diaEnEmpresa(new Date());
  const meses = mesesDelRango(filtroFechas.rango.desde, filtroFechas.rango.hasta);

  // ---- Ventas filtradas (período, proyecto, asesor) ----
  const ventasFiltradas = useMemo(
    () =>
      ventas.filter(
        (v) =>
          dentroDelRango(v.created_at, filtroFechas.rango) &&
          (idAsesor === undefined || v.id_asesor === idAsesor) &&
          (idProyecto === undefined || mapas.idProyectoDeLote(v.id_lote) === idProyecto),
      ),
    [ventas, filtroFechas, idAsesor, idProyecto, mapas],
  );
  const resumenVentas = useMemo(() => resumirVentas(ventasFiltradas), [ventasFiltradas]);
  const mensual = useMemo(() => ventasPorMes(ventasFiltradas), [ventasFiltradas]);

  // ---- Cartera: cuotas sin cobrar (el filtro de período aplica al vencimiento) ----
  const idVentaDeCobranza = (idCobranza: number): number | undefined =>
    infoDeCobranza(idCobranza)?.idVenta;
  const cuotas = useMemo(
    () =>
      cuotasEnCartera(
        cobranzas.filter((c) => {
          if (!dentroDelRango(c.fecha_vencimiento, filtroFechas.rango)) return false;
          const venta = mapas.venta.get(idVentaDeCobranza(c.id_cobranza) ?? -1);
          if (
            idProyecto !== undefined &&
            (!venta || mapas.idProyectoDeLote(venta.id_lote) !== idProyecto)
          )
            return false;
          if (idAsesor !== undefined && venta?.id_asesor !== idAsesor) return false;
          return true;
        }),
        hoy,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cobranzas, filtroFechas, idProyecto, idAsesor, mapas, hoy, infoDeCobranza],
  );
  const antiguedad = useMemo(() => antiguedadDeSaldos(cuotas), [cuotas]);
  const cuotasVencidas = useMemo(
    () => cuotas.filter((c) => c.diasMora > 0).sort((a, b) => b.diasMora - a.diasMora),
    [cuotas],
  );

  // ---- Recaudación ----
  const pagosFiltrados = useMemo(
    () =>
      pagos.filter((p) => {
        if (!dentroDelRango(p.fecha_pago, filtroFechas.rango)) return false;
        const venta = mapas.venta.get(idVentaDeCobranza(p.id_cobranza) ?? -1);
        if (
          idProyecto !== undefined &&
          (!venta || mapas.idProyectoDeLote(venta.id_lote) !== idProyecto)
        )
          return false;
        if (idAsesor !== undefined && venta?.id_asesor !== idAsesor) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pagos, filtroFechas, idProyecto, idAsesor, mapas, infoDeCobranza],
  );
  const pagosPorForma = useMemo(
    () => agruparPagos(pagosFiltrados, etiquetaFormaPago),
    [pagosFiltrados],
  );
  const pagosPorMes = useMemo(
    () =>
      agruparPagos(pagosFiltrados, (p) => mesDe(p.fecha_pago)).sort((a, b) =>
        a.clave.localeCompare(b.clave),
      ),
    [pagosFiltrados],
  );

  // ---- Ventas por forma de pago (cruce venta -> cobranza -> pago) ----
  // Indexa cada pago por su venta, saltando de la cobranza al contrato. Se
  // pagina sobre `pagos` completo (no el rango de recaudación) para que la
  // forma de pago describa al conjunto de la venta filtrada.
  const pagosPorVenta = useMemo(() => {
    const ventaDeCobranza = new Map<number, number>();
    for (const c of cobranzas) {
      const idVenta = mapas.contrato.get(c.id_contrato)?.id_venta;
      if (idVenta !== undefined) ventaDeCobranza.set(c.id_cobranza, idVenta);
    }
    const indice = new Map<number, Pago[]>();
    for (const p of pagos) {
      const idVenta = ventaDeCobranza.get(p.id_cobranza);
      if (idVenta === undefined) continue;
      indice.set(idVenta, [...(indice.get(idVenta) ?? []), p]);
    }
    return indice;
  }, [pagos, cobranzas, mapas.contrato]);

  /** Pagos de una venta (vacío si todavía no tiene cuotas cobradas). */
  const pagosDeVenta = (idVenta: number): Pago[] => pagosPorVenta.get(idVenta) ?? [];

  /** Pagos de una cuota (cobranza), para el detalle expandido. */
  const pagosDeCobranza = (idCobranza: number): Pago[] =>
    pagos.filter((p) => p.id_cobranza === idCobranza);

  const ventasPorFormaPago = useMemo(() => {
    const grupos = new Map<
      string,
      { cantidad: number; pagos: number; centavos: number; centavosPagados: number }
    >();
    for (const v of ventasFiltradas) {
      if (v.estado === "cancelada") continue;
      const pagosVenta = pagosDeVenta(v.id_venta);
      const forma = formaPagoPrincipal(pagosVenta, etiquetaFormaPago);
      const g = grupos.get(forma) ?? {
        cantidad: 0,
        pagos: 0,
        centavos: 0,
        centavosPagados: 0,
      };
      grupos.set(forma, {
        cantidad: g.cantidad + 1,
        pagos: g.pagos + pagosVenta.length,
        centavos: g.centavos + aCentavos(v.precio_final),
        centavosPagados:
          g.centavosPagados + pagosVenta.reduce((s, p) => s + aCentavos(p.monto_pagado), 0),
      });
    }
    return [...grupos.entries()]
      .map(([clave, g]) => ({
        clave,
        cantidad: g.cantidad,
        pagos: g.pagos,
        monto: deCentavos(g.centavos),
        montoPagado: deCentavos(g.centavosPagados),
      }))
      .sort((a, b) => b.monto - a.monto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventasFiltradas, pagosPorVenta]);

  /** Cuotas que ya recibieron al menos un pago, de las ventas filtradas. */
  const cuotasRealizadas = useMemo(() => {
    const pagosDeCobranza = new Map<number, Pago[]>();
    for (const p of pagos) {
      pagosDeCobranza.set(p.id_cobranza, [...(pagosDeCobranza.get(p.id_cobranza) ?? []), p]);
    }
    return cobranzas
      .filter((c) => {
        const pagosCuota = pagosDeCobranza.get(c.id_cobranza);
        if (!pagosCuota?.length) return false;
        const venta = mapas.venta.get(mapas.contrato.get(c.id_contrato)?.id_venta ?? -1);
        if (!venta) return false;
        if (idProyecto !== undefined && mapas.idProyectoDeLote(venta.id_lote) !== idProyecto)
          return false;
        if (idAsesor !== undefined && venta.id_asesor !== idAsesor) return false;
        return true;
      })
      .map((c) => {
        const pagosCuota = pagosDeCobranza.get(c.id_cobranza) ?? [];
        const idVenta = mapas.contrato.get(c.id_contrato)?.id_venta;
        const venta = idVenta === undefined ? undefined : mapas.venta.get(idVenta);
        const pagado = deCentavos(pagosCuota.reduce((s, p) => s + aCentavos(p.monto_pagado), 0));
        const ultimo = pagosCuota.reduce<string | undefined>(
          (acc, p) => (!acc || p.fecha_pago > acc ? p.fecha_pago : acc),
          undefined,
        );
        return {
          idCobranza: c.id_cobranza,
          cliente: infoDeCobranza(c.id_cobranza)?.cliente ?? "",
          lote: infoDeCobranza(c.id_cobranza)?.lote ?? "",
          numeroCuota: c.numero_cuota,
          fechaVencimiento: c.fecha_vencimiento,
          montoCuota: c.monto_cuota,
          pagado,
          saldo: deCentavos(aCentavos(c.monto_cuota) - aCentavos(pagado)),
          formaPago: formaPagoPrincipal(pagosCuota, etiquetaFormaPago),
          ultimoPago: ultimo ? diaEnEmpresa(ultimo) : "",
          estado: c.estado,
          idVenta: idVenta ?? -1,
          venta: venta?.id_venta,
        };
      });
  }, [cobranzas, pagos, idProyecto, idAsesor, mapas, infoDeCobranza]);

  // ---- Inventario (foto actual; sólo filtra por proyecto) ----
  const inventario = useMemo(
    () =>
      resumenInventario(
        lotes.filter(
          (l) => idProyecto === undefined || mapas.idProyectoDeLote(l.id_lote) === idProyecto,
        ),
        (l) => nombreProyectoDeLote(l.id_lote),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lotes, idProyecto, mapas],
  );

  // ---- Comercial ----
  const prospectosFiltrados = useMemo(
    () =>
      prospectos.filter(
        (p) =>
          dentroDelRango(p.created_at, filtroFechas.rango) &&
          (idAsesor === undefined || p.id_asesor === idAsesor),
      ),
    [prospectos, filtroFechas, idAsesor],
  );
  const embudo = useMemo(() => embudoProspectos(prospectosFiltrados), [prospectosFiltrados]);
  const desempeno = useMemo(
    () =>
      desempenoPorAsesor(
        asesores.filter((a) => idAsesor === undefined || a.id_asesor === idAsesor),
        prospectosFiltrados,
        cotizaciones,
        ventasFiltradas,
        meses,
      ),
    [asesores, idAsesor, prospectosFiltrados, cotizaciones, ventasFiltradas, meses],
  );

  // ---- Columnas ----
  const colsVentas: TableColumnType<(typeof ventasFiltradas)[number]>[] = [
    { title: "N°", dataIndex: "id_venta", sorter: (a, b) => a.id_venta - b.id_venta },
    {
      title: "Fecha",
      dataIndex: "created_at",
      render: (v?: string) => (v ? formatDateOnly(diaEnEmpresa(v)) : "-"),
      sorter: (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""),
    },
    {
      title: "Cliente",
      render: (_, v) => mapas.cliente.get(v.id_cliente)?.nombres ?? `Cliente #${v.id_cliente}`,
    },
    { title: "Lote", render: (_, v) => etiquetaLote(v.id_lote) },
    { title: "Proyecto", render: (_, v) => nombreProyectoDeLote(v.id_lote) ?? "-" },
    {
      title: "Asesor",
      render: (_, v) =>
        v.id_asesor == null ? "-" : (mapas.asesor.get(v.id_asesor)?.nombre_comercial ?? "-"),
    },
    {
      title: "Precio final",
      dataIndex: "precio_final",
      align: "right",
      render: (v: number) => formatCurrency(v),
      sorter: (a, b) => a.precio_final - b.precio_final,
    },
    {
      title: "Forma de pago",
      render: (_, v) => {
        const pagosVenta = pagosDeVenta(v.id_venta);
        if (pagosVenta.length === 0) return "-";
        const total = deCentavos(pagosVenta.reduce((s, p) => s + aCentavos(p.monto_pagado), 0));
        return (
          <span>
            {formaPagoPrincipal(pagosVenta, etiquetaFormaPago)}
            <Text type="secondary">
              {" "}
              · {pagosVenta.length} {pagosVenta.length === 1 ? "pago" : "pagos"} ·{" "}
              {formatCurrency(total)}
            </Text>
          </span>
        );
      },
      sorter: (a, b) =>
        formaPagoPrincipal(pagosDeVenta(a.id_venta), etiquetaFormaPago).localeCompare(
          formaPagoPrincipal(pagosDeVenta(b.id_venta), etiquetaFormaPago),
        ),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      render: (e: string) => <Tag color={TIPOS_VENTA_COLOR[e]}>{e}</Tag>,
    },
  ];
  const colsMes: TableColumnType<VentasPorMes>[] = [
    { title: "Mes", dataIndex: "mes" },
    { title: "Ventas", dataIndex: "cantidad", align: "right" },
    {
      title: "Monto",
      dataIndex: "monto",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
  ];
  const colsAntiguedad: TableColumnType<FilaAntiguedad>[] = [
    { title: "Tramo", dataIndex: "label" },
    { title: "Cuotas", dataIndex: "cuotas", align: "right" },
    {
      title: "Monto por cobrar",
      dataIndex: "monto",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "% de la cartera",
      dataIndex: "porcentaje",
      align: "right",
      render: (v: number) => `${v}%`,
    },
  ];
  const colsMora: TableColumnType<CuotaEnCartera>[] = [
    { title: "Cliente", render: (_, c) => infoDeCobranza(c.id_cobranza)?.cliente ?? "-" },
    { title: "Lote", render: (_, c) => infoDeCobranza(c.id_cobranza)?.lote ?? "-" },
    { title: "Cuota", dataIndex: "numero_cuota", align: "right" },
    {
      title: "Vencimiento",
      dataIndex: "fecha_vencimiento",
      render: (v: string) => formatDateOnly(v),
    },
    {
      title: "Monto",
      dataIndex: "monto_cuota",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Días de mora",
      dataIndex: "diasMora",
      align: "right",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.diasMora - b.diasMora,
    },
  ];
  const colsAgrupado = (titulo: string): TableColumnType<FilaAgrupada>[] => [
    { title: titulo, dataIndex: "clave" },
    { title: "Pagos", dataIndex: "cantidad", align: "right" },
    {
      title: "Monto",
      dataIndex: "monto",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
  ];
  const colsVentasPorForma: TableColumnType<(typeof ventasPorFormaPago)[number]>[] = [
    { title: "Forma de pago", dataIndex: "clave" },
    { title: "Ventas", dataIndex: "cantidad", align: "right" },
    { title: "Pagos", dataIndex: "pagos", align: "right" },
    {
      title: "Monto vendido",
      dataIndex: "monto",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Monto pagado",
      dataIndex: "montoPagado",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
  ];
  const colsCuotasRealizadas: TableColumnType<(typeof cuotasRealizadas)[number]>[] = [
    { title: "Cliente", dataIndex: "cliente" },
    { title: "Lote", dataIndex: "lote" },
    { title: "Cuota", dataIndex: "numeroCuota", align: "right" },
    {
      title: "Vencimiento",
      dataIndex: "fechaVencimiento",
      render: (v?: string) => (v ? formatDateOnly(v) : "-"),
    },
    {
      title: "Monto cuota",
      dataIndex: "montoCuota",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Monto pagado",
      dataIndex: "pagado",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Saldo",
      dataIndex: "saldo",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
    { title: "Forma de pago", dataIndex: "formaPago" },
    {
      title: "Último pago",
      dataIndex: "ultimoPago",
      render: (v?: string) => (v ? formatDateOnly(v) : "-"),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      render: (e: string) => <Tag color={TIPOS_COBRANZA_COLOR[e]}>{e}</Tag>,
    },
  ];
  /** Detalle expandido: pagos que componen el total cobrado de la cuota. */
  const detalleCuotaRealizada = (c: (typeof cuotasRealizadas)[number]) => (
    <Table
      size="small"
      rowKey="id_pago"
      pagination={false}
      dataSource={pagosDeCobranza(c.idCobranza)}
      columns={[
        {
          title: "Fecha",
          dataIndex: "fecha_pago",
          render: (v?: string) => (v ? formatDateOnly(diaEnEmpresa(v)) : "-"),
        },
        {
          title: "Monto",
          dataIndex: "monto_pagado",
          align: "right",
          render: (v: number) => formatCurrency(v),
        },
        { title: "Forma de pago", render: (_, p: Pago) => etiquetaFormaPago(p) },
      ]}
    />
  );
  const colsInventario: TableColumnType<FilaInventario>[] = [
    { title: "Proyecto", dataIndex: "proyecto" },
    { title: "Total", dataIndex: "total", align: "right" },
    ...ESTADOS_LOTE.map(({ key, label }) => ({
      title: label,
      align: "right" as const,
      render: (_: unknown, f: FilaInventario) => f.porEstado[key],
    })),
    {
      title: "Valor disponible",
      dataIndex: "valorDisponible",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "% vendido",
      dataIndex: "avanceVentas",
      align: "right",
      render: (v: number) => `${v}%`,
    },
  ];
  const colsAsesor: TableColumnType<FilaAsesor>[] = [
    { title: "Asesor", dataIndex: "asesor" },
    { title: "Prospectos", dataIndex: "prospectos", align: "right" },
    { title: "Cotizaciones", dataIndex: "cotizaciones", align: "right" },
    { title: "Ventas", dataIndex: "ventas", align: "right" },
    {
      title: "Monto vendido",
      dataIndex: "montoVendido",
      align: "right",
      render: (v: number) => formatCurrency(v),
    },
    {
      title: "Meta mensual",
      dataIndex: "metaMensual",
      align: "right",
      render: (v: number) => (v > 0 ? formatCurrency(v) : "-"),
    },
    {
      title: "Cumplimiento",
      dataIndex: "cumplimientoMeta",
      align: "right",
      render: (v: number | null) => (v === null ? "-" : `${v}%`),
    },
  ];

  // ---- Exportación ----
  const exportar = (base: string, hojas: HojaReporte[]): ReporteListo => ({
    base,
    titulo: TITULOS_REPORTE[base] ?? base,
    hojas: hojas.map((h) => ({ ...h, tipos: h.columnas.map(tipoDeColumna) })),
  });

  /** Encabezado del PDF: empresa y filtros vigentes al momento de exportar. */
  const contextoPdf = () => {
    const { desde, hasta } = filtroFechas.rango;
    return {
      empresa: empresaActual?.razon_social ?? "Lotes al Mando",
      logoUrl: logoEmpresa,
      detalle: [
        `Período: ${desde && hasta ? `${formatDateOnly(desde)} al ${formatDateOnly(hasta)}` : "Todo"}`,
        `Proyecto: ${idProyecto === undefined ? "Todos" : (mapas.proyecto.get(idProyecto)?.nombre ?? "-")}  ·  Asesor: ${idAsesor === undefined ? "Todos" : (mapas.asesor.get(idAsesor)?.nombre_comercial ?? "-")}`,
        `Emitido el ${formatDateOnly(hoy)}`,
      ],
    };
  };

  const exportarVentas = () =>
    exportar("ventas", [
      {
        nombre: "Ventas",
        columnas: [
          "N°",
          "Fecha",
          "Cliente",
          "Lote",
          "Proyecto",
          "Asesor",
          "Precio final",
          "Forma de pago",
          "Monto pagado",
          "Saldo",
          "Estado",
        ],
        filas: ventasFiltradas.map((v) => {
          const pagosVenta = pagosDeVenta(v.id_venta);
          const pagado = deCentavos(pagosVenta.reduce((s, p) => s + aCentavos(p.monto_pagado), 0));
          return [
            v.id_venta,
            v.created_at ? diaEnEmpresa(v.created_at) : "",
            mapas.cliente.get(v.id_cliente)?.nombres ?? `Cliente #${v.id_cliente}`,
            etiquetaLote(v.id_lote),
            nombreProyectoDeLote(v.id_lote) ?? "",
            v.id_asesor == null ? "" : (mapas.asesor.get(v.id_asesor)?.nombre_comercial ?? ""),
            v.precio_final,
            pagosVenta.length === 0
              ? ""
              : `${formaPagoPrincipal(pagosVenta, etiquetaFormaPago)} (${pagosVenta.length} ${pagosVenta.length === 1 ? "pago" : "pagos"} · ${formatCurrency(pagado)})`,
            pagado,
            v.precio_final - pagado,
            v.estado,
          ];
        }),
      },
      {
        nombre: "Por forma de pago",
        columnas: ["Forma de pago", "Ventas", "Pagos", "Monto vendido", "Monto pagado"],
        filas: ventasPorFormaPago.map((f) => [
          f.clave,
          f.cantidad,
          f.pagos,
          f.monto,
          f.montoPagado,
        ]),
      },
      {
        nombre: "Cuotas realizadas",
        columnas: [
          "Cliente",
          "Lote",
          "Cuota",
          "Vencimiento",
          "Monto cuota",
          "Monto pagado",
          "Saldo",
          "Forma de pago",
          "Último pago",
          "Estado",
        ],
        filas: cuotasRealizadas.map((c) => [
          c.cliente,
          c.lote,
          c.numeroCuota,
          c.fechaVencimiento,
          c.montoCuota,
          c.pagado,
          c.saldo,
          c.formaPago,
          c.ultimoPago,
          c.estado,
        ]),
      },
      {
        nombre: "Por mes",
        columnas: ["Mes", "Ventas", "Monto"],
        filas: mensual.map((m) => [m.mes, m.cantidad, m.monto]),
      },
    ]);
  const exportarCartera = () =>
    exportar("cartera", [
      {
        nombre: "Antigüedad de saldos",
        columnas: ["Tramo", "Cuotas", "Monto por cobrar", "% de la cartera"],
        filas: antiguedad.map((a) => [a.label, a.cuotas, a.monto, a.porcentaje]),
      },
      {
        nombre: "Cuotas en mora",
        columnas: ["Cliente", "Lote", "Cuota", "Vencimiento", "Monto", "Días de mora"],
        filas: cuotasVencidas.map((c) => [
          infoDeCobranza(c.id_cobranza)?.cliente ?? "",
          infoDeCobranza(c.id_cobranza)?.lote ?? "",
          c.numero_cuota,
          c.fecha_vencimiento,
          c.monto_cuota,
          c.diasMora,
        ]),
      },
    ]);
  const exportarRecaudacion = () =>
    exportar("recaudacion", [
      {
        nombre: "Pagos",
        columnas: ["Fecha", "Cliente", "Lote", "Cuota", "Monto", "Forma de pago"],
        filas: pagosFiltrados.map((p) => {
          const info = infoDeCobranza(p.id_cobranza);
          const cuota = cobranzas.find((c) => c.id_cobranza === p.id_cobranza);
          return [
            diaEnEmpresa(p.fecha_pago),
            info?.cliente ?? "",
            info?.lote ?? "",
            cuota?.numero_cuota ?? "",
            p.monto_pagado,
            FORMA_PAGO_LABEL[p.forma_pago ?? "no_especificada"] ?? "Otro",
          ];
        }),
      },
      {
        nombre: "Por mes",
        columnas: ["Mes", "Pagos", "Monto"],
        filas: pagosPorMes.map((m) => [m.clave, m.cantidad, m.monto]),
      },
      {
        nombre: "Por forma de pago",
        columnas: ["Forma de pago", "Pagos", "Monto"],
        filas: pagosPorForma.map((f) => [f.clave, f.cantidad, f.monto]),
      },
    ]);
  const exportarInventario = () =>
    exportar("inventario", [
      {
        nombre: "Inventario",
        columnas: [
          "Proyecto",
          "Total",
          ...ESTADOS_LOTE.map((e) => e.label),
          "Valor disponible",
          "% vendido",
        ],
        filas: inventario.map((f) => [
          f.proyecto,
          f.total,
          ...ESTADOS_LOTE.map((e) => f.porEstado[e.key]),
          f.valorDisponible,
          f.avanceVentas,
        ]),
      },
    ]);
  const exportarComercial = () =>
    exportar("comercial", [
      {
        nombre: "Embudo",
        columnas: ["Estado", "Prospectos", "%"],
        filas: embudo.map((e) => [e.label, e.cantidad, e.porcentaje]),
      },
      {
        nombre: "Asesores",
        columnas: [
          "Asesor",
          "Prospectos",
          "Cotizaciones",
          "Ventas",
          "Monto vendido",
          "Meta mensual",
          "Cumplimiento %",
        ],
        filas: desempeno.map((a) => [
          a.asesor,
          a.prospectos,
          a.cotizaciones,
          a.ventas,
          a.montoVendido,
          a.metaMensual,
          a.cumplimientoMeta,
        ]),
      },
    ]);

  const montoCartera = cuotas.reduce((s, c) => s + Math.round(c.monto_cuota * 100), 0) / 100;
  const montoMora = cuotasVencidas.reduce((s, c) => s + Math.round(c.monto_cuota * 100), 0) / 100;

  const kpi = (title: string, value: string | number, color?: string) => (
    <Col xs={12} md={6}>
      <Card size="small">
        <Statistic title={title} value={value} styles={{ content: { fontSize: 20, color } }} />
      </Card>
    </Col>
  );

  const tab = (
    kpis: React.ReactNode,
    exportador: () => ReporteListo,
    vacio: boolean,
    contenido: React.ReactNode,
  ) => (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Row gutter={[12, 12]}>{kpis}</Row>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <BotonesExportar generar={exportador} contextoPdf={contextoPdf} disabled={vacio} />
      </div>
      {contenido}
    </Space>
  );

  const aplicaPeriodo = (texto: string) => <Text type="secondary">{texto}</Text>;

  return (
    <div>
      <PageToolbar
        title="Reportes"
        subtitle="Indicadores y reportes del negocio, exportables a Excel"
      />

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <FiltroRangoFechas value={filtroFechas} onChange={setFiltroFechas} />
          <Select
            allowClear
            placeholder="Todos los proyectos"
            style={{ width: 220 }}
            value={idProyecto}
            onChange={setIdProyecto}
            options={proyectos.map((p) => ({ value: p.id_proyecto, label: p.nombre }))}
          />
          <Select
            allowClear
            placeholder="Todos los asesores"
            style={{ width: 220 }}
            value={idAsesor}
            onChange={setIdAsesor}
            options={asesores.map((a) => ({ value: a.id_asesor, label: a.nombre_comercial }))}
          />
        </Space>
      </Card>

      {(cargandoVentas || cargandoCobranzas) && (
        <Alert type="info" showIcon message="Cargando datos..." style={{ marginBottom: 16 }} />
      )}

      <Tabs
        items={[
          {
            key: "ventas",
            label: "Ventas",
            children: tab(
              <>
                {kpi("Ventas", resumenVentas.cantidad)}
                {kpi("Monto vendido", formatCurrency(resumenVentas.montoVendido), "#52c41a")}
                {kpi("Ticket promedio", formatCurrency(resumenVentas.ticketPromedio))}
                {kpi(
                  "Canceladas",
                  resumenVentas.canceladas,
                  resumenVentas.canceladas > 0 ? "#ff4d4f" : undefined,
                )}
              </>,
              exportarVentas,
              ventasFiltradas.length === 0,
              <>
                {aplicaPeriodo(
                  "Período según la fecha de la venta. El monto excluye las ventas canceladas.",
                )}
                <DataTable
                  title={() => "Ventas por mes"}
                  columns={colsMes}
                  dataSource={mensual}
                  rowKey="mes"
                  pagination={false}
                />
                <DataTable
                  title={() => "Ventas por forma de pago"}
                  columns={colsVentasPorForma}
                  dataSource={ventasPorFormaPago}
                  rowKey="clave"
                  pagination={false}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>
                        <Text strong>Total</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <Text strong>{ventasPorFormaPago.reduce((s, f) => s + f.cantidad, 0)}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">
                        <Text strong>{ventasPorFormaPago.reduce((s, f) => s + f.pagos, 0)}</Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <Text strong>
                          {formatCurrency(
                            deCentavos(
                              ventasPorFormaPago.reduce((s, f) => s + aCentavos(f.monto), 0),
                            ),
                          )}
                        </Text>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        <Text strong>
                          {formatCurrency(
                            deCentavos(
                              ventasPorFormaPago.reduce((s, f) => s + aCentavos(f.montoPagado), 0),
                            ),
                          )}
                        </Text>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
                <DataTable
                  title={() => `Cuotas realizadas (${cuotasRealizadas.length})`}
                  columns={colsCuotasRealizadas}
                  dataSource={cuotasRealizadas}
                  rowKey="idCobranza"
                  expandable={{ expandedRowRender: (c) => detalleCuotaRealizada(c) }}
                  summary={(paginas) => {
                    const totales = (paginas.length ? paginas : cuotasRealizadas).reduce(
                      (acc, c) => ({
                        montoCuota: acc.montoCuota + aCentavos(c.montoCuota),
                        pagado: acc.pagado + aCentavos(c.pagado),
                        saldo: acc.saldo + aCentavos(c.saldo),
                      }),
                      { montoCuota: 0, pagado: 0, saldo: 0 },
                    );
                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row>
                          <Table.Summary.Cell index={0}>
                            <Text strong>Total</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} />
                          <Table.Summary.Cell index={2} />
                          <Table.Summary.Cell index={3} />
                          <Table.Summary.Cell index={4} align="right">
                            <Text strong>{formatCurrency(deCentavos(totales.montoCuota))}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={5} align="right">
                            <Text strong>{formatCurrency(deCentavos(totales.pagado))}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={6} align="right">
                            <Text strong>{formatCurrency(deCentavos(totales.saldo))}</Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={7} />
                          <Table.Summary.Cell index={8} />
                          <Table.Summary.Cell index={9} />
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                />
                <DataTable
                  title={() => "Detalle de ventas"}
                  columns={colsVentas}
                  dataSource={ventasFiltradas}
                  rowKey="id_venta"
                />
              </>,
            ),
          },
          {
            key: "cartera",
            label: "Cartera y mora",
            children: tab(
              <>
                {kpi("Cuotas por cobrar", cuotas.length)}
                {kpi("Monto por cobrar", formatCurrency(montoCartera))}
                {kpi(
                  "Cuotas en mora",
                  cuotasVencidas.length,
                  cuotasVencidas.length > 0 ? "#ff4d4f" : undefined,
                )}
                {kpi(
                  "Monto en mora",
                  formatCurrency(montoMora),
                  montoMora > 0 ? "#ff4d4f" : undefined,
                )}
              </>,
              exportarCartera,
              cuotas.length === 0,
              <>
                {aplicaPeriodo(
                  `Período según el vencimiento de la cuota. Mora calculada al ${formatDateOnly(hoy)}.`,
                )}
                <DataTable
                  title={() => "Antigüedad de saldos"}
                  columns={colsAntiguedad}
                  dataSource={antiguedad}
                  rowKey="tramo"
                  pagination={false}
                />
                <DataTable
                  title={() => "Cuotas en mora"}
                  columns={colsMora}
                  dataSource={cuotasVencidas}
                  rowKey="id_cobranza"
                />
              </>,
            ),
          },
          {
            key: "recaudacion",
            label: "Recaudación",
            children: tab(
              <>
                {kpi("Pagos recibidos", pagosFiltrados.length)}
                {kpi("Monto recaudado", formatCurrency(totalPagos(pagosFiltrados)), "#52c41a")}
              </>,
              exportarRecaudacion,
              pagosFiltrados.length === 0,
              <>
                {aplicaPeriodo("Período según la fecha del pago.")}
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <DataTable
                      title={() => "Por mes"}
                      columns={colsAgrupado("Mes")}
                      dataSource={pagosPorMes}
                      rowKey="clave"
                      pagination={false}
                    />
                  </Col>
                  <Col xs={24} lg={12}>
                    <DataTable
                      title={() => "Por forma de pago"}
                      columns={colsAgrupado("Forma de pago")}
                      dataSource={pagosPorForma}
                      rowKey="clave"
                      pagination={false}
                    />
                  </Col>
                </Row>
              </>,
            ),
          },
          {
            key: "inventario",
            label: "Inventario",
            children: tab(
              <>
                {kpi(
                  "Lotes",
                  inventario.reduce((s, f) => s + f.total, 0),
                )}
                {kpi(
                  "Disponibles",
                  inventario.reduce((s, f) => s + f.porEstado.disponible, 0),
                  "#52c41a",
                )}
                {kpi(
                  "Vendidos",
                  inventario.reduce((s, f) => s + f.porEstado.vendido, 0),
                )}
                {kpi(
                  "Valor disponible",
                  formatCurrency(inventario.reduce((s, f) => s + f.valorDisponible, 0)),
                )}
              </>,
              exportarInventario,
              inventario.length === 0,
              <>
                {aplicaPeriodo(
                  "Estado actual del inventario; no depende del período ni del asesor.",
                )}
                <DataTable
                  columns={colsInventario}
                  dataSource={inventario}
                  rowKey="proyecto"
                  pagination={false}
                />
              </>,
            ),
          },
          {
            key: "comercial",
            label: "Comercial",
            children: tab(
              <>
                {kpi("Prospectos", prospectosFiltrados.length)}
                {kpi(
                  "En negociación",
                  embudo.find((e) => e.estado === "negociacion")?.cantidad ?? 0,
                )}
                {kpi(
                  "Cotizaciones",
                  desempeno.reduce((s, a) => s + a.cotizaciones, 0),
                )}
                {kpi(
                  "Ventas",
                  desempeno.reduce((s, a) => s + a.ventas, 0),
                  "#52c41a",
                )}
              </>,
              exportarComercial,
              prospectosFiltrados.length === 0 && desempeno.length === 0,
              <>
                {aplicaPeriodo(
                  "Prospectos y ventas según el período. La meta se multiplica por los meses del rango.",
                )}
                <DataTable
                  title={() => "Embudo de prospectos"}
                  columns={[
                    { title: "Estado", dataIndex: "label" },
                    { title: "Prospectos", dataIndex: "cantidad", align: "right" },
                    {
                      title: "%",
                      dataIndex: "porcentaje",
                      align: "right",
                      render: (v: number) => `${v}%`,
                    },
                  ]}
                  dataSource={embudo}
                  rowKey="estado"
                  pagination={false}
                />
                <DataTable
                  title={() => "Desempeño por asesor"}
                  columns={colsAsesor}
                  dataSource={desempeno}
                  rowKey={(f) => f.id_asesor ?? "sin"}
                  pagination={false}
                />
              </>,
            ),
          },
        ]}
      />
    </div>
  );
}
