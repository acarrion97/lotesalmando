import { z } from "zod";

export const passwordSchema = z.string().min(6, "Minimo 6 caracteres");

export const nuevaContrasenaSchema = z
  .object({
    password: passwordSchema,
    confirmacion: passwordSchema,
  })
  .refine((v) => v.password === v.confirmacion, {
    message: "Las contrasenas no coinciden",
    path: ["confirmacion"],
  });

export type NuevaContrasenaFormData = z.infer<typeof nuevaContrasenaSchema>;
