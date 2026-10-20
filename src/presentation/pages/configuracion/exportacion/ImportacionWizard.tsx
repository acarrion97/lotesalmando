import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Progress,
  Radio,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  ImportOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useEmpresa } from "@/presentation/providers";
import {
  columnasObligatoriasFaltantes,
  getTablaExport,
  ordenarPorDependencia,
} from "@/infrastructure/export/exportTableCatalog";
import type {
  ColumnaExport,
  MapeoColumna,
  TablaExport,
} from "@/infrastructure/export/exportTableCatalog";
import {
  agruparPorTabla,
  esArchivoSoportado,
  leerArchivo,
  leerHoja,
  mapearAutomatico,
  nombreATabla,
} from "@/infrastructure/export/leerArchivoImportacion";
import type {
  AgrupacionTabla,
  ArchivoLeido,
  ColumnaArchivo,
  ContenidoHoja,
} from "@/infrastructure/export/leerArchivoImportacion";
import {
  CLAVES_INVALIDAR,
  importarBloques,
  prepararBloque,
} from "@/infrastructure/export/importarFilas";
import type {
  BloqueImportacion,
  FilaImportacion,
  ResultadoTabla,
} from "@/infrastructure/export/importarFilas";
import { nombreCelda } from "@/infrastructure/export/generarPlantillaExportacion";
import { SelectorTablas } from "./SelectorTablas";
import { COLOR_TIPO, ETIQUETA_TIPO } from "./tiposColumna";

const PASOS = ["Tablas destino", "Archivo y hojas", "Mapeo de columnas", "Revisión", "Importación"];

/** Tope de filas por importación; por encima se pide partir el archivo. */
const LIMITE_FILAS = 10000;
const FILAS_VISTA_PREVIA = 10;

/** Cómo viene organizada la data del archivo. */
type Organizacion = "hojas" | "una";

type ColumnaMapeada = ColumnaArchivo & { columnaDestino: string };

interface FilaColumna extends ColumnaArchivo {
  idx: number;
}

/** Una tabla del archivo: sus filas y el mapeo de sus columnas. */
interface BloqueUI extends BloqueImportacion {
  destino: TablaExport;
  cabeceras: string[];
}

interface ValidacionBloque {
  bloque: BloqueUI;
  mapeadas: ColumnaMapeada[];
  faltantes: ColumnaExport[];
  repetidas: string[];
  preparacion: FilaImportacion[];
  validas: number;
  invalidas: number;
}

interface FilaConTabla extends FilaImportacion {
  tabla: string;
}

/** Resultado por fila de la importación, con la tabla a la que pertenece. */
interface FilaResultado {
  tabla: string;
  numero: number;
  resumen: string;
  estado: "ok" | "existente" | "error";
  mensaje: string;
}

interface FilaGrupo {
  tabla: string;
  etiqueta: string;
  filas: number;
}

