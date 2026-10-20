import type { Empresa } from "@/domain/empresa/entities";
import type { EmpresaRepository } from "@/domain/empresa/repositories";
import type { EmpresaDto } from "../dto/EmpresaDto";

export class GetEmpresasUseCase {
  private empresaRepo: EmpresaRepository;
  constructor(empresaRepo: EmpresaRepository) {
    this.empresaRepo = empresaRepo;
  }

  async execute(): Promise<EmpresaDto[]> {
    const empresas: Empresa[] = await this.empresaRepo.getAll();
    return empresas.map((e) => this.toDto(e));
  }

  private toDto(empresa: Empresa): EmpresaDto {
    return {
      id_empresa: empresa.id_empresa,
      razon_social: empresa.razon_social,
      ruc: empresa.ruc,
      estado: empresa.estado,
      plan: empresa.plan,
      id_partner: empresa.id_partner ?? null,
    };
  }
}
