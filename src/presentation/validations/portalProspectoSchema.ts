import { z } from "zod";

/** Consulta del portal: solo el email con el que el prospecto entra. */
export const portalProspectoConsultaSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu email")
    .email("Correo electrónico inválido"),
});

/** Alta mínima cuando el email todavía no existe en el CRM. */
export const portalProspectoAltaSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Ingresa tu email")
    .email("Correo electrónico inválido"),
  nombres: z.string().trim().min(2, "Ingresa tus nombres"),
  telefono: z.string().trim().min(5, "Ingresa un teléfono válido"),
});

export type PortalProspectoConsultaFormData = z.infer<
  typeof portalProspectoConsultaSchema
>;
export type PortalProspectoAltaFormData = z.infer<
  typeof portalProspectoAltaSchema
>;
