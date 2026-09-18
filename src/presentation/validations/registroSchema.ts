import { z } from "zod";

export const registroSchema = z.object({
  nombres: z.string().min(2, "Minimo 2 caracteres").max(255),
  email: z.string().email("Correo electronico invalido"),
  password: z.string().min(6, "Minimo 6 caracteres"),
});

export type RegistroFormData = z.infer<typeof registroSchema>;
