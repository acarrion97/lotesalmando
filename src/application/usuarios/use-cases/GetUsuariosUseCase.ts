import type { Usuario } from "@/domain/usuario/entities";
import type { UsuarioRepository } from "@/domain/usuario/repositories";
import type { UsuarioDto } from "../dto/UsuarioDto";

export class GetUsuariosUseCase {
  private usuarioRepo: UsuarioRepository;
  constructor(usuarioRepo: UsuarioRepository) {
    this.usuarioRepo = usuarioRepo;
  }

  async execute(): Promise<UsuarioDto[]> {
    const usuarios: Usuario[] = await this.usuarioRepo.getAll();
    return usuarios.map((u) => this.toDto(u));
  }

  private toDto(usuario: Usuario): UsuarioDto {
    return {
      id_usuario: usuario.id_usuario,
      id_empresa: usuario.id_empresa,
      nombres: usuario.nombres,
      email: usuario.email,
      estado: usuario.estado,
    };
  }
}
