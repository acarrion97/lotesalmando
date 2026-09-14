import type { Usuario } from "@/domain/usuario/entities";
import type { UsuarioRepository } from "@/domain/usuario/repositories";

export class CreateUsuarioUseCase {
  private readonly usuarioRepo: UsuarioRepository;

  constructor(usuarioRepo: UsuarioRepository) {
    this.usuarioRepo = usuarioRepo;
  }

  execute(data: Omit<Usuario, "id_usuario">): Promise<Usuario> {
    return this.usuarioRepo.create(data);
  }
}