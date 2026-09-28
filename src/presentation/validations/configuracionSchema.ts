import { z } from "zod";

export const configuracionSchema = z.object({
  moneda: z.string().min(3, "Seleccione la moneda").max(10, "Código de moneda no válido"),
  idioma: z.string().min(1, "Seleccione el idioma").max(10, "Código de idioma no válido"),
});

export type ConfiguracionFormData = z.infer<typeof configuracionSchema>;
