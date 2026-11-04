import { useMemo, useState } from "react";
import { Empty, Select, Space, Typography } from "antd";
import type { FilaPagoPorMesYForma } from "@/application/reportes/calcularReportes";

const COLORES = [
  "#1677ff",
  "#13c2c2",
  "#fa8c16",
  "#722ed1",
  "#eb2f96",
  "#52c41a",
  "#fa541c",
];

const formatoMonedaCompacta = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function GraficoPagosPorForma({ filas }: { filas: FilaPagoPorMesYForma[] }) {
  const [formasSeleccionadas, setFormasSeleccionadas] = useState<string[]>([]);
  const [mesesSeleccionados, setMesesSeleccionados] = useState<string[]>([]);

  const opciones = useMemo(() => {
    const formas = [...new Set(filas.map((fila) => fila.forma))].sort((a, b) =>
      a.localeCompare(b),
    );
    const meses = [...new Set(filas.map((fila) => fila.mes))].sort();
    return { formas, meses };
  }, [filas]);

  const series = useMemo(() => {
    const formasDisponiblesSeleccionadas = opciones.formas.filter((forma) =>
      formasSeleccionadas.includes(forma),
    );
    const mesesDisponiblesSeleccionados = opciones.meses.filter((mes) =>
      mesesSeleccionados.includes(mes),
    );
    const formasActivas = formasDisponiblesSeleccionadas.length
      ? formasDisponiblesSeleccionadas
      : opciones.formas;
    const mesesActivos = mesesDisponiblesSeleccionados.length
      ? mesesDisponiblesSeleccionados
      : opciones.meses;
    const montos = new Map<string, number>();
    for (const fila of filas) montos.set(`${fila.mes}\u0000${fila.forma}`, fila.monto);
    return {
      formas: formasActivas,
      meses: mesesActivos,
      monto: (mes: string, forma: string) => montos.get(`${mes}\u0000${forma}`) ?? 0,
      color: (forma: string) =>
        COLORES[Math.max(0, opciones.formas.indexOf(forma)) % COLORES.length],
    };
  }, [filas, formasSeleccionadas, mesesSeleccionados, opciones]);

  if (filas.length === 0) {
    return <Empty description="Sin pagos para graficar" style={{ margin: "24px 0" }} />;
  }

  const width = 860;
  const height = 340;
  const padding = { top: 20, right: 24, bottom: 56, left: 82 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxMonto = Math.max(0, ...series.formas.flatMap((forma) =>
    series.meses.map((mes) => series.monto(mes, forma)),
  ));
  const escala = maxMonto > 0 ? maxMonto : 1;
  const x = (index: number) =>
    padding.left +
    (series.meses.length <= 1 ? plotWidth / 2 : (index / (series.meses.length - 1)) * plotWidth);
  const y = (monto: number) => padding.top + plotHeight * (1 - monto / escala);
  const cantidadEtiquetas = Math.min(series.meses.length, 8);
  const intervaloEtiqueta = Math.max(1, Math.ceil(series.meses.length / cantidadEtiquetas));

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          mode="multiple"
          allowClear
          maxTagCount="responsive"
          placeholder="Todas las formas de pago"
          aria-label="Filtrar formas de pago del gráfico"
          value={formasSeleccionadas}
          onChange={setFormasSeleccionadas}
          options={opciones.formas.map((forma) => ({ value: forma, label: forma }))}
          style={{ minWidth: 240 }}
        />
        <Select
          mode="multiple"
          allowClear
          maxTagCount="responsive"
          placeholder="Todos los meses"
          aria-label="Filtrar meses del gráfico"
          value={mesesSeleccionados}
          onChange={setMesesSeleccionados}
          options={opciones.meses.map((mes) => ({ value: mes, label: mes }))}
          style={{ minWidth: 220 }}
        />
      </Space>

      {series.meses.length === 0 || series.formas.length === 0 ? (
        <Empty description="No hay datos para los filtros seleccionados" style={{ margin: "24px 0" }} />
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label="Montos mensuales recibidos por forma de pago"
              style={{ display: "block", width: "100%", minWidth: 560 }}
            >
              {Array.from({ length: 5 }, (_, index) => {
                const monto = (escala * (4 - index)) / 4;
                const posicionY = padding.top + (plotHeight * index) / 4;
                return (
                  <g key={index}>
                    <line
                      x1={padding.left}
                      x2={width - padding.right}
                      y1={posicionY}
                      y2={posicionY}
                      stroke="#e8e8e8"
                      strokeDasharray={index === 4 ? undefined : "4 4"}
                    />
                    <text
                      x={padding.left - 10}
                      y={posicionY + 4}
                      textAnchor="end"
                      fill="#8c8c8c"
                      fontSize="11"
                    >
                      {formatoMonedaCompacta.format(monto)}
                    </text>
                  </g>
                );
              })}

              {series.meses.map((mes, index) =>
                index % intervaloEtiqueta === 0 || index === series.meses.length - 1 ? (
                  <text
                    key={mes}
                    x={x(index)}
                    y={height - 24}
                    textAnchor="middle"
                    fill="#595959"
                    fontSize="11"
                  >
                    {mes}
                  </text>
                ) : null,
              )}

              {series.formas.map((forma) => {
                const color = series.color(forma);
                const puntos = series.meses.map((mes, index) => ({
                  mes,
                  monto: series.monto(mes, forma),
                  x: x(index),
                }));
                return (
                  <g key={forma}>
                    <polyline
                      points={puntos.map((punto) => `${punto.x},${y(punto.monto)}`).join(" ")}
                      fill="none"
                      stroke={color}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {puntos.map((punto) => (
                      <circle
                        key={punto.mes}
                        cx={punto.x}
                        cy={y(punto.monto)}
                        r="4"
                        fill={color}
                      >
                        <title>
                          {punto.mes} · {forma}: {formatoMonedaCompacta.format(punto.monto)}
                        </title>
                      </circle>
                    ))}
                  </g>
                );
              })}
            </svg>
          </div>
          <Space wrap style={{ marginTop: 8 }}>
            {series.formas.map((forma) => (
              <Space key={forma} size={6}>
                <span
                  aria-hidden
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: series.color(forma),
                  }}
                />
                <Typography.Text type="secondary">{forma}</Typography.Text>
              </Space>
            ))}
          </Space>
        </>
      )}
    </div>
  );
}
