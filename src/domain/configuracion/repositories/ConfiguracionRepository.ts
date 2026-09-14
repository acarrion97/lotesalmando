import type { Configuracion } from "../entities";

export interface ConfiguracionRepository {
  getByEmpresaId(empresaId: number): Promise<Configuracion | null>;
  create(data: Omit<Configuracion, "id_configuracion">): Promise<Configuracion>;
  update(id: number, data: Partial<Configuracion>): Promise<Configuracion>;
}
