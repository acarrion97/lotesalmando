import { z } from "zod";

export const ventaSchema = z.object({
  id_cliente: z.number().min(1, "Seleccione un cliente"),
  id_lote: z.number().min(1, "Seleccione un lote"),
  id_cotizacion: z.number().min(1, "Seleccione una cotizacion"),
  precio_ofertado: z.number().min(1, "Precio invalido"),
  id_usuario: z.number().min(1, "Seleccione un asesor"),
});

export type VentaFormData = z.infer<typeof ventaSchema>;
