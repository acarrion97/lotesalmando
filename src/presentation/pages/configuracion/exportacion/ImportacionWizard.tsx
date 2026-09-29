import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Progress,
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
} from "@/infrastructure/export/exportTableCatalog";
import type { MapeoColumna } from "@/infrastructure/export/exportTableCatalog";
import {
  esArchivoSoportado,
  leerArchivo,
  leerHoja,
  mapearAutomatico,
} from "@/infrastructure/export/leerArchivoImportacion";
import type {
  ArchivoLeido,
  ColumnaArchivo,
  ContenidoHoja,
} from "@/infrastructure/export/leerArchivoImportacion";
import {
  CLAVES_INVALIDAR,
  insertarFilas,
  prepararFilas,
} from "@/infrastructure/export/importarFilas";
import type { FilaImportacion, ResultadoFila } from "@/infrastructure/export/importarFilas";
import { nombreCelda } from "@/infrastructure/export/generarPlantillaExportacion";
import { SelectorTabla } from "./SelectorTabla";
import { COLOR_TIPO, ETIQUETA_TIPO } from "./tiposColumna";

const PASOS = ["Tabla destino", "Archivo", "Mapeo de columnas", "Revisión", "Importación"];

/** Tope de filas por importación; por encima se pide partir el archivo. */
const LIMITE_FILAS = 10000;
const FILAS_VISTA_PREVIA = 10;

type ColumnaMapeada = ColumnaArchivo & { columnaDestino: string };

interface FilaColumna extends ColumnaArchivo {
  idx: number;
}

