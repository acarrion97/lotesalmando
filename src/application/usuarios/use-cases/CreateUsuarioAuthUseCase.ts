import type { UsuarioRepository } from "@/domain/usuario/repositories";

export interface CreateUsuarioAuthInput {
  email: string;
  password: string;
  nombres: string;
}

/**
 * Crea la cuenta de acceso en Supabase Auth para un usuario ya invitado
 * (fila `usuario` creada antes por el panel). La password temporal la
 * define el caller (passwordDeEmail) y no se persiste en la app.
 */
export class CreateUsuarioAuthUseCase {
  private readonly usuarioRepo: UsuarioRepository;

  constructor(usuarioRepo: UsuarioRepository) {
    this.usuarioRepo = usuarioRepo;
  }

  execute(data: CreateUsuarioAuthInput): Promise<void> {
    return this.usuarioRepo.createAuthUser(data);
  }
}
