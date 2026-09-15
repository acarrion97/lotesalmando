import { z } from "zod";

export const prospectoSchema = z.object({
  nombres: z.string().min(2, "Minimo 2 caracteres").max(200),
  email: z.string().email("Email invalido"),
  telefono: z.string().min(8, "Minimo 8 caracteres").max(20),
  origen: z.string().min(1, "Requerido"),
  estado: z.enum(["nuevo", "contactado", "interesado", "negociacion", "reserva", "perdido"]),
  notas: z.string().max(1000).optional().default(""),
  id_asesor: z.number().nullable().optional(),
});

export type ProspectoFormData = z.infer<typeof prospectoSchema>;
