import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo electronico invalido"),
  password: z.string().min(1, "Ingresa tu contrasena"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
