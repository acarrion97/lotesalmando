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
      logo_url: existente?.logo_url ?? null,
      // Lo legal no se edita acá (vive por proyecto): al actualizar se
      // conserva lo que ya tenía la fila.
      representante: existente?.representante ?? null,
      representante_cedula: existente?.representante_cedula ?? null,
      representante_email: existente?.representante_email ?? null,
      ciudad: existente?.ciudad ?? null,
      cuentas_bancarias: existente?.cuentas_bancarias ?? null,
      direccion_canje: existente?.direccion_canje ?? null,
    };
    registros.set(data.id_empresa, guardada);
    return guardada;
  }

  async setLogo(empresaId: number, logoUrl: string | null): Promise<Configuracion> {
    const existente = registros.get(empresaId);
    const guardada: Configuracion = {
      id_configuracion: existente?.id_configuracion ?? siguienteId++,
      id_empresa: empresaId,
      moneda: existente?.moneda ?? null,
      idioma: existente?.idioma ?? null,
      logo_url: logoUrl,
      representante: existente?.representante ?? null,
      representante_cedula: existente?.representante_cedula ?? null,
      representante_email: existente?.representante_email ?? null,
      ciudad: existente?.ciudad ?? null,
      cuentas_bancarias: existente?.cuentas_bancarias ?? null,
      direccion_canje: existente?.direccion_canje ?? null,
    };
    registros.set(empresaId, guardada);
    return guardada;
  }
}
