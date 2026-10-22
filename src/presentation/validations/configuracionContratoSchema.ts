import { z } from "zod";

/**
 * Datos legales del contrato de un proyecto (modal "Configuración" de
 * Contratos). Todo es opcional a propósito: lo que quede vacío se toma de
 * la configuración de la empresa, y el RUC vacío de `empresa.ruc`.
 */
export const configuracionContratoSchema = z.object({
  razon_social: z.string().max(200, "Razón social muy larga").optional(),
  ruc: z.string().max(20, "RUC muy largo").optional(),
  representante: z.string().max(160, "Nombre muy largo").optional(),
  representante_cedula: z.string().max(30, "Cédula muy larga").optional(),
  representante_email: z
    .string()
    .max(160, "Correo muy largo")
    .refine((valor) => !valor || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor), {
      message: "Correo electrónico no válido",
    })
    .optional(),
  ciudad: z.string().max(80, "Ciudad muy larga").optional(),
  cuentas_bancarias: z.string().max(1000, "Texto muy largo").optional(),
  direccion_canje: z.string().max(400, "Dirección muy larga").optional(),
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

export type ConfiguracionContratoFormData = z.infer<typeof configuracionContratoSchema>;
