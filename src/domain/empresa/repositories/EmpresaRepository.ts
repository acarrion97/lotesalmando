import type { Empresa } from "../entities";

/** Datos para crear una empresa nueva con su cuenta de admin de acceso. */
export interface CrearEmpresaConAdminInput {
  razon_social: string;
  ruc?: string | null;
  admin_nombres: string;
  admin_email: string;
  admin_password: string;
}

export interface EmpresaRepository {
  getAll(): Promise<Empresa[]>;
  getById(id: number): Promise<Empresa | null>;
  create(data: Omit<Empresa, "id_empresa">): Promise<Empresa>;
  /**
   * Crea la empresa y en la misma transacción da de alta su admin
   * (fila `usuario` + cuenta Supabase Auth) vía la RPC
   * `crear_empresa_con_admin`. Devuelve la empresa creada.
   *
   * La RPC exige que quien llame tenga el permiso `crear_empresas`, así que
   * funciona como defensa en profundidad además del gating del frontend.
   */
  createConAdmin(input: CrearEmpresaConAdminInput): Promise<Empresa>;
  update(id: number, data: Partial<Empresa>): Promise<Empresa>;
  delete(id: number): Promise<void>;
}
