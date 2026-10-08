import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Modal,
  Progress,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import type { PlanoLote } from "@/domain/mapa/entities";
import type { PuntoPlano } from "@/domain/lote/entities";
import { getContainer } from "@/infrastructure/container";
import { compararNumeroLote } from "@/utils";
import {
  agruparEnBloques,
  centroide,
  detectarPoligonos,
  ordenarBloque,
  type ImagenRaster,
  type InicioNumeracion,
  type PatronNumeracion,
  type Punto,
  type PrimeraColumna,
} from "@/utils/mapas/detectarLotesPlano";

const { Text } = Typography;

const COLORES = [
  "#1677ff",
  "#52c41a",
  "#fa8c16",
  "#722ed1",
  "#eb2f96",
  "#13c2c2",
  "#a0d911",
  "#f5222d",
];
const LADO_MAXIMO = 2400;

interface Props {
  open: boolean;
  imagenUrl: string;
  /** Todos los lotes del proyecto (con o sin polígono). */
  lotes: PlanoLote[];
  onClose: () => void;
  /** Se llama después de guardar para refrescar el plano. */
  onGuardado: () => void;
}

interface Lectura {
  ancho: number;
  alto: number;
  poligonos: Punto[][];
  bloques: number[][];
}

async function leerImagen(
  url: string,
): Promise<{ raster: ImagenRaster; ancho: number; alto: number }> {
  const el = new Image();
  el.crossOrigin = "anonymous";
  await new Promise<void>((ok, fallo) => {
    el.onload = () => ok();
    el.onerror = () => fallo(new Error("No se pudo cargar la imagen del plano."));
    el.src = url;
  });
  const k = Math.min(1, LADO_MAXIMO / Math.max(el.naturalWidth, el.naturalHeight));
  const ancho = Math.round(el.naturalWidth * k);
  const alto = Math.round(el.naturalHeight * k);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("El navegador no permite procesar imágenes.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(el, 0, 0, ancho, alto);
  try {
    const d = ctx.getImageData(0, 0, ancho, alto);
    return { raster: { data: d.data, width: ancho, height: alto }, ancho, alto };
  } catch {
    throw new Error(
      "El navegador bloqueó la lectura de la imagen (permiso CORS del almacenamiento).",
    );
  }
}

const redondear = (p: Punto): PuntoPlano => [
  Math.round(p[0] * 10000) / 10000,
  Math.round(p[1] * 10000) / 10000,
];

/**
 * Detecta los lotes dibujados en la imagen del plano y los asigna a las
 * manzanas del proyecto según el orden de numeración elegido. Nada se guarda
 * hasta pulsar "Guardar". Debe montarse solo mientras está abierto.
 */
export function AsistentePoligonosModal({ open, imagenUrl, lotes, onClose, onGuardado }: Props) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [asignacion, setAsignacion] = useState<Record<number, number | undefined>>({});
  const [resaltado, setResaltado] = useState<number | null>(null);
  const [inicio, setInicio] = useState<InicioNumeracion>("superior");
  const [primeraColumna, setPrimeraColumna] = useState<PrimeraColumna>("derecha");
  const [patron, setPatron] = useState<PatronNumeracion>("u");
  const [sobrescribir, setSobrescribir] = useState(false);
  const [progreso, setProgreso] = useState<number | null>(null);

  useEffect(() => {
    // El componente se monta nuevo en cada apertura: el estado ya parte limpio.
    let vigente = true;
    leerImagen(imagenUrl)
      .then(({ raster, ancho, alto }) => {
        // Se cede el hilo para que se pinte el spinner antes del cálculo.
        setTimeout(() => {
          if (!vigente) return;
          const poligonos = detectarPoligonos(raster);
          const bloques = agruparEnBloques(poligonos).sort(
            (a, b) => centroide(poligonos[a[0]])[0] - centroide(poligonos[b[0]])[0],
          );
          setLectura({ ancho, alto, poligonos, bloques });
          setCargando(false);
        }, 30);
      })
      .catch((e) => {
        if (!vigente) return;
        setError(e instanceof Error ? e.message : "No se pudo analizar el plano.");
        setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [imagenUrl]);

  const manzanas = useMemo(() => {
    const m = new Map<number, { id: number; nombre: string; lotes: PlanoLote[] }>();
    for (const l of lotes) {
      const e = m.get(l.id_manzana) ?? { id: l.id_manzana, nombre: l.manzana, lotes: [] };
      e.lotes.push(l);
      m.set(l.id_manzana, e);
    }
    return [...m.values()]
      .map((e) => ({ ...e, lotes: [...e.lotes].sort(compararNumeroLote) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true }));
  }, [lotes]);

  /** Por bloque: pares lote↔polígono si la manzana tiene tantos lotes como se detectaron. */
  const planes = useMemo(() => {
    if (!lectura) return [];
    return lectura.bloques.map((indices, k) => {
      const manzana = manzanas.find((m) => m.id === asignacion[k]);
      if (!manzana)
        return {
          manzana: null,
          coincide: false,
          pares: [] as { lote: PlanoLote; poligono: Punto[] }[],
        };
      const orden = ordenarBloque(lectura.poligonos, indices, { inicio, primeraColumna, patron });
      const coincide = orden.length === manzana.lotes.length;
      return {
        manzana,
        coincide,
        pares: coincide
          ? orden.map((pi, n) => ({ lote: manzana.lotes[n], poligono: lectura.poligonos[pi] }))
          : [],
      };
    });
  }, [lectura, asignacion, manzanas, inicio, primeraColumna, patron]);

  const porGuardar = useMemo(
    () =>
      planes
        .flatMap((p) => p.pares)
        .filter((p) => sobrescribir || !p.lote.poligono || p.lote.poligono.length < 3),
    [planes, sobrescribir],
  );

  const guardar = async () => {
    setProgreso(0);
    let hechos = 0;
    let fallos = 0;
    const cola = [...porGuardar];
    const trabajador = async () => {
      for (let p = cola.shift(); p; p = cola.shift()) {
        try {
          await getContainer().guardarPoligonoLote.execute(
            p.lote.id_lote,
            p.poligono.map(redondear),
          );
        } catch {
          fallos++;
        }
        hechos++;
        setProgreso(Math.round((hechos / porGuardar.length) * 100));
      }
    };
    await Promise.all([trabajador(), trabajador(), trabajador(), trabajador()]);
    setProgreso(null);
    onGuardado();
    if (fallos) message.warning(`${hechos - fallos} lotes guardados, ${fallos} con error`);
    else message.success(`${hechos} lotes ubicados en el plano`);
    onClose();
  };

  const usadas = new Set(Object.values(asignacion).filter((v): v is number => v != null));

  return (
    <Modal
      open={open}
      onCancel={progreso === null ? onClose : undefined}
      width={1200}
      title="Detectar lotes automáticamente"
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={onClose} disabled={progreso !== null}>
            Cancelar
          </Button>
          <Button
            type="primary"
            disabled={!porGuardar.length}
            loading={progreso !== null}
            onClick={guardar}
          >
            Guardar {porGuardar.length ? `${porGuardar.length} lotes` : ""}
          </Button>
        </Space>
      }
    >
      {cargando && (
        <div style={{ textAlign: "center", padding: 80 }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Analizando el plano…</Text>
          </div>
        </div>
      )}
      {error && <Alert type="error" showIcon message={error} />}
      {lectura && !lectura.bloques.length && (
        <Alert
          type="warning"
          showIcon
          message="No se detectó ningún lote"
          description="El plano debe tener los lotes dibujados como cuadriláteros cerrados con línea gris o negra sobre fondo claro."
        />
      )}
      {lectura && lectura.bloques.length > 0 && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 560px", minWidth: 0 }}>
            <div style={{ position: "relative", lineHeight: 0, border: "1px solid #f0f0f0" }}>
              <img
                src={imagenUrl}
                alt="Plano"
                crossOrigin="anonymous"
                style={{ width: "100%", height: "auto" }}
              />
              <svg
                viewBox={`0 0 ${lectura.ancho} ${lectura.alto}`}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              >
                {lectura.bloques.map((indices, k) => {
                  const plan = planes[k];
                  const color = COLORES[k % COLORES.length];
                  const activo = resaltado === k;
                  return indices.map((pi) => {
                    const pts = lectura.poligonos[pi]
                      .map((p) => `${p[0] * lectura.ancho},${p[1] * lectura.alto}`)
                      .join(" ");
                    const par = plan.pares.find((x) => x.poligono === lectura.poligonos[pi]);
                    const [cx, cy] = centroide(lectura.poligonos[pi]);
                    return (
                      <g
                        key={`${k}-${pi}`}
                        onMouseEnter={() => setResaltado(k)}
                        onMouseLeave={() => setResaltado(null)}
                      >
                        <polygon
                          points={pts}
                          fill={color}
                          fillOpacity={activo ? 0.5 : plan.manzana ? 0.3 : 0.12}
                          stroke={plan.manzana && !plan.coincide ? "#f5222d" : color}
                          strokeWidth={activo ? 2.5 : 1.2}
                          strokeDasharray={plan.manzana && !plan.coincide ? "4 3" : undefined}
                        />
                        {par && (
                          <text
                            x={cx * lectura.ancho}
                            y={cy * lectura.alto}
                            fontSize={lectura.ancho / 150}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#111"
                            fontWeight={700}
                          >
                            {par.lote.numero_lote}
                          </text>
                        )}
                      </g>
                    );
                  });
                })}
              </svg>
            </div>
          </div>

          <div style={{ flex: "0 0 340px", maxWidth: "100%" }}>
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message={`${lectura.poligonos.length} lotes en ${lectura.bloques.length} bloques`}
              description="Elija a qué manzana corresponde cada bloque y compruebe en la vista previa que la numeración coincide."
            />
            <Space direction="vertical" size={8} style={{ width: "100%", marginBottom: 12 }}>
              <Select
                style={{ width: "100%" }}
                value={inicio}
                onChange={setInicio}
                options={[
                  { value: "superior", label: "El lote 1 está arriba" },
                  { value: "inferior", label: "El lote 1 está abajo" },
                ]}
              />
              <Select
                style={{ width: "100%" }}
                value={primeraColumna}
                onChange={setPrimeraColumna}
                options={[
                  { value: "derecha", label: "Empieza por la columna derecha" },
                  { value: "izquierda", label: "Empieza por la columna izquierda" },
                ]}
              />
              <Select
                style={{ width: "100%" }}
                value={patron}
                onChange={setPatron}
                options={[
                  { value: "u", label: "Baja por una columna y sube por la otra" },
                  { value: "paralelo", label: "Ambas columnas en el mismo sentido" },
                  { value: "alternado", label: "Por filas (1 y 2 enfrentados)" },
                ]}
              />
              <Checkbox checked={sobrescribir} onChange={(e) => setSobrescribir(e.target.checked)}>
                Reemplazar contornos que ya existen
              </Checkbox>
            </Space>

            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {lectura.bloques.map((indices, k) => {
                const plan = planes[k];
                return (
                  <div
                    key={k}
                    onMouseEnter={() => setResaltado(k)}
                    onMouseLeave={() => setResaltado(null)}
                    style={{ padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}
                  >
                    <Space style={{ marginBottom: 4 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: COLORES[k % COLORES.length],
                          display: "inline-block",
                        }}
                      />
                      <Text strong>Bloque {k + 1}</Text>
                      <Text type="secondary">{indices.length} lotes</Text>
                    </Space>
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      placeholder="Manzana"
                      style={{ width: "100%" }}
                      value={asignacion[k]}
                      onChange={(v) => setAsignacion((a) => ({ ...a, [k]: v }))}
                      options={manzanas.map((m) => ({
                        value: m.id,
                        label: `${m.nombre} (${m.lotes.length})`,
                        disabled: usadas.has(m.id) && asignacion[k] !== m.id,
                      }))}
                    />
                    {plan.manzana &&
                      (plan.coincide ? (
                        <Tag color="success" style={{ marginTop: 4 }}>
                          {plan.pares.length} lotes asignados
                        </Tag>
                      ) : (
                        <Tag color="error" style={{ marginTop: 4, whiteSpace: "normal" }}>
                          Se detectaron {indices.length} lotes y {plan.manzana.nombre} tiene{" "}
                          {plan.manzana.lotes.length}: no se puede asignar. Complételo con el dibujo
                          manual.
                        </Tag>
                      ))}
                  </div>
                );
              })}
            </div>
            {progreso !== null && <Progress percent={progreso} style={{ marginTop: 12 }} />}
          </div>
        </div>
      )}
    </Modal>
  );
}
