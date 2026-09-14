import type { Configuracion } from "@/domain/configuracion/entities";
import type { ConfiguracionRepository } from "@/domain/configuracion/repositories";
import { configuraciones } from "@/mocks/configuracion.mock";

export class MockConfiguracionRepository implements ConfiguracionRepository {
  private data: Configuracion[] = [...configuraciones];

  async getByEmpresaId(empresaId: number): Promise<Configuracion | null> {
    return this.data.find((c) => c.id_empresa === empresaId) ?? null;
  }

  async create(data: Omit<Configuracion, "id_configuracion">): Promise<Configuracion> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((c) => c.id_configuracion)) + 1 : 1;
    const config: Configuracion = { ...data, id_configuracion: newId };
    this.data.push(config);
    return config;
  }

  async update(id: number, data: Partial<Configuracion>): Promise<Configuracion> {
    const index = this.data.findIndex((c) => c.id_configuracion === id);
    if (index === -1) throw new Error(`Configuracion ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_configuracion: id };
    return this.data[index];
  }
}
