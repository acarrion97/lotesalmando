import { Typography } from "antd";
import { formatDateOnly } from "@/utils";
import type { FiltroFechas } from "./FiltroRangoFechas";

const { Text } = Typography;

interface ResumenRangoFechasProps {
  filtro: FiltroFechas;
  /** Cantidad de filas dentro del rango, y como se llaman en singular/plural. */
  cantidad: number;
  singular: string;
  plural: string;
}

/** Linea "Periodo: desde - hasta - N <filas> en el rango"; no se dibuja sin filtro. */
export function ResumenRangoFechas({ filtro, cantidad, singular, plural }: ResumenRangoFechasProps) {
  const { desde, hasta } = filtro.rango;
  if (!desde && !hasta) return null;
  return (
    <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
      Período: {desde ? formatDateOnly(desde) : "…"} — {hasta ? formatDateOnly(hasta) : "…"}
      {" · "}
      {cantidad} {cantidad === 1 ? singular : plural} en el rango
    </Text>
  );
}
