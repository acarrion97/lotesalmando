import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Input,
  Radio,
  Row,
  Select,
  Space,
  Steps,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import {
  columnasObligatoriasFaltantes,
  columnasPorDefecto,
  ejemploColumna,
  getTablaExport,
} from "@/infrastructure/export/exportTableCatalog";
import type { MapeoColumna } from "@/infrastructure/export/exportTableCatalog";
import {
  generarPlantilla,
  hojasGeneradas,
  nombreArchivo,
  nombreCelda,
} from "@/infrastructure/export/generarPlantillaExportacion";
import type {
  FormatoPlantilla,
  OpcionesPlantilla,
} from "@/infrastructure/export/generarPlantillaExportacion";
import { SelectorTabla } from "./SelectorTabla";
import { COLOR_TIPO, ETIQUETA_TIPO } from "./tiposColumna";

const PASOS = ["Tabla destino", "Cabeceras", "Formato y hojas", "Descarga"];

interface FilaMapeo extends MapeoColumna {
  idx: number;
}

/** Wizard para generar la plantilla XLSX/CSV con las cabeceras de una tabla. */
export function PlantillaWizard() {
  const [messageApi, contextHolder] = message.useMessage();

  const [paso, setPaso] = useState(0);
  const [tablaSel, setTablaSel] = useState<string | null>(null);
  const [filas, setFilas] = useState<MapeoColumna[]>([]);
  const [porAgregar, setPorAgregar] = useState<string[]>([]);

  const [formato, setFormato] = useState<FormatoPlantilla>("xlsx");
  const [nombreHoja, setNombreHoja] = useState("Datos");
  const [incluirHojaGuia, setIncluirHojaGuia] = useState(false);
  const [hojaPrimera, setHojaPrimera] = useState<"datos" | "guia">("datos");
  const [incluirFilaEjemplo, setIncluirFilaEjemplo] = useState(true);
  const [separadorCsv, setSeparadorCsv] = useState(";");
  const [descargando, setDescargando] = useState(false);

  const tabla = getTablaExport(tablaSel);

  const opciones: OpcionesPlantilla | null = useMemo(() => {
    if (!tabla) return null;
    return {
      tabla,
      columnas: filas,
      formato,
      nombreHoja,
      incluirHojaGuia: formato === "xlsx" && incluirHojaGuia,
      hojaPrimera,
      incluirFilaEjemplo,
      separadorCsv,
    };
  }, [
    tabla,
    filas,
    formato,
    nombreHoja,
    incluirHojaGuia,
    hojaPrimera,
    incluirFilaEjemplo,
    separadorCsv,
  ]);

  const cabecerasVacias = filas.some((f) => !f.cabecera.trim());
  const repetidas = useMemo(() => {
    const vistas = new Set<string>();
    const dup = new Set<string>();
    filas.forEach((f) => {
      const clave = f.cabecera.trim().toLowerCase();
      if (vistas.has(clave)) dup.add(f.cabecera);
      vistas.add(clave);
    });
    return [...dup];
  }, [filas]);

  const faltantes = tabla ? columnasObligatoriasFaltantes(tabla, filas) : [];
  const columnasValidas = filas.length > 0 && !cabecerasVacias && repetidas.length === 0;
  const puedeAvanzar =
    paso === 0 ? Boolean(tabla) : paso === 1 ? columnasValidas && faltantes.length === 0 : true;

  const disponibles = useMemo(() => {
    if (!tabla) return [];
    const elegidas = new Set(filas.map((f) => f.columna));
    return tabla.columnas.filter((col) => !elegidas.has(col.key));
  }, [tabla, filas]);

  const seleccionarTabla = (valor: string | null) => {
    setTablaSel(valor);
    const siguiente = getTablaExport(valor);
    setFilas(siguiente ? columnasPorDefecto(siguiente) : []);
    setPorAgregar([]);
    setNombreHoja(siguiente?.tabla ?? "Datos");
    setPaso(0);
  };

  const actualizarCabecera = (idx: number, cabecera: string) => {
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, cabecera } : f)));
  };

  const cambiarColumnaDestino = (idx: number, columna: string) => {
    setFilas((prev) =>
      prev.map((f, i) => {
        if (i !== idx) return f;
        // La cabecera sigue a la columna salvo que el usuario la haya escrito a mano.
        const cabeceraIntacta = !f.cabecera.trim() || f.cabecera === f.columna;
        return { ...f, columna, cabecera: cabeceraIntacta ? columna : f.cabecera };
      }),
    );
  };

  const agregarColumnas = (claves: string[]) => {
    setFilas((prev) => [...prev, ...claves.map((columna) => ({ columna, cabecera: columna }))]);
    setPorAgregar([]);
  };

  const eliminarColumna = (idx: number) => {
    setFilas((prev) => prev.filter((_, i) => i !== idx));
  };

  const reiniciar = () => {
    setPaso(0);
    setTablaSel(null);
    setFilas([]);
    setPorAgregar([]);
    setFormato("xlsx");
    setNombreHoja("Datos");
    setIncluirHojaGuia(false);
    setHojaPrimera("datos");
    setIncluirFilaEjemplo(true);
    setSeparadorCsv(";");
  };

  const descargar = async () => {
    if (!opciones) return;
    try {
      setDescargando(true);
      const archivo = await generarPlantilla(opciones);
      messageApi.success(`Plantilla descargada: ${archivo}`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo generar la plantilla");
    } finally {
      setDescargando(false);
    }
  };

  // --- Vista previa ---
  const filasVista = useMemo(() => {
    if (!tabla) return [];
    const base = [
      { clave: "cabeceras", etiqueta: "Fila 1 · Cabeceras", valores: filas.map((f) => f.cabecera) },
    ];
    if (!incluirFilaEjemplo) return base;
    return [
      ...base,
      {
        clave: "ejemplo",
        etiqueta: "Fila 2 · Ejemplo",
        valores: filas.map((f) => ejemploColumna(tabla, f.columna)),
      },
    ];
  }, [tabla, filas, incluirFilaEjemplo]);

  const columnasMapeo: TableColumnsType<FilaMapeo> = [
    {
      title: "Celda",
      key: "celda",
      width: 80,
      render: (_, fila) => <Tag color="geekblue">{nombreCelda(fila.idx)}</Tag>,
    },
    {
      title: "Cabecera en el archivo",
      key: "cabecera",
      render: (_, fila) => (
        <Input
          value={fila.cabecera}
          onChange={(e) => actualizarCabecera(fila.idx, e.target.value)}
          placeholder="Nombre de la cabecera"
          status={fila.cabecera.trim() ? undefined : "error"}
        />
      ),
    },
    {
      title: "Columna destino (BD)",
      key: "destino",
      width: 240,
      render: (_, fila) => (
        <Select
          value={fila.columna}
          onChange={(valor) => cambiarColumnaDestino(fila.idx, valor)}
          style={{ width: "100%" }}
          showSearch
          optionFilterProp="label"
          options={(tabla?.columnas ?? []).map((col) => ({
            value: col.key,
            label: `${col.key} · ${col.etiqueta}`,
          }))}
        />
      ),
    },
    {
      title: "Tipo",
      key: "tipo",
      width: 110,
      render: (_, fila) => {
        const meta = tabla?.columnas.find((c) => c.key === fila.columna);
        if (!meta) return "—";
        return <Tag color={COLOR_TIPO[meta.tipo]}>{ETIQUETA_TIPO[meta.tipo]}</Tag>;
      },
    },
    {
      title: "Obligatoria",
      key: "requerida",
      width: 120,
      render: (_, fila) => {
        const meta = tabla?.columnas.find((c) => c.key === fila.columna);
        if (!meta) return "—";
        return meta.requerida ? (
          <Tooltip title="Columna obligatoria al insertar en la tabla">
            <Tag color="red">Sí</Tag>
          </Tooltip>
        ) : (
          <Tag>No</Tag>
        );
      },
    },
    {
      title: "",
      key: "acciones",
      width: 70,
      render: (_, fila) => {
        const meta = tabla?.columnas.find((c) => c.key === fila.columna);
        return (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => eliminarColumna(fila.idx)}
            title={meta?.nota ?? `Quitar ${fila.columna}`}
          />
        );
      },
    },
  ];

  const columnasVista: TableColumnsType<(typeof filasVista)[number]> = [
    {
      title: "Fila",
      dataIndex: "etiqueta",
      key: "etiqueta",
      width: 190,
      render: (valor: string) => <strong>{valor}</strong>,
    },
    ...filas.map((f, i) => ({
      title: `${nombreCelda(i)} · ${f.cabecera}`,
      key: `${f.columna}-${i}`,
      render: (_: unknown, fila: (typeof filasVista)[number]) =>
        fila.valores[i] ? fila.valores[i] : <span style={{ color: "#bfbfbf" }}>—</span>,
    })),
  ];

  return (
    <div>
      {contextHolder}

      <Steps current={paso} size="small" items={PASOS.map((title) => ({ title }))} />

      <div style={{ marginTop: 24 }}>
        {paso === 0 && (
          <SelectorTabla
            value={tablaSel}
            onChange={seleccionarTabla}
            titulo="Seleccioná la tabla de la base de datos destino"
            descripcion="Por defecto las cabeceras del archivo serán los nombres exactos de las columnas de esa tabla, tal como están en la base de datos."
          />
        )}

        {paso === 1 && tabla && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Row>
              <Col span={12}>
                <Typography.Text strong>Agregar columnas</Typography.Text>
                <Select
                  mode="multiple"
                  style={{ width: "100%", marginTop: 6 }}
                  placeholder="Agregar columnas de la tabla (incluye técnicas)"
                  value={porAgregar}
                  onChange={(valores) => agregarColumnas(valores as string[])}
                  options={disponibles.map((col) => ({
                    value: col.key,
                    label: `${col.key} · ${col.etiqueta}`,
                  }))}
                  notFoundContent="Todas las columnas ya están en la plantilla"
                />
              </Col>
            </Row>

            <Table<FilaMapeo>
              size="small"
              rowKey={(fila) => `${fila.columna}-${fila.idx}`}
              pagination={false}
              dataSource={filas.map((f, idx) => ({ ...f, idx }))}
              columns={columnasMapeo}
              scroll={{ x: 900 }}
            />

            {faltantes.length > 0 && (
              <Alert
                type="warning"
                showIcon
                message="Faltan columnas obligatorias"
                description={
                  <>
                    Estas columnas son obligatorias al insertar en {tabla.tabla}:{" "}
                    {faltantes.map((col) => col.key).join(", ")}. Agregalas para que la plantilla
                    pueda cargarse en la base de datos.
                  </>
                }
              />
            )}

            {repetidas.length > 0 && (
              <Alert
                type="error"
                showIcon
                message="Cabeceras repetidas"
                description={`Cada celda debe tener un nombre distinto. Revisá: ${repetidas.join(", ")}`}
              />
            )}

            {cabecerasVacias && (
              <Alert
                type="error"
                showIcon
                message="Hay cabeceras vacías"
                description="Completá todas las cabeceras."
              />
            )}

            <Alert
              type="info"
              showIcon
              message="Las cabeceras viajan en la fila 1"
              description="Cada celda (A, B, C...) queda emparejada con su columna de la tabla. El orden de la lista es el orden de las columnas en el archivo."
            />
          </Space>
        )}

        {paso === 2 && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <Typography.Text strong>Formato del archivo</Typography.Text>
              <div style={{ marginTop: 6 }}>
                <Radio.Group
                  value={formato}
                  onChange={(e) => setFormato(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  options={[
                    { label: "XLSX (Excel)", value: "xlsx" },
                    { label: "CSV (texto)", value: "csv" },
                  ]}
                />
              </div>
            </div>

            <div>
              <Typography.Text strong>Hoja de datos</Typography.Text>
              <div style={{ marginTop: 6 }}>
                <Input
                  value={nombreHoja}
                  onChange={(e) => setNombreHoja(e.target.value)}
                  placeholder="Nombre de la hoja"
                  style={{ maxWidth: 360 }}
                  disabled={formato === "csv"}
                  addonBefore="Hoja"
                />
              </div>
              {formato === "csv" && (
                <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 4 }}>
                  El CSV no admite hojas: se genera un único archivo con la hoja de datos.
                </div>
              )}
            </div>

            <div>
              <Typography.Text strong>Hoja opcional de ayuda</Typography.Text>
              <div style={{ marginTop: 6 }}>
                <Checkbox
                  checked={incluirHojaGuia}
                  disabled={formato === "csv"}
                  onChange={(e) => setIncluirHojaGuia(e.target.checked)}
                >
                  Agregar la hoja «Guía de columnas» (explica cada cabecera, tipo y ejemplo)
                </Checkbox>
              </div>
              <div style={{ marginTop: 6 }}>
                <Radio.Group
                  value={hojaPrimera}
                  onChange={(e) => setHojaPrimera(e.target.value)}
                  disabled={formato === "csv" || !incluirHojaGuia}
                  options={[
                    { label: "Abrir primero la hoja de datos", value: "datos" },
                    { label: "Abrir primero la guía", value: "guia" },
                  ]}
                />
              </div>
            </div>

            <div>
              <Typography.Text strong>Separador del CSV</Typography.Text>
              <div style={{ marginTop: 6 }}>
                <Radio.Group
                  value={separadorCsv}
                  onChange={(e) => setSeparadorCsv(e.target.value)}
                  disabled={formato !== "csv"}
                  optionType="button"
                  options={[
                    { label: "Punto y coma (;)", value: ";" },
                    { label: "Coma (,)", value: "," },
                  ]}
                />
              </div>
              <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 4 }}>
                Usá punto y coma si abrís el CSV con Excel en español.
              </div>
            </div>

            <div>
              <Typography.Text strong>Fila de ejemplo</Typography.Text>
              <div style={{ marginTop: 6 }}>
                <Switch
                  checked={incluirFilaEjemplo}
                  onChange={setIncluirFilaEjemplo}
                  checkedChildren="Sí"
                  unCheckedChildren="No"
                />{" "}
                <span style={{ fontSize: 13 }}>
                  Incluir una segunda fila con valores de ejemplo (se borra antes de cargar).
                </span>
              </div>
            </div>
          </Space>
        )}

        {paso === 3 && tabla && opciones && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Alert
              type="success"
              showIcon
              icon={<FileExcelOutlined />}
              message={`Plantilla para ${tabla.etiqueta}`}
              description={
                <Space direction="vertical" size={4} style={{ width: "100%" }}>
                  <span>
                    Archivo: <Typography.Text code>{nombreArchivo(opciones)}</Typography.Text>
                  </span>
                  <span>
                    Tabla destino: <Typography.Text code>{tabla.tabla}</Typography.Text> ·{" "}
                    {filas.length} columna{filas.length === 1 ? "" : "s"} · {formato.toUpperCase()}
                  </span>
                  <span>
                    Hojas:{" "}
                    <Space size={4} wrap>
                      {hojasGeneradas(opciones).map((hoja, i) => (
                        <Tag key={hoja.nombre} color={i === 0 ? "blue" : "default"}>
                          {hoja.nombre}
                          {i === 0 && formato === "xlsx" ? " (se abre primero)" : ""}
                        </Tag>
                      ))}
                    </Space>
                  </span>
                </Space>
              }
            />

            <Table
              size="small"
              rowKey="clave"
              pagination={false}
              dataSource={filasVista}
              columns={columnasVista}
              scroll={{ x: true }}
            />

            <div style={{ color: "#8c8c8c", fontSize: 12 }}>
              La fila 1 es obligatoria: respeta esos nombres exactos al llenar el archivo. Podés
              borrar la fila de ejemplo antes de guardarlo.
            </div>
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
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              disabled={!puedeAvanzar}
              loading={descargando}
              onClick={descargar}
            >
              Descargar plantilla
            </Button>
          )}
        </Space>
      </div>

      <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>
        Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
        {tabla ? ` · ${tabla.tabla}` : ""}
        {!puedeAvanzar && paso === 0 ? " · Elegí una tabla para continuar" : ""}
        {!puedeAvanzar && paso === 1 ? " · Revisá las cabeceras y las columnas obligatorias" : ""}
      </div>
    </div>
  );
}
