import { Tag } from "antd";
import type { ComprobanteEstado } from "@/domain/comprobante/entities";

const ESTADOS: Record<ComprobanteEstado, { color: string; label: string }> = {
  pendiente: { color: "blue", label: "En revisión" },
  aprobado: { color: "green", label: "Aprobado" },
  rechazado: { color: "red", label: "Rechazado" },
};

/** Etiqueta del estado de un comprobante de pago. */
export function ComprobanteTag({ estado }: { estado: ComprobanteEstado }) {
  const info = ESTADOS[estado] ?? { color: "default", label: estado };
  return <Tag color={info.color}>{info.label}</Tag>;
}
