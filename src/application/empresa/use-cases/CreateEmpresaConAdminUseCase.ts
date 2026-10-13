import type { EmpresaRepository, CrearEmpresaConAdminInput } from "@/domain/empresa/repositories";
import type { Empresa } from "@/domain/empresa/entities";

/**
 * Crea una empresa nueva junto con su cuenta de admin, en una sola
 * transacción, vía la RPC `crear_empresa_con_admin` (migración 026).
 *
 * El nombre y el correo se normalizan acá; la contraseña se exige de al menos
 * 6 caracteres. La autorización final (permiso `crear_empresas`) la valida el
 * servidor dentro de la RPC, no el frontend.
 */
export class CreateEmpresaConAdminUseCase {
  private empresaRepo: EmpresaRepository;
  constructor(empresaRepo: EmpresaRepository) {
    this.empresaRepo = empresaRepo;
  }

  async execute(input: CrearEmpresaConAdminInput): Promise<Empresa> {
    const razonSocial = input.razon_social.trim();
    if (razonSocial.length < 2) {
      throw new Error("La razón social debe tener al menos 2 caracteres.");
    }

    const adminNombres = input.admin_nombres.trim();
    if (adminNombres.length < 2) {
      throw new Error("El nombre del admin debe tener al menos 2 caracteres.");
    }

    const adminEmail = input.admin_email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      throw new Error("El correo del admin no es válido.");
    }

    if (input.admin_password.length < 6) {
      throw new Error("La contraseña del admin debe tener al menos 6 caracteres.");
    }

    return this.empresaRepo.createConAdmin({
      razon_social: razonSocial,
      ruc: input.ruc?.trim() || null,
      admin_nombres: adminNombres,
      admin_email: adminEmail,
      admin_password: input.admin_password,
    });
  }
}
