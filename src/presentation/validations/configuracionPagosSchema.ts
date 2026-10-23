import { z } from "zod";

/**
 * Datos fiscales de los recibos de pago de un proyecto (botón
 * «Configuración de recibos» de Cobranzas/Pagos). La razón social puede
 * quedar vacía: el recibo la toma de la empresa. Las direcciones
 * fiscales son obligatorias para poder emitir.
 *
 * El RUC no se pide acá: se toma del contrato del proyecto (o de la
 * empresa), para no cargarlo dos veces.
 */
export const configuracionPagosSchema = z.object({
  razon_social: z.string().max(200, "Razón social muy larga").optional(),
  direccion_matriz: z.string().max(400, "Dirección muy larga").optional(),
  direccion_establecimiento: z.string().max(400, "Dirección muy larga").optional(),
  codigo_establecimiento: z
    .string()
    .regex(/^\d{3}$/, "Debe contener exactamente tres dígitos")
    .optional(),
  punto_emision: z
    .string()
    .regex(/^\d{3}$/, "Debe contener exactamente tres dígitos")
    .optional(),
});

export type ConfiguracionPagosFormData = z.infer<typeof configuracionPagosSchema>;
