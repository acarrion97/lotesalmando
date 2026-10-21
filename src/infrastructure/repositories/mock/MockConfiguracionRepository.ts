import type { Configuracion } from "@/domain/configuracion/entities";
import type {
  ConfiguracionRepository,
  SaveConfiguracionInput,
} from "@/domain/configuracion/repositories";

/** Memoria por proceso: cada empresa guarda su propia fila. */
const registros = new Map<number, Configuracion>();
let siguienteId = 1;

export class MockConfiguracionRepository implements ConfiguracionRepository {
  async getByEmpresaId(empresaId: number): Promise<Configuracion | null> {
    return registros.get(empresaId) ?? null;
  }

  async save(data: SaveConfiguracionInput): Promise<Configuracion> {
    const existente = registros.get(data.id_empresa);
    const guardada: Configuracion = {
      id_configuracion: existente?.id_configuracion ?? siguienteId++,
      id_empresa: data.id_empresa,
      moneda: data.moneda,
      idioma: data.idioma,
      representante: data.representante ?? null,
      representante_cedula: data.representante_cedula ?? null,
      representante_email: data.representante_email ?? null,
      ciudad: data.ciudad ?? null,
      cuentas_bancarias: data.cuentas_bancarias ?? null,
      direccion_canje: data.direccion_canje ?? null,
    };
    registros.set(data.id_empresa, guardada);
    return guardada;
  }
}
