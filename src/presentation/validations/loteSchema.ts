import { z } from "zod";

export const loteSchema = z.object({
  numero_lote: z.string().min(1, "Ingrese el numero de lote").max(50),
  id_manzana: z.number({ invalid_type_error: "Seleccione una manzana" }),
  precio_lista: z.number().positive("El precio debe ser mayor a 0"),
  estado: z.enum(["disponible", "reservado", "vendido", "en_negociacion", "bloqueado", "no_disponible"]),
});

export type LoteFormData = z.infer<typeof loteSchema>;
