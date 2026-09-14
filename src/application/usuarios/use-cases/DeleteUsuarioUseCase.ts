import type { UsuarioRepository } from "@/domain/usuario/repositories";

export class DeleteUsuarioUseCase {
  private readonly usuarioRepo: UsuarioRepository;

  constructor(usuarioRepo: UsuarioRepository) {
    this.usuarioRepo = usuarioRepo;
  }

  execute(id: number): Promise<void> {
    return this.usuarioRepo.delete(id);
  }
}