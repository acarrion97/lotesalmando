import { z } from "zod";

export const clienteSchema = z.object({
  nombres: z.string().min(2, "Minimo 2 caracteres").max(200),
  cedula_ruc: z.string().min(5, "Minimo 5 caracteres").max(20),
  email: z.string().email("Email invalido"),
  telefono: z
    .string()
    .max(50, "Maximo 50 caracteres")
    .optional()
    .transform((v) => (v ?? "").trim())
    .transform((v) => (v === "" ? null : v))
    .nullable(),
});

export type ClienteFormData = z.infer<typeof clienteSchema>;
