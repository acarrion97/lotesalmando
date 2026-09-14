import type { Empresa } from "@/domain/empresa/entities";
import type { EmpresaRepository } from "@/domain/empresa/repositories";
import type { EmpresaDto } from "../dto/EmpresaDto";

export class GetEmpresaByIdUseCase {
  private empresaRepo: EmpresaRepository;
  constructor(empresaRepo: EmpresaRepository) {
    this.empresaRepo = empresaRepo;
  }

  async execute(id: number): Promise<EmpresaDto | null> {
    const empresa: Empresa | null = await this.empresaRepo.getById(id);
    if (!empresa) return null;
    return this.toDto(empresa);
  }

  private toDto(empresa: Empresa): EmpresaDto {
    return {
      id_empresa: empresa.id_empresa,
      razon_social: empresa.razon_social,
      ruc: empresa.ruc,
      estado: empresa.estado,
    };
  }
}