/** Wizard que lee un XLSX/CSV con una o varias tablas y las carga en la BD. */
export function ImportacionWizard() {
  const [messageApi, contextHolder] = message.useMessage();
  const { empresaActual } = useEmpresa();
  const queryClient = useQueryClient();

  const [paso, setPaso] = useState(0);
  const [tablasSel, setTablasSel] = useState<string[]>([]);
  const [organizacion, setOrganizacion] = useState<Organizacion>("hojas");
  const [archivo, setArchivo] = useState<ArchivoLeido | null>(null);
  const [contenidos, setContenidos] = useState<Record<string, ContenidoHoja>>({});
  const [hojasAsignadas, setHojasAsignadas] = useState<Record<string, string | null>>({});
  const [hojaUnica, setHojaUnica] = useState<string | null>(null);
  const [mapeos, setMapeos] = useState<Record<string, ColumnaArchivo[]>>({});
  const [tablaPreview, setTablaPreview] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState({ procesadas: 0, total: 0 });
  const [resultados, setResultados] = useState<ResultadoTabla[] | null>(null);

  const empresaId = empresaActual?.id_empresa ?? null;
  const hojas = archivo?.workbook.SheetNames ?? [];

  const requiereEmpresa = useMemo(
    () =>
      tablasSel.some((nombre) => getTablaExport(nombre)?.columnas.some((col) => col.empresaActual)),
    [tablasSel],
  );

  // Modo «una sola hoja»: reparte las filas entre las tablas seleccionadas
  // usando la columna «tabla» de cada fila.
  const agrupacion = useMemo<AgrupacionTabla | null>(() => {
    if (organizacion !== "una" || !hojaUnica) return null;
    const contenido = contenidos[hojaUnica];
    if (!contenido) return null;
    return agruparPorTabla(contenido.cabeceras, contenido.filas, tablasSel);
  }, [organizacion, hojaUnica, contenidos, tablasSel]);

  /** Mapeo automático de cada tabla detectada en la hoja única. */
  const mapeosDeHojaUnica = (
    contenidosActuales: Record<string, ContenidoHoja>,
    nombreHoja: string | null,
  ): Record<string, ColumnaArchivo[]> => {
    const contenido = nombreHoja ? contenidosActuales[nombreHoja] : null;
    if (!contenido) return {};
    const detectada = agruparPorTabla(contenido.cabeceras, contenido.filas, tablasSel);
    const nuevos: Record<string, ColumnaArchivo[]> = {};
    detectada?.grupos.forEach((grupo) => {
      const tabla = getTablaExport(grupo.tabla);
      if (tabla) nuevos[grupo.tabla] = mapearAutomatico(contenido.cabeceras, tabla);
    });
    return nuevos;
  };

  const bloques: BloqueUI[] = useMemo(() => {
    if (!archivo) return [];
    const construidos: BloqueUI[] = [];

    if (organizacion === "hojas") {
      Object.entries(hojasAsignadas).forEach(([nombreHoja, tablaKey]) => {
        if (!tablaKey) return;
        const destino = getTablaExport(tablaKey);
        const contenido = contenidos[nombreHoja];
        if (!destino || !contenido) return;
        construidos.push({
          tabla: tablaKey,
          hoja: nombreHoja,
          destino,
          cabeceras: contenido.cabeceras,
          columnas: mapeos[tablaKey] ?? [],
          filas: contenido.filas.map((celdas, indice) => ({ numero: indice + 1, celdas })),
        });
      });
    } else if (hojaUnica && agrupacion) {
      const contenido = contenidos[hojaUnica];
      if (contenido) {
        agrupacion.grupos.forEach((grupo) => {
          const destino = getTablaExport(grupo.tabla);
          if (!destino) return;
          construidos.push({
            tabla: grupo.tabla,
            hoja: hojaUnica,
            destino,
            cabeceras: contenido.cabeceras,
            columnas: mapeos[grupo.tabla] ?? [],
            filas: grupo.filas,
          });
        });
      }
    }

    // Se muestran siempre de padre a hijo, igual que se insertan.
    const orden = ordenarPorDependencia(construidos.map((bloque) => bloque.tabla));
    return [...construidos].sort((a, b) => orden.indexOf(a.tabla) - orden.indexOf(b.tabla));
  }, [archivo, organizacion, hojasAsignadas, contenidos, mapeos, hojaUnica, agrupacion]);

  const validaciones: ValidacionBloque[] = useMemo(
    () =>
      bloques.map((bloque) => {
        const mapeadas = bloque.columnas.filter((col): col is ColumnaMapeada =>
          Boolean(col.columnaDestino),
        );
        const mapeo: MapeoColumna[] = mapeadas.map((col) => ({
          columna: col.columnaDestino,
          cabecera: col.cabecera,
        }));
        const vistas = new Set<string>();
        const repetidas = new Set<string>();
        mapeadas.forEach((col) => {
          if (vistas.has(col.columnaDestino)) repetidas.add(col.columnaDestino);
          vistas.add(col.columnaDestino);
        });

        const preparacion = prepararBloque(bloque.destino, bloque, empresaId);
        return {
          bloque,
          mapeadas,
          faltantes: columnasObligatoriasFaltantes(bloque.destino, mapeo),
          repetidas: [...repetidas],
          preparacion,
          validas: preparacion.filter((fila) => fila.errores.length === 0).length,
          invalidas: preparacion.filter((fila) => fila.errores.length > 0).length,
        };
      }),
    [bloques, empresaId],
  );

  const totalFilas = bloques.reduce((suma, bloque) => suma + bloque.filas.length, 0);
  const totalValidas = validaciones.reduce((suma, v) => suma + v.validas, 0);
  const totalInvalidas = validaciones.reduce((suma, v) => suma + v.invalidas, 0);
  const filasDentroDeLimite = totalFilas <= LIMITE_FILAS;

  const mapeoValido =
    validaciones.length > 0 &&
    validaciones.every(
      (v) => v.mapeadas.length > 0 && v.repetidas.length === 0 && v.faltantes.length === 0,
    );

  const tablasSinHoja = useMemo(() => {
    if (organizacion !== "hojas") return [];
    const asignadas = Object.values(hojasAsignadas);
    return tablasSel.filter((nombre) => !asignadas.includes(nombre));
  }, [organizacion, tablasSel, hojasAsignadas]);

  const puedeAvanzar =
    paso === 0
      ? tablasSel.length > 0 && (!requiereEmpresa || empresaId !== null)
      : paso === 1
        ? Boolean(archivo) && bloques.length > 0 && totalFilas > 0 && filasDentroDeLimite
        : paso === 2
          ? mapeoValido
          : paso === 3
            ? totalValidas > 0
            : true;

  const etiquetaTabla = (nombre: string) => getTablaExport(nombre)?.etiqueta ?? nombre;

  const limpiarArchivo = () => {
    setArchivo(null);
    setContenidos({});
    setHojasAsignadas({});
    setHojaUnica(null);
    setMapeos({});
    setTablaPreview(null);
    setResultados(null);
    setProgreso({ procesadas: 0, total: 0 });
  };

  const seleccionarTablas = (valores: string[]) => {
    setTablasSel(valores);
    limpiarArchivo();
    setPaso(0);
  };

  const cargarArchivo = async (file: File) => {
    if (tablasSel.length === 0) return Upload.LIST_IGNORE;
    if (!esArchivoSoportado(file)) {
      messageApi.error("Formato no admitido: usá un archivo .xlsx, .xls o .csv");
      return Upload.LIST_IGNORE;
    }
    try {
      setLeyendo(true);
      const leido = await leerArchivo(file);
      const leidos: Record<string, ContenidoHoja> = {};
      for (const nombre of leido.workbook.SheetNames) {
        leidos[nombre] = await leerHoja(leido, nombre);
      }

      // Asignación automática: el nombre de la hoja que coincida con una tabla
      // seleccionada queda vinculado sin tocar nada.
      const asignaciones: Record<string, string | null> = {};
      const mapeosIniciales: Record<string, ColumnaArchivo[]> = {};
      const usadas = new Set<string>();
      leido.workbook.SheetNames.forEach((nombre) => {
        const inferida = nombreATabla(nombre);
        if (inferida && tablasSel.includes(inferida) && !usadas.has(inferida)) {
          asignaciones[nombre] = inferida;
          usadas.add(inferida);
        } else {
          asignaciones[nombre] = null;
        }
        const tablaKey = asignaciones[nombre];
        const destino = tablaKey ? getTablaExport(tablaKey) : null;
        if (tablaKey && destino) {
          mapeosIniciales[tablaKey] = mapearAutomatico(leidos[nombre].cabeceras, destino);
        }
      });

      setArchivo(leido);
      setContenidos(leidos);
      setHojasAsignadas(asignaciones);
      setHojaUnica(leido.workbook.SheetNames[0] ?? null);
      // Mapeos de las hojas asignadas + los de la hoja única (columna «tabla»).
      setMapeos({
        ...mapeosIniciales,
        ...mapeosDeHojaUnica(leidos, leido.workbook.SheetNames[0] ?? null),
      });
      setResultados(null);
      messageApi.success(`Archivo cargado: ${leido.nombre}`);
    } catch (error) {
      limpiarArchivo();
      messageApi.error(error instanceof Error ? error.message : "No se pudo leer el archivo");
    } finally {
      setLeyendo(false);
    }
    return Upload.LIST_IGNORE;
  };

  const cambiarOrganizacion = (valor: Organizacion) => {
    setOrganizacion(valor);
    if (valor === "una") {
      setMapeos((prev) => ({ ...prev, ...mapeosDeHojaUnica(contenidos, hojaUnica) }));
    }
    setResultados(null);
  };

  const cambiarHojaUnica = (nombre: string) => {
    setHojaUnica(nombre);
    setMapeos((prev) => ({ ...prev, ...mapeosDeHojaUnica(contenidos, nombre) }));
    setResultados(null);
  };

  const asignarHoja = (nombreHoja: string, tablaKey: string | null) => {
    setHojasAsignadas((prev) => ({ ...prev, [nombreHoja]: tablaKey }));
    setResultados(null);
    const contenido = contenidos[nombreHoja];
    const destino = tablaKey ? getTablaExport(tablaKey) : null;
    if (tablaKey && contenido && destino) {
      setMapeos((prev) => ({
        ...prev,
        [tablaKey]: mapearAutomatico(contenido.cabeceras, destino),
      }));
    }
  };

  const cambiarDestino = (tablaKey: string, idx: number, columnaDestino: string | null) => {
    setMapeos((prev) => ({
      ...prev,
      [tablaKey]: (prev[tablaKey] ?? []).map((col, i) =>
        i === idx ? { ...col, columnaDestino } : col,
      ),
    }));
    setResultados(null);
  };

  const aplicarMapeoAutomatico = (tablaKey: string) => {
    const bloque = bloques.find((b) => b.tabla === tablaKey);
    const destino = getTablaExport(tablaKey);
    if (!bloque || !destino) return;
    setMapeos((prev) => ({ ...prev, [tablaKey]: mapearAutomatico(bloque.cabeceras, destino) }));
    setResultados(null);
  };

  const reiniciar = () => {
    setPaso(0);
    setTablasSel([]);
    setOrganizacion("hojas");
    limpiarArchivo();
    setImportando(false);
  };

  const ejecutarImportacion = async () => {
    if (bloques.length === 0 || totalValidas === 0) return;
    try {
      setImportando(true);
      setResultados(null);
      setProgreso({ procesadas: 0, total: totalFilas });
      const res = await importarBloques(bloques, empresaId, (procesadas, total) =>
        setProgreso({ procesadas, total }),
      );
      setResultados(res);

      const insertadas = res.reduce((suma, r) => suma + r.insertadas, 0);
      if (insertadas > 0) {
        const claves = new Set(res.flatMap((r) => CLAVES_INVALIDAR[r.tabla] ?? [r.tabla]));
        await Promise.all(
          [...claves].map((clave) => queryClient.invalidateQueries({ queryKey: [clave] })),
        );
      }
      const existentes = res.reduce((suma, r) => suma + r.existentes, 0);
      const fallidas = res.reduce((suma, r) => suma + r.errores, 0);
      messageApi.success(
        `Importación finalizada: ${insertadas} insertadas, ${existentes} ya existían y ${fallidas} con error`,
      );
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo importar el archivo");
    } finally {
      setImportando(false);
    }
  };

  // --- Vistas ---

  const filasInvalidas: FilaConTabla[] = validaciones.flatMap((v) =>
    v.preparacion
      .filter((fila) => fila.errores.length > 0)
      .map((fila) => ({ ...fila, tabla: v.bloque.tabla })),
  );

  const bloquePreview = bloques.find((b) => b.tabla === tablaPreview) ?? bloques[0] ?? null;
  const validacionPreview = validaciones.find((v) => v.bloque.tabla === bloquePreview?.tabla);

  const filasResultados: FilaResultado[] = (resultados ?? []).flatMap((r) =>
    r.resultados.map((fila) => ({ ...fila, tabla: r.tabla })),
  );

  const insertadas = resultados?.reduce((suma, r) => suma + r.insertadas, 0) ?? 0;
  const existentes = resultados?.reduce((suma, r) => suma + r.existentes, 0) ?? 0;
  const fallidas = resultados?.reduce((suma, r) => suma + r.errores, 0) ?? 0;
  const porcentaje =
    progreso.total > 0 ? Math.round((progreso.procesadas / progreso.total) * 100) : 0;

  const columnasMapeo = (bloque: BloqueUI): TableColumnsType<FilaColumna> => [
    {
      title: "Celda",
      key: "celda",
      width: 80,
      render: (_, fila) => <Tag color="geekblue">{nombreCelda(fila.indice)}</Tag>,
    },
    {
      title: "Cabecera en el archivo",
      key: "cabecera",
      render: (_, fila) => <Typography.Text code>{fila.cabecera}</Typography.Text>,
    },
    {
      title: "Columna destino (BD)",
      key: "destino",
      width: 260,
      render: (_, fila) => (
        <Select
          value={fila.columnaDestino ?? undefined}
          onChange={(valor) => cambiarDestino(bloque.tabla, fila.idx, valor ?? null)}
          style={{ width: "100%" }}
          allowClear
          placeholder="No importar"
          showSearch
          optionFilterProp="label"
          options={bloque.destino.columnas.map((col) => ({
            value: col.key,
            label: `${col.key} · ${col.etiqueta}`,
          }))}
          notFoundContent="Sin columnas disponibles"
        />
      ),
    },
    {
      title: "Tipo",
      key: "tipo",
      width: 110,
      render: (_, fila) => {
        const meta = bloque.destino.columnas.find((c) => c.key === fila.columnaDestino);
        if (!meta) return <span style={{ color: "#bfbfbf" }}>—</span>;
        return <Tag color={COLOR_TIPO[meta.tipo]}>{ETIQUETA_TIPO[meta.tipo]}</Tag>;
      },
    },
    {
      title: "Obligatoria",
      key: "requerida",
      width: 120,
      render: (_, fila) => {
        const meta = bloque.destino.columnas.find((c) => c.key === fila.columnaDestino);
        if (!meta) return <span style={{ color: "#bfbfbf" }}>—</span>;
        if (meta.fk) {
          return <Tag color="blue">Referencia</Tag>;
        }
        return meta.requerida ? <Tag color="red">Sí</Tag> : <Tag>No</Tag>;
      },
    },
  ];

  const columnasInvalidas: TableColumnsType<FilaConTabla> = [
    {
      title: "Tabla",
      dataIndex: "tabla",
      key: "tabla",
      width: 150,
      render: (valor: string) => <Tag>{etiquetaTabla(valor)}</Tag>,
    },
    { title: "Fila", dataIndex: "numero", key: "numero", width: 80 },
    {
      title: "Contenido",
      dataIndex: "resumen",
      key: "resumen",
      ellipsis: true,
      render: (valor: string) => valor || <span style={{ color: "#bfbfbf" }}>vacía</span>,
    },
    {
      title: "Problemas",
      dataIndex: "errores",
      key: "errores",
      render: (errores: string[]) => (
        <Space direction="vertical" size={2}>
          {errores.map((error) => (
            <span key={error} style={{ fontSize: 12, color: "#cf1322" }}>
              {error}
            </span>
          ))}
        </Space>
      ),
    },
  ];

  const columnasPreview = (mapeadas: ColumnaMapeada[]): TableColumnsType<FilaImportacion> => [
    { title: "Fila", dataIndex: "numero", key: "numero", width: 80 },
    ...mapeadas.map((col) => ({
      title: `${nombreCelda(col.indice)} → ${col.columnaDestino}`,
      key: col.columnaDestino,
      render: (_: unknown, fila: FilaImportacion) => {
        const valor = fila.valores[col.columnaDestino];
        if (valor === undefined || valor === null || valor === "") {
          return <span style={{ color: "#bfbfbf" }}>—</span>;
        }
        return String(valor);
      },
    })),
  ];

  const columnasResultados: TableColumnsType<FilaResultado> = [
    {
      title: "Tabla",
      dataIndex: "tabla",
      key: "tabla",
      width: 150,
      render: (valor: string) => <Tag>{etiquetaTabla(valor)}</Tag>,
    },
    { title: "Fila", dataIndex: "numero", key: "numero", width: 80 },
    {
      title: "Contenido",
      dataIndex: "resumen",
      key: "resumen",
      ellipsis: true,
      render: (valor: string) => valor || <span style={{ color: "#bfbfbf" }}>vacía</span>,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 130,
      render: (estado: FilaResultado["estado"]) =>
        estado === "ok" ? (
          <Tag color="green">Insertada</Tag>
        ) : estado === "existente" ? (
          <Tag color="orange">Ya existía</Tag>
        ) : (
          <Tag color="red">Con error</Tag>
        ),
    },
    {
      title: "Detalle",
      dataIndex: "mensaje",
      key: "mensaje",
      render: (mensaje: string) => <span style={{ fontSize: 12 }}>{mensaje}</span>,
    },
  ];

  const columnasResumen: TableColumnsType<ValidacionBloque> = [
    {
      title: "Tabla",
      key: "tabla",
      width: 220,
      render: (_, v) => (
        <>
          <Tag>{v.bloque.tabla}</Tag> {v.bloque.destino.etiqueta}
        </>
      ),
    },
    { title: "Hoja", key: "hoja", width: 180, render: (_, v) => v.bloque.hoja },
    { title: "Filas", key: "filas", width: 90, render: (_, v) => v.preparacion.length },
    {
      title: "Listas para importar",
      key: "validas",
      width: 160,
      render: (_, v) => <Tag color={v.validas > 0 ? "green" : "default"}>{v.validas}</Tag>,
    },
    {
      title: "Con problemas",
      key: "invalidas",
      width: 140,
      render: (_, v) => (v.invalidas > 0 ? <Tag color="red">{v.invalidas}</Tag> : <Tag>0</Tag>),
    },
  ];

  const columnasGrupos: TableColumnsType<FilaGrupo> = [
    {
      title: "Tabla",
      key: "tabla",
      render: (_, fila) => (
        <>
          {fila.etiqueta} <Tag>{fila.tabla}</Tag>
        </>
      ),
    },
    { title: "Filas", dataIndex: "filas", key: "filas", width: 100 },
  ];

  return (
    <div>
      {contextHolder}

      <Steps current={paso} size="small" items={PASOS.map((title) => ({ title }))} />

      <div style={{ marginTop: 24 }}>
        {paso === 0 && (
          <SelectorTablas
            value={tablasSel}
            onChange={seleccionarTablas}
            titulo="Seleccioná las tablas que vas a importar"
            descripcion="La primera fila de cada hoja debe tener las cabeceras (los nombres de las columnas, igual que en la plantilla)."
            nota={
              <Alert
                type="info"
                showIcon
                message="Lo que se completa solo"
                description={
                  <>
                    {requiereEmpresa ? "id_empresa se llena con la empresa seleccionada. " : ""}
                    Las columnas técnicas (id_…, created_at, updated_at) no hace falta traerlas. Las
                    referencias (id_etapa, id_lote…) se traen con la clave del registro referenciado
                    (su código o nombre) o, de respaldo, con el id numérico.
                  </>
                }
              />
            }
          />
        )}

        {paso === 1 && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <Typography.Text strong>¿Cómo está organizada la data?</Typography.Text>
              <div style={{ marginTop: 6 }}>
                <Radio.Group
                  value={organizacion}
                  onChange={(e) => cambiarOrganizacion(e.target.value as Organizacion)}
                  optionType="button"
                  buttonStyle="solid"
                  options={[
                    { label: "Una hoja por tabla", value: "hojas" },
                    { label: "Una sola hoja (columna «tabla»)", value: "una" },
                  ]}
                />
              </div>
              <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 4 }}>
                {organizacion === "hojas"
                  ? "Cada hoja trae los datos de una tabla. Si el nombre de la hoja coincide con el de la tabla, se asigna sola."
                  : "Todas las tablas están en una misma hoja: una columna «tabla» dice de cuál es cada fila."}
              </div>
            </div>

            <Upload
              accept=".xlsx,.xls,.csv"
              maxCount={1}
              showUploadList={false}
              beforeUpload={cargarArchivo}
            >
              <Button icon={<UploadOutlined />} loading={leyendo}>
                {archivo ? "Cambiar archivo" : "Elegir archivo"}
              </Button>
            </Upload>

            {archivo && (
              <Typography.Text>
                Archivo: <Typography.Text code>{archivo.nombre}</Typography.Text> · {hojas.length}{" "}
                hoja{hojas.length === 1 ? "" : "s"}
              </Typography.Text>
            )}

            {organizacion === "hojas" && archivo && (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Typography.Text strong>Asigná cada hoja a una tabla</Typography.Text>
                {hojas.map((nombre) => (
                  <div
                    key={nombre}
                    style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
                  >
                    <Tag style={{ minWidth: 150, marginInlineEnd: 0 }}>{nombre}</Tag>
                    <span style={{ color: "#8c8c8c", fontSize: 12 }}>
                      {contenidos[nombre]?.filas.length ?? 0} filas
                    </span>
                    <Select
                      style={{ flex: 1, minWidth: 240 }}
                      placeholder="Sin tabla (no se importa)"
                      allowClear
                      value={hojasAsignadas[nombre] ?? undefined}
                      onChange={(valor) => asignarHoja(nombre, valor ?? null)}
                      options={tablasSel.map((t) => {
                        const meta = getTablaExport(t);
                        const enOtraHoja = Object.entries(hojasAsignadas).some(
                          ([h, v]) => v === t && h !== nombre,
                        );
                        return {
                          value: t,
                          label: meta ? `${meta.etiqueta} · ${t}` : t,
                          disabled: enOtraHoja,
                        };
                      })}
                    />
                  </div>
                ))}

                {tablasSinHoja.length > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    message="Estas tablas no tienen hoja asignada"
                    description={`${tablasSinHoja.join(", ")} no se importarán. Asignalas a una hoja para incluirlas.`}
                  />
                )}
              </Space>
            )}

            {organizacion === "una" && archivo && (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                {hojas.length > 1 && (
                  <div>
                    <Typography.Text strong>Hoja con los datos</Typography.Text>
                    <Select
                      style={{ width: "100%", marginTop: 6 }}
                      value={hojaUnica ?? undefined}
                      onChange={cambiarHojaUnica}
                      options={hojas.map((h) => ({ value: h, label: h }))}
                    />
                  </div>
                )}

                {!agrupacion && hojaUnica && (
                  <Alert
                    type="error"
                    showIcon
                    message="Falta la columna «tabla»"
                    description="La hoja debe tener, en la fila de cabeceras, una columna llamada «tabla» y en cada fila el nombre de la tabla a la que pertenece el dato (proyectos, etapas, lotes…)."
                  />
                )}

                {agrupacion && (
                  <>
                    <Table<FilaGrupo>
                      size="small"
                      rowKey="tabla"
                      pagination={false}
                      dataSource={agrupacion.grupos.map((grupo) => ({
                        tabla: grupo.tabla,
                        etiqueta: getTablaExport(grupo.tabla)?.etiqueta ?? grupo.tabla,
                        filas: grupo.filas.length,
                      }))}
                      columns={columnasGrupos}
                    />
                    {agrupacion.grupos.length === 0 && (
                      <Alert
                        type="warning"
                        showIcon
                        message="Ninguna fila corresponde a las tablas seleccionadas"
                        description="Revisá los valores de la columna «tabla»."
                      />
                    )}
                    {agrupacion.desconocidos.length > 0 && (
                      <Alert
                        type="warning"
                        showIcon
                        message="Hay filas con una tabla desconocida"
                        description={agrupacion.desconocidos
                          .map((d) => `${d.valor}: ${d.cantidad} filas`)
                          .join(" · ")}
                      />
                    )}
                  </>
                )}
              </Space>
            )}

            {archivo && !filasDentroDeLimite && (
              <Alert
                type="error"
                showIcon
                message={`El archivo tiene ${totalFilas} filas`}
                description={`El límite es de ${LIMITE_FILAS} filas por importación: partí el archivo en varias cargas.`}
              />
            )}
          </Space>
        )}

        {paso === 2 && (
          <Space direction="vertical" size={24} style={{ width: "100%" }}>
            {validaciones.length === 0 && (
              <Alert
                type="warning"
                showIcon
                message="No hay datos para mapear"
                description="Volvé al paso anterior y asigná las hojas a las tablas."
              />
            )}

            {validaciones.map((v) => (
              <div key={v.bloque.tabla}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <Typography.Text strong>
                    {v.bloque.destino.etiqueta} <Tag>{v.bloque.tabla}</Tag> · hoja «{v.bloque.hoja}»
                    · {v.bloque.filas.length} filas
                  </Typography.Text>
                  <Button size="small" onClick={() => aplicarMapeoAutomatico(v.bloque.tabla)}>
                    Mapeo automático
                  </Button>
                </div>

                <Table<FilaColumna>
                  size="small"
                  rowKey={(fila) => `${fila.indice}-${fila.idx}`}
                  pagination={false}
                  dataSource={v.bloque.columnas.map((col, idx) => ({ ...col, idx }))}
                  columns={columnasMapeo(v.bloque)}
                  scroll={{ x: 900 }}
                />

                {v.faltantes.length > 0 && (
                  <Alert
                    type="warning"
                    showIcon
                    message={`Faltan columnas obligatorias en ${v.bloque.tabla}`}
                    description={`Estas columnas son obligatorias al insertar: ${v.faltantes
                      .map((col) => col.key)
                      .join(", ")}. Agregá las cabeceras correspondientes o mapealas.`}
                  />
                )}

                {v.repetidas.length > 0 && (
                  <Alert
                    type="error"
                    showIcon
                    message="Columnas repetidas"
                    description={`Cada cabecera debe apuntar a una sola columna de la tabla: ${v.repetidas.join(", ")}`}
                  />
                )}
              </div>
            ))}
          </Space>
        )}

        {paso === 3 && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Alert
              type="info"
              showIcon
              message="Resumen por tabla"
              description="Las tablas se insertan en orden de dependencia. Las referencias se resuelven por clave natural y las filas cuya clave ya existe en la base se omiten."
            />

            <Table<ValidacionBloque>
              size="small"
              rowKey={(v) => v.bloque.tabla}
              pagination={false}
              dataSource={validaciones}
              columns={columnasResumen}
            />

            {totalInvalidas > 0 && (
              <Table<FilaConTabla>
                size="small"
                rowKey={(fila) => `${fila.tabla}-${fila.numero}`}
                pagination={false}
                dataSource={filasInvalidas}
                columns={columnasInvalidas}
                scroll={{ x: 800 }}
              />
            )}

            {totalValidas === 0 && (
              <Alert
                type="error"
                showIcon
                message="No hay filas válidas para importar"
                description="Revisá las columnas obligatorias y los tipos de dato de cada tabla."
              />
            )}

            <div>
              <Typography.Text strong>Vista previa</Typography.Text>
              {bloques.length > 1 && (
                <Select
                  style={{ width: 320, marginLeft: 12 }}
                  value={bloquePreview?.tabla}
                  onChange={(valor) => setTablaPreview(valor)}
                  options={bloques.map((b) => ({
                    value: b.tabla,
                    label: `${b.destino.etiqueta} · ${b.tabla}`,
                  }))}
                />
              )}
            </div>

            {validacionPreview && (
              <Table<FilaImportacion>
                size="small"
                rowKey="numero"
                pagination={false}
                dataSource={validacionPreview.preparacion.slice(0, FILAS_VISTA_PREVIA)}
                columns={columnasPreview(validacionPreview.mapeadas)}
                scroll={{ x: true }}
              />
            )}
          </Space>
        )}

        {paso === 4 && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {resultados === null ? (
              <Alert
                type="info"
                showIcon
                message={`Se importarán ${totalValidas} filas en ${validaciones.length} tabla${validaciones.length === 1 ? "" : "s"}`}
                description="Primero se insertan las tablas padre (proyectos, etapas, manzanas…) y después las hijas, resolviendo cada referencia por su clave."
              />
            ) : (
              <>
                <Alert
                  type={fallidas > 0 ? "warning" : "success"}
                  showIcon
                  message={`Importación finalizada: ${insertadas} insertadas, ${existentes} ya existían, ${fallidas} con error`}
                  description={
                    <Space size={6} wrap>
                      {resultados.map((r) => (
                        <Tag key={r.tabla}>
                          {etiquetaTabla(r.tabla)}: {r.insertadas} nuevas, {r.existentes}{" "}
                          existentes, {r.errores} con error
                        </Tag>
                      ))}
                    </Space>
                  }
                />

                {filasResultados.length > 0 && (
                  <Table<FilaResultado>
                    size="small"
                    rowKey={(fila) => `${fila.tabla}-${fila.numero}`}
                    pagination={{ pageSize: 50, showSizeChanger: false }}
                    dataSource={filasResultados}
                    columns={columnasResultados}
                    scroll={{ x: 900 }}
                  />
                )}
              </>
            )}
          </Space>
        )}
      </div>

      {importando && (
        <div style={{ marginTop: 16 }}>
          <Progress percent={porcentaje} status="active" />
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Button
          icon={<LeftOutlined />}
          onClick={() => setPaso(paso - 1)}
          disabled={paso === 0 || importando}
        >
          Anterior
        </Button>

        <Space>
          <Button onClick={reiniciar} disabled={importando}>
            <ReloadOutlined /> Reiniciar
          </Button>
          {paso < PASOS.length - 1 ? (
            <Button
              type="primary"
              icon={<RightOutlined />}
              disabled={!puedeAvanzar}
              onClick={() => setPaso(paso + 1)}
            >
              Siguiente
            </Button>
          ) : (
            resultados === null && (
              <Button
                type="primary"
                icon={<ImportOutlined />}
                disabled={!puedeAvanzar || importando}
                loading={importando}
                onClick={() => void ejecutarImportacion()}
              >
                Importar {totalValidas} filas
              </Button>
            )
          )}
        </Space>
      </div>

      <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
        Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
        {tablasSel.length > 0
          ? ` · ${tablasSel.length} tabla${tablasSel.length === 1 ? "" : "s"}`
          : ""}
        {!puedeAvanzar && paso === 0
          ? requiereEmpresa && empresaId === null
            ? " · Seleccioná una empresa para importar en estas tablas"
            : " · Elegí al menos una tabla para continuar"
          : ""}
        {!puedeAvanzar && paso === 1 ? " · Cargá un archivo con filas de datos" : ""}
        {!puedeAvanzar && paso === 2 ? " · Revisá el mapeo de columnas de cada tabla" : ""}
        {!puedeAvanzar && paso === 3 ? " · No hay filas válidas para importar" : ""}
      </div>
    </div>
  );
}
