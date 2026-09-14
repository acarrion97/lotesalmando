import type { Usuario } from "@/domain/usuario/entities";
import type { UsuarioRepository } from "@/domain/usuario/repositories";

export class UpdateUsuarioUseCase {
  private readonly usuarioRepo: UsuarioRepository;

  constructor(usuarioRepo: UsuarioRepository) {
    this.usuarioRepo = usuarioRepo;
  }

  execute(id: number, data: Partial<Usuario>): Promise<Usuario> {
    return this.usuarioRepo.update(id, data);
  }
}