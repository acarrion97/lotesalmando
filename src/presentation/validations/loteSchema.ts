import { z } from "zod";

export const loteSchema = z.object({
  numero_lote: z.string().min(1, "Ingrese el numero de lote").max(50),
  id_manzana: z.number().min(1, "Seleccione una manzana"),
  precio_lista: z.number().positive("El precio debe ser mayor a 0"),
  superficie_m2: z.number().positive("La superficie debe ser mayor a 0").nullish(),
  codigo_catastral: z.string().max(50).nullish(),
  medidas: z.string().max(255).nullish(),
  estado: z.enum(["disponible", "reservado", "vendido", "en_negociacion", "bloqueado", "no_disponible"]),
});

export type LoteFormData = z.infer<typeof loteSchema>;