/** Wizard que lee un XLSX/CSV y carga sus filas en la tabla elegida. */
export function ImportacionWizard() {
  const [messageApi, contextHolder] = message.useMessage();
  const { empresaActual } = useEmpresa();
  const queryClient = useQueryClient();

  const [paso, setPaso] = useState(0);
  const [tablaSel, setTablaSel] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<ArchivoLeido | null>(null);
  const [hoja, setHoja] = useState<string | null>(null);
  const [contenido, setContenido] = useState<ContenidoHoja | null>(null);
  const [columnas, setColumnas] = useState<ColumnaArchivo[]>([]);
  const [leyendo, setLeyendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState({ procesadas: 0, total: 0 });
  const [resultados, setResultados] = useState<ResultadoFila[] | null>(null);

  const tabla = getTablaExport(tablaSel);
  const empresaId = empresaActual?.id_empresa ?? null;
  const requiereEmpresa = Boolean(tabla?.columnas.some((col) => col.empresaActual));

  const mapeadas = useMemo(
    () =>
      columnas.filter(
        (col): col is ColumnaMapeada => col.columnaDestino !== null && Boolean(col.columnaDestino),
      ),
    [columnas],
  );

  const mapeo: MapeoColumna[] = mapeadas.map((col) => ({
    columna: col.columnaDestino,
    cabecera: col.cabecera,
  }));

  const faltantes = tabla ? columnasObligatoriasFaltantes(tabla, mapeo) : [];
  const destinosRepetidos = useMemo(() => {
    const vistas = new Set<string>();
    const dup = new Set<string>();
    mapeadas.forEach((col) => {
      if (vistas.has(col.columnaDestino)) dup.add(col.columnaDestino);
      vistas.add(col.columnaDestino);
    });
    return [...dup];
  }, [mapeadas]);

  const preparacion = useMemo(() => {
    const destino = getTablaExport(tablaSel);
    if (!destino || !contenido) return [];
    return prepararFilas(destino, columnas, contenido.filas, empresaId);
  }, [tablaSel, contenido, columnas, empresaId]);

  const validas = useMemo(() => preparacion.filter((f) => f.errores.length === 0), [preparacion]);
  const invalidas = useMemo(() => preparacion.filter((f) => f.errores.length > 0), [preparacion]);

  const mapeoValido =
    mapeadas.length > 0 && destinosRepetidos.length === 0 && faltantes.length === 0;
  const filasDentroDeLimite = (contenido?.filas.length ?? 0) <= LIMITE_FILAS;

  const puedeAvanzar =
    paso === 0
      ? Boolean(tabla) && (!requiereEmpresa || empresaId !== null)
      : paso === 1
        ? Boolean(archivo && hoja && contenido && contenido.filas.length > 0 && filasDentroDeLimite)
        : paso === 2
          ? mapeoValido
          : paso === 3
            ? validas.length > 0
            : true;

  const seleccionarTabla = (valor: string | null) => {
    setTablaSel(valor);
    setArchivo(null);
    setHoja(null);
    setContenido(null);
    setColumnas([]);
    setResultados(null);
    setProgreso({ procesadas: 0, total: 0 });
    setPaso(0);
  };

  const aplicarHoja = async (archivoActual: ArchivoLeido, nombreHoja: string, tablaKey: string) => {
    const destino = getTablaExport(tablaKey);
    if (!destino) return;
    const leido = await leerHoja(archivoActual, nombreHoja);
    setHoja(nombreHoja);
    setContenido(leido);
    setColumnas(mapearAutomatico(leido.cabeceras, destino));
    setResultados(null);
  };

  const cargarArchivo = async (file: File) => {
    if (!tabla) return Upload.LIST_IGNORE;
    if (!esArchivoSoportado(file)) {
      messageApi.error("Formato no admitido: usá un archivo .xlsx, .xls o .csv");
      return Upload.LIST_IGNORE;
    }
    try {
      setLeyendo(true);
      const leido = await leerArchivo(file);
      setArchivo(leido);
      setResultados(null);
      await aplicarHoja(leido, leido.workbook.SheetNames[0], tabla.tabla);
      messageApi.success(`Archivo cargado: ${leido.nombre}`);
    } catch (error) {
      setArchivo(null);
      setContenido(null);
      setColumnas([]);
      messageApi.error(error instanceof Error ? error.message : "No se pudo leer el archivo");
    } finally {
      setLeyendo(false);
    }
    return Upload.LIST_IGNORE;
  };

  const cambiarDestino = (idx: number, columnaDestino: string | null) => {
    setColumnas((prev) => prev.map((col, i) => (i === idx ? { ...col, columnaDestino } : col)));
    setResultados(null);
  };

  const aplicarMapeoAutomatico = () => {
    if (!tabla || !contenido) return;
    setColumnas(mapearAutomatico(contenido.cabeceras, tabla));
    setResultados(null);
  };

  const reiniciar = () => {
    setPaso(0);
    setTablaSel(null);
    setArchivo(null);
    setHoja(null);
    setContenido(null);
    setColumnas([]);
    setResultados(null);
    setProgreso({ procesadas: 0, total: 0 });
    setImportando(false);
  };

  const ejecutarImportacion = async () => {
    if (!tabla || validas.length === 0) return;
    try {
      setImportando(true);
      setResultados(null);
      setProgreso({ procesadas: 0, total: validas.length });
      const res = await insertarFilas(tabla.tabla, validas, (procesadas, total) =>
        setProgreso({ procesadas, total }),
      );
      setResultados(res);

      const insertadas = res.filter((r) => r.estado === "ok").length;
      if (insertadas > 0) {
        const claves = CLAVES_INVALIDAR[tabla.tabla] ?? [tabla.tabla];
        await Promise.all(
          claves.map((clave) => queryClient.invalidateQueries({ queryKey: [clave] })),
        );
      }
      messageApi.success(
        `Importación finalizada: ${insertadas} de ${res.length} filas insertadas en ${tabla.tabla}`,
      );
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo importar el archivo");
    } finally {
      setImportando(false);
    }
  };

  // --- Columnas de las tablas de las distintas vistas ---
  const columnasArchivo: TableColumnsType<FilaColumna> = [
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
          onChange={(valor) => cambiarDestino(fila.idx, valor ?? null)}
          style={{ width: "100%" }}
          allowClear
          placeholder="No importar"
          showSearch
          optionFilterProp="label"
          options={(tabla?.columnas ?? []).map((col) => ({
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
        const meta = tabla?.columnas.find((c) => c.key === fila.columnaDestino);
        if (!meta) return <span style={{ color: "#bfbfbf" }}>—</span>;
        return <Tag color={COLOR_TIPO[meta.tipo]}>{ETIQUETA_TIPO[meta.tipo]}</Tag>;
      },
    },
    {
      title: "Obligatoria",
      key: "requerida",
      width: 120,
      render: (_, fila) => {
        const meta = tabla?.columnas.find((c) => c.key === fila.columnaDestino);
        if (!meta) return "—";
        return meta.requerida ? <Tag color="red">Sí</Tag> : <Tag>No</Tag>;
      },
    },
  ];

  const columnasInvalidas: TableColumnsType<FilaImportacion> = [
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

  const columnasPreview: TableColumnsType<FilaImportacion> = [
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

  const columnasResultados: TableColumnsType<ResultadoFila> = [
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
      width: 120,
      render: (estado: ResultadoFila["estado"]) =>
        estado === "ok" ? <Tag color="green">Insertada</Tag> : <Tag color="red">Con error</Tag>,
    },
    {
      title: "Detalle",
      dataIndex: "mensaje",
      key: "mensaje",
      render: (mensaje: string) => <span style={{ fontSize: 12 }}>{mensaje}</span>,
    },
  ];

  const insertadas = resultados?.filter((r) => r.estado === "ok").length ?? 0;
  const fallidas = resultados ? resultados.length - insertadas : 0;
  const porcentaje =
    progreso.total > 0 ? Math.round((progreso.procesadas / progreso.total) * 100) : 0;

  return (
    <div>
      {contextHolder}

      <Steps current={paso} size="small" items={PASOS.map((title) => ({ title }))} />

      <div style={{ marginTop: 24 }}>
        {paso === 0 && (
          <SelectorTabla
            value={tablaSel}
            onChange={seleccionarTabla}
            titulo="Seleccioná la tabla donde se cargarán los datos"
            descripcion="La primera fila del archivo debe tener las cabeceras (los nombres de las columnas, igual que en la plantilla)."
            nota={
              <Alert
                type="info"
                showIcon
                message="Lo que se completa solo"
                description={
                  <>
                    {requiereEmpresa ? "id_empresa se llena con la empresa seleccionada. " : ""}
                    Las columnas técnicas (id_…, created_at, updated_at) no hace falta traerlas, y
                    los id de referencia (id_manzana, id_cliente…) deben existir ya en la base de
                    datos.
                  </>
                }
              />
            }
          />
        )}

        {paso === 1 && tabla && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <Typography.Text strong>Archivo a importar</Typography.Text>
              <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 4 }}>
                Formatos admitidos: .xlsx, .xls y .csv · máximo 10 MB. El archivo se procesa en tu
                navegador: nunca sale de tu equipo hasta que apretes “Importar”.
              </div>
            </div>

            <Space wrap>
              <Upload
                accept=".xlsx,.xls,.csv"
                showUploadList={false}
                beforeUpload={(file) => {
                  void cargarArchivo(file);
                  return Upload.LIST_IGNORE;
                }}
              >
                <Button icon={<UploadOutlined />} loading={leyendo} disabled={importando}>
                  {archivo ? "Cambiar de archivo" : "Seleccionar archivo"}
                </Button>
              </Upload>
              {archivo && (
                <Typography.Text type="secondary">
                  {archivo.nombre} · {contenido ? `${contenido.filas.length} filas` : "leyendo…"}
                </Typography.Text>
              )}
            </Space>

            {archivo && archivo.workbook.SheetNames.length > 1 && (
              <div>
                <Typography.Text strong>Hoja del archivo</Typography.Text>
                <div style={{ marginTop: 6 }}>
                  <Select
                    style={{ width: "100%", maxWidth: 420 }}
                    value={hoja}
                    showSearch
                    optionFilterProp="label"
                    options={archivo.workbook.SheetNames.map((nombre) => ({
                      value: nombre,
                      label: nombre,
                    }))}
                    onChange={(nombre) => {
                      void aplicarHoja(archivo, nombre, tabla.tabla);
                    }}
                  />
                </div>
                <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 4 }}>
                  El archivo tiene {archivo.workbook.SheetNames.length} hojas: elegí cuál se carga.
                </div>
              </div>
            )}

            {contenido && (
              <Alert
                type="success"
                showIcon
                message={`Hoja “${hoja}”: ${contenido.cabeceras.length} columnas y ${contenido.filas.length} filas`}
                description={
                  <Space direction="vertical" size={8} style={{ width: "100%" }}>
                    <Space wrap>
                      {contenido.cabeceras.slice(0, 30).map((cabecera, i) => (
                        <Tag key={`${cabecera}-${i}`}>{cabecera}</Tag>
                      ))}
                      {contenido.cabeceras.length > 30 && (
                        <Tag>+{contenido.cabeceras.length - 30} más</Tag>
                      )}
                    </Space>
                    {!filasDentroDeLimite && (
                      <span style={{ color: "#cf1322" }}>
                        El archivo tiene {contenido.filas.length} filas (máximo {LIMITE_FILAS}).
                        Partilo en varios archivos para importarlo.
                      </span>
                    )}
                    {contenido.filas.length === 0 && (
                      <span style={{ color: "#cf1322" }}>La hoja no tiene filas de datos.</span>
                    )}
                  </Space>
                }
              />
            )}
          </Space>
        )}

        {paso === 2 && tabla && contenido && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div>
                <Typography.Text strong>¿A qué columna va cada celda?</Typography.Text>
                <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 4 }}>
                  El mapeo se hace solo por el nombre de la cabecera; podés cambiarlo o dejar
                  columnas fuera con la opción “No importar”.
                </div>
              </div>
              <Button icon={<ReloadOutlined />} onClick={aplicarMapeoAutomatico}>
                Volver a mapear automáticamente
              </Button>
            </div>

            <Table<FilaColumna>
              size="small"
              rowKey={(fila) => `${fila.indice}`}
              pagination={false}
              dataSource={columnas.map((col, idx) => ({ ...col, idx }))}
              columns={columnasArchivo}
              scroll={{ x: 900 }}
            />

            {mapeadas.length === 0 && (
              <Alert
                type="error"
                showIcon
                message="Ninguna columna está mapeada"
                description="Elegí al menos una columna destino para poder importar."
              />
            )}

            {faltantes.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="Faltan columnas obligatorias"
                description={
                  <>
                    Mapeá también {faltantes.map((col) => col.key).join(", ")} o la base de datos
                    rechazará las filas.
                  </>
                }
              />
            )}

            {destinosRepetidos.length > 0 && (
              <Alert
                type="error"
                showIcon
                message="Dos celdas van a la misma columna"
                description={`Cada columna de la tabla puede recibir una sola celda: ${destinosRepetidos.join(", ")}`}
              />
            )}
          </Space>
        )}

        {paso === 3 && tabla && contenido && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Alert
              type={invalidas.length > 0 ? "warning" : "success"}
              showIcon
              message={`${validas.length} de ${preparacion.length} filas listas para importar`}
              description={
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <span>
                    Tabla: <Typography.Text code>{tabla.tabla}</Typography.Text> · {mapeadas.length}{" "}
                    columna{mapeadas.length === 1 ? "" : "s"} mapeada
                    {mapeadas.length === 1 ? "" : "s"}
                    {empresaId !== null && requiereEmpresa ? ` · empresa ${empresaId}` : ""}
                  </span>
                  {invalidas.length > 0 && (
                    <span>
                      Las {invalidas.length} filas con problemas se omiten; el resto se importa.
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: "#8c8c8c" }}>
                    Números: acepta 1234.56 o 1.234,56 · Fechas: AAAA-MM-DD · Las columnas de
                    referencia (id_…) deben existir en la base de datos.
                  </span>
                </Space>
              }
            />

            {invalidas.length > 0 && (
              <div>
                <Typography.Text strong>Filas que se van a omitir</Typography.Text>
                <Table<FilaImportacion>
                  style={{ marginTop: 6 }}
                  size="small"
                  rowKey="numero"
                  dataSource={invalidas}
                  columns={columnasInvalidas}
                  pagination={{ pageSize: 5, showSizeChanger: false }}
                  scroll={{ x: 700 }}
                />
              </div>
            )}

            <div>
              <Typography.Text strong>
                Vista previa de las primeras {Math.min(FILAS_VISTA_PREVIA, validas.length)} filas a
                importar
              </Typography.Text>
              <Table<FilaImportacion>
                style={{ marginTop: 6 }}
                size="small"
                rowKey="numero"
                dataSource={validas.slice(0, FILAS_VISTA_PREVIA)}
                columns={columnasPreview}
                pagination={false}
                scroll={{ x: true }}
              />
            </div>
          </Space>
        )}

        {paso === 4 && tabla && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {resultados === null ? (
              <>
                <Alert
                  type="info"
                  showIcon
                  icon={<ImportOutlined />}
                  message={`A punto de importar ${validas.length} filas en ${tabla.tabla}`}
                  description={
                    <>
                      Se insertan en lotes de 100; si un lote falla se reintenta fila por fila para
                      informarte exactamente cuál dio error.
                      {invalidas.length > 0 &&
                        ` Las ${invalidas.length} filas inválidas no se envían.`}
                    </>
                  }
                />
                {importando && (
                  <div>
                    <Progress
                      percent={porcentaje}
                      status="active"
                      format={() => `${progreso.procesadas}/${progreso.total}`}
                    />
                    <div style={{ color: "#8c8c8c", fontSize: 12 }}>Insertando filas…</div>
                  </div>
                )}
              </>
            ) : (
              <>
                <Alert
                  type={fallidas > 0 ? "warning" : "success"}
                  showIcon
                  message={`${insertadas} filas insertadas${fallidas > 0 ? ` · ${fallidas} con error` : ""}`}
                  description={
                    <Space wrap>
                      <span>
                        Tabla: <Typography.Text code>{tabla.tabla}</Typography.Text>
                      </span>
                      <Button
                        size="small"
                        icon={<ImportOutlined />}
                        onClick={() => void ejecutarImportacion()}
                        disabled={importando}
                      >
                        Importar de nuevo
                      </Button>
                      <Button size="small" onClick={reiniciar}>
                        Empezar de nuevo
                      </Button>
                    </Space>
                  }
                />
                <Table<ResultadoFila>
                  size="small"
                  rowKey="numero"
                  dataSource={resultados}
                  columns={columnasResultados}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  scroll={{ x: 700 }}
                />
              </>
            )}
          </Space>
        )}
      </div>

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
        <Button icon={<LeftOutlined />} onClick={() => setPaso(paso - 1)} disabled={paso === 0}>
          Anterior
        </Button>

        <Space>
          <Button onClick={reiniciar}>Reiniciar</Button>
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
                Importar {validas.length} filas
              </Button>
            )
          )}
        </Space>
      </div>

      <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
        Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
        {tabla ? ` · ${tabla.tabla}` : ""}
        {!puedeAvanzar && paso === 0
          ? requiereEmpresa && empresaId === null
            ? " · Seleccioná una empresa para importar en esta tabla"
            : " · Elegí una tabla para continuar"
          : ""}
        {!puedeAvanzar && paso === 1 ? " · Cargá un archivo con filas de datos" : ""}
        {!puedeAvanzar && paso === 2 ? " · Revisá el mapeo de columnas" : ""}
        {!puedeAvanzar && paso === 3 ? " · No hay filas válidas para importar" : ""}
      </div>
    </div>
  );
}
