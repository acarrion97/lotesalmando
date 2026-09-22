import { z } from "zod";

export const asesorSchema = z.object({
  codigo: z.string().regex(/^[A-Z]{2}-\d{3}$/, "Formato: AS-001"),
  nombre_comercial: z.string().min(2, "Minimo 2 caracteres").max(255),
  meta_ventas_mensual: z.number().min(0, "No puede ser negativo").optional().default(0),
  estado: z.enum(["activo", "inactivo"]).default("activo"),
});

export type AsesorFormData = z.infer<typeof asesorSchema>;
