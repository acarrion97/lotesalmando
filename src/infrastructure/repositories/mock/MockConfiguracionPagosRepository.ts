import type { ConfiguracionPagos } from "@/domain/configuracion/entities";
import type {
  ConfiguracionPagosRepository,
  SaveConfiguracionPagosInput,
} from "@/domain/configuracion/repositories";

/** Memoria por proceso: cada proyecto guarda su propia fila. */
const registros = new Map<number, ConfiguracionPagos>();
let siguienteId = 1;

export class MockConfiguracionPagosRepository implements ConfiguracionPagosRepository {
  async getByProyectoId(idProyecto: number): Promise<ConfiguracionPagos | null> {
    return registros.get(idProyecto) ?? null;
  }

  async save(data: SaveConfiguracionPagosInput): Promise<ConfiguracionPagos> {
    const existente = registros.get(data.id_proyecto);
    const guardada: ConfiguracionPagos = {
      id_configuracion_pagos: existente?.id_configuracion_pagos ?? siguienteId++,
      id_empresa: data.id_empresa,
      id_proyecto: data.id_proyecto,
      razon_social: data.razon_social ?? null,
      direccion_matriz: data.direccion_matriz ?? null,
      direccion_establecimiento: data.direccion_establecimiento ?? null,
      codigo_establecimiento: data.codigo_establecimiento || "001",
      punto_emision: data.punto_emision || "001",
    };
    registros.set(data.id_proyecto, guardada);
    return guardada;
  }
}
