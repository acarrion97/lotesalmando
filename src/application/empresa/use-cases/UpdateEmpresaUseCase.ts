import type { Empresa } from "@/domain/empresa/entities";
import type { EmpresaRepository } from "@/domain/empresa/repositories";

/**
 * Actualiza datos de la empresa desde la pantalla de Configuración.
 * Hoy sólo el RUC, que antes sólo se podía ver (venía cargado al crear
 * la empresa) y ahora es editable y se imprime en el contrato.
 */
export class UpdateEmpresaUseCase {
  private empresaRepo: EmpresaRepository;
  constructor(empresaRepo: EmpresaRepository) {
    this.empresaRepo = empresaRepo;
  }

  async execute(id: number, data: { ruc: string }): Promise<Empresa> {
    return this.empresaRepo.update(id, { ruc: data.ruc });
  }
}
