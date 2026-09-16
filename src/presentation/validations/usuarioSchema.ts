import { z } from "zod";

export const usuarioSchema = z.object({
  nombres: z.string().min(2, "Minimo 2 caracteres").max(255),
  email: z.string().email("Email invalido"),
  estado: z.enum(["activo", "inactivo"]),
});

export type UsuarioFormData = z.infer<typeof usuarioSchema>;
