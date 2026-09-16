import { z } from "zod";

export const registroEmpresaSchema = z.object({
  nombres: z.string().min(2, "Minimo 2 caracteres").max(255),
  email: z.string().email("Correo electronico invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
  razon_social: z.string().min(2, "Minimo 2 caracteres").max(255),
});

export type RegistroEmpresaFormData = z.infer<typeof registroEmpresaSchema>;
