import { z } from "zod";

export const configuracionSchema = z.object({
  moneda: z.string().min(3, "Seleccione la moneda").max(10, "Código de moneda no válido"),
  idioma: z.string().min(1, "Seleccione el idioma").max(10, "Código de idioma no válido"),
  dias_aviso_cuota: z
    .number()
    .int("Ingrese un número entero de días")
    .min(1, "El mínimo es 1 día")
    .max(30, "El máximo es 30 días"),
  // El RUC no se guarda en `configuracion`: es un dato de la empresa y
  // sólo se valida acá porque viaja en el mismo formulario. Los demás
  // datos legales del contrato se cargan por proyecto (Contratos →
  // Configuración), no acá.
  ruc: z.string().max(20, "RUC muy largo").optional(),
});

export type ConfiguracionFormData = z.infer<typeof configuracionSchema>;
