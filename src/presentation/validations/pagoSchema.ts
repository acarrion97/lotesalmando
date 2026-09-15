import { z } from "zod";

export const pagoSchema = z.object({
  id_cobranza: z.number().min(1, "Ingrese el ID de la cobranza"),
  monto_pagado: z.number().min(0.01, "Monto debe ser mayor a 0"),
});

export type PagoFormData = z.infer<typeof pagoSchema>;
