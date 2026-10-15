import type { Empresa } from "@/domain/empresa/entities";
import type { EmpresaRepository } from "@/domain/empresa/repositories";
import type { EmpresaDto } from "../dto/EmpresaDto";

/**
 * Guarda el plan de pago elegido por la empresa al registrarse
 * ('basico' | 'inicial' | 'avanzado'). Solo registra la eleccion: el
 * pago se procesa en Hotmart y su verificacion no depende de aca.
 */
export class UpdateEmpresaPlanUseCase {
  private empresaRepo: EmpresaRepository;
  constructor(empresaRepo: EmpresaRepository) {
    this.empresaRepo = empresaRepo;
  }

  async execute(idEmpresa: number, plan: string): Promise<EmpresaDto> {
    const empresa: Empresa = await this.empresaRepo.update(idEmpresa, { plan });
    return this.toDto(empresa);
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
