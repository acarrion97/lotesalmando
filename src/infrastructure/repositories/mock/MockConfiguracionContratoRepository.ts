import type { ConfiguracionContrato } from "@/domain/configuracion/entities";
import type {
  ConfiguracionContratoRepository,
  SaveConfiguracionContratoInput,
} from "@/domain/configuracion/repositories";

/** Memoria por proceso: cada proyecto guarda su propia fila. */
const registros = new Map<number, ConfiguracionContrato>();
let siguienteId = 1;

export class MockConfiguracionContratoRepository implements ConfiguracionContratoRepository {
  async getByProyectoId(idProyecto: number): Promise<ConfiguracionContrato | null> {
    return registros.get(idProyecto) ?? null;
  }

  async save(data: SaveConfiguracionContratoInput): Promise<ConfiguracionContrato> {
    const existente = registros.get(data.id_proyecto);
    const guardada: ConfiguracionContrato = {
      id_configuracion_contrato: existente?.id_configuracion_contrato ?? siguienteId++,
      id_empresa: data.id_empresa,
      id_proyecto: data.id_proyecto,
      razon_social: data.razon_social ?? null,
      ruc: data.ruc ?? null,
      representante: data.representante ?? null,
      representante_cedula: data.representante_cedula ?? null,
      representante_email: data.representante_email ?? null,
      ciudad: data.ciudad ?? null,
      cuentas_bancarias: data.cuentas_bancarias ?? null,
      direccion_canje: data.direccion_canje ?? null,
      direccion_matriz: data.direccion_matriz ?? null,
      direccion_establecimiento: data.direccion_establecimiento ?? null,
      codigo_establecimiento: data.codigo_establecimiento ?? "001",
      punto_emision: data.punto_emision ?? "001",
    };
    registros.set(data.id_proyecto, guardada);
    return guardada;
  }
}
