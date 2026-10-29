import type { LoteEstado } from "@/domain/lote/entities";

export const ESTILO_ESTADO_PLANO: Record<
  LoteEstado,
  { color: string; fillOpacity: number; label: string }
> = {
  disponible: { color: "#52c41a", fillOpacity: 0, label: "Disponible" },
  reservado: { color: "#faad14", fillOpacity: 0.6, label: "Reservado" },
  en_negociacion: { color: "#1677ff", fillOpacity: 0.55, label: "En negociación" },
  vendido: { color: "#8b1a1a", fillOpacity: 0.72, label: "Vendido" },
  bloqueado: { color: "#595959", fillOpacity: 0.6, label: "Bloqueado" },
  no_disponible: { color: "#595959", fillOpacity: 0.6, label: "No disponible" },
};
