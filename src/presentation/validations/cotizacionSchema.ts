import { z } from "zod";

export const cotizacionSchema = z.object({
  id_cliente: z.number().min(1, "Seleccione un cliente"),
  id_lote: z.number().min(1, "Seleccione un lote"),
  precio_base: z.number().min(0, "Precio invalido"),
  descuento: z.number().min(0).max(100).optional().default(0),
  precio_final: z.number().min(0, "Precio invalido"),
  notas: z.string().max(1000).optional().default(""),
});

export type CotizacionFormData = z.infer<typeof cotizacionSchema>;
