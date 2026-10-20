import type { RolRepository } from "@/domain/rol/repositories";

/**
 * Devuelve las asignaciones usuario -> rol de TODA la plataforma, ya agrupadas
 * en un mapa `id_usuario -> string[]` (nombres de rol).
 *
 * Existe para que una vista que lista muchos usuarios (el desglose de
 * `/plataforma`) pueda mostrar el rol sin hacer una consulta por usuario.
 */
export class GetRolesPorUsuariosUseCase {
  private repo: RolRepository;
  constructor(repo: RolRepository) {
    this.repo = repo;
  }

  async execute(): Promise<Record<number, string[]>> {
    const asignaciones = await this.repo.getAllAsignacionesRol();

    const mapa: Record<number, string[]> = {};
    for (const a of asignaciones) {
      const actual = mapa[a.id_usuario];
      if (actual) {
        if (!actual.includes(a.nombre_rol)) actual.push(a.nombre_rol);
      } else {
        mapa[a.id_usuario] = [a.nombre_rol];
      }
    }
    return mapa;
  }
}
