import { DatePicker, Segmented, Space } from "antd";
import dayjs from "dayjs";
import { RANGO_SIN_FILTRO, rangoDelPreset, type PresetRango, type RangoFechas } from "@/utils";

const { RangePicker } = DatePicker;

export interface FiltroFechas {
  preset: PresetRango;
  rango: RangoFechas;
}

/** Sin filtro por defecto: la lista se ve completa hasta que el usuario elige un período. */
export const FILTRO_FECHAS_INICIAL: FiltroFechas = { preset: "todo", rango: RANGO_SIN_FILTRO };

const PRESETS: { label: string; value: PresetRango }[] = [
  { label: "Todo", value: "todo" },
  { label: "Mes actual", value: "mes-actual" },
  { label: "Mes pasado", value: "mes-pasado" },
  { label: "Últimos 30 días", value: "ultimos-30" },
  { label: "Este año", value: "anio" },
  { label: "Rango libre", value: "libre" },
];

interface FiltroRangoFechasProps {
  value: FiltroFechas;
  onChange: (siguiente: FiltroFechas) => void;
}

/**
 * Selector de período para Ventas: presets (mes actual, mes pasado, últimos 30
 * días, este año) más rango libre. Los presets se resuelven en la zona horaria
 * de la empresa; el filtro se aplica después en cliente sobre `created_at`.
 */
export function FiltroRangoFechas({ value, onChange }: FiltroRangoFechasProps) {
  const valorPicker: [dayjs.Dayjs, dayjs.Dayjs] | null =
    value.rango.desde && value.rango.hasta
      ? [dayjs(value.rango.desde, "YYYY-MM-DD"), dayjs(value.rango.hasta, "YYYY-MM-DD")]
      : null;

  return (
    <Space wrap>
      <Segmented
        options={PRESETS}
        value={value.preset}
        onChange={(preset) => {
          const siguiente = preset as PresetRango;
          onChange({
            preset: siguiente,
            rango: siguiente === "libre" ? value.rango : rangoDelPreset(siguiente),
          });
        }}
      />
      <RangePicker
        value={valorPicker}
        format="DD/MM/YYYY"
        allowClear
        placeholder={["Desde", "Hasta"]}
        onChange={(rango) => {
          if (!rango?.[0] || !rango?.[1]) {
            onChange({ preset: "todo", rango: RANGO_SIN_FILTRO });
            return;
          }
          onChange({
            preset: "libre",
            rango: { desde: rango[0].format("YYYY-MM-DD"), hasta: rango[1].format("YYYY-MM-DD") },
          });
        }}
      />
    </Space>
  );
}
