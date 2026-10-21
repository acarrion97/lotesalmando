import { z } from "zod";

export const configuracionSchema = z.object({
  moneda: z.string().min(3, "Seleccione la moneda").max(10, "Código de moneda no válido"),
  idioma: z.string().min(1, "Seleccione el idioma").max(10, "Código de idioma no válido"),
  // Datos legales que usa el contrato (se permiten vacíos: el contrato
  // sale igual, solo omite lo que no esté cargado).
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
});

export type ConfiguracionFormData = z.infer<typeof configuracionSchema>;
