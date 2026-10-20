import type { EmpresaRepository } from "@/domain/empresa/repositories";
import type { Empresa } from "@/domain/empresa/entities";

/** Fila de la tabla "empresas por cantidad de usuarios" del dashboard. */
export interface EmpresaResumen {
  id_empresa: number;
  razon_social: string;
  estado: string;
  total_usuarios: number;
  usuarios_activos: number;
  created_at: string | null;
}

/**
 * Métricas agregadas de TODA la plataforma (todas las empresas), para el
 * dashboard del superadmin en /plataforma.
 *
 * Nota: el repositorio de empresa expone un `getAll()` sin filtro por empresa,
 * a propósito: esta vista es transversal. Cualquier otro consumidor que necesite
 * aislar por tenant debe usar el caso de uso correspondiente (GetEmpresasUseCase
 * ya filtra en la capa de presentación).
 */
export interface PlataformaMetricas {
  total_empresas: number;
  empresas_activas: number;
  empresas_inactivas: number;
  empresas_nuevas_este_mes: number;
  total_usuarios: number;
  usuarios_activos: number;
  usuarios_inactivos: number;
  usuarios_nuevos_este_mes: number;
  promedio_usuarios_por_empresa: number;
  empresas: EmpresaResumen[];
}

/** Usuario mínimo que este caso de uso necesita contar. */
interface UsuarioLigero {
  id_empresa: number;
  estado: string | null;
  created_at?: string | null;
}

/**
 * Razón social de la empresa que opera la propia plataforma. No es un cliente:
 * se excluye de las métricas y del desglose de usuarios de /plataforma para
 * que los números reflejen solo a los clientes reales.
 *
 * Se compara en minúsculas y sin espacios sobrantes. Si renombrás esta empresa
 * en la BD, actualizá este valor.
 */
const EMPRESA_PLATAFORMA = "lotes al mando";

const normalizarNombre = (texto: string) => texto.trim().toLowerCase();

export class GetPlataformaMetricasUseCase {
  private empresaRepo: EmpresaRepository;
  constructor(empresaRepo: EmpresaRepository) {
    this.empresaRepo = empresaRepo;
  }

  /**
   * @param usuarios Todos los usuarios de la plataforma (sin filtrar por
   * empresa). Se pasa como dato para que este caso de uso no dependa de un
   * segundo repositorio y siga siendo fácil de probar.
   */
  async execute(usuarios: UsuarioLigero[]): Promise<PlataformaMetricas> {
    const todasLasEmpresas: Empresa[] = await this.empresaRepo.getAll();

    // La empresa que opera la plataforma no es un cliente: queda fuera de las
    // métricas y del desglose. Se resuelve su id para poder excluir también a
    // sus usuarios (si no, los totales quedarían desalineados con la tabla).
    const idEmpresaPlataforma = todasLasEmpresas.find(
      (e) => normalizarNombre(e.razon_social) === EMPRESA_PLATAFORMA,
    )?.id_empresa;

    const empresas = idEmpresaPlataforma
      ? todasLasEmpresas.filter((e) => e.id_empresa !== idEmpresaPlataforma)
      : todasLasEmpresas;

    const usuariosFiltrados = idEmpresaPlataforma
      ? usuarios.filter((u) => u.id_empresa !== idEmpresaPlataforma)
      : usuarios;

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const esEsteMes = (iso?: string | null) => {
      if (!iso) return false;
      const fecha = new Date(iso);
      if (Number.isNaN(fecha.getTime())) return false;
      return fecha.getTime() >= inicioMes.getTime();
    };

    const activas = empresas.filter((e) => (e.estado ?? "").toLowerCase() === "activo");

    const usuariosActivos = usuariosFiltrados.filter(
      (u) => (u.estado ?? "").toLowerCase() === "activo",
    );

    const porEmpresa = new Map<number, { total: number; activos: number }>();
    for (const u of usuariosFiltrados) {
      const actual = porEmpresa.get(u.id_empresa) ?? { total: 0, activos: 0 };
      actual.total += 1;
      if ((u.estado ?? "").toLowerCase() === "activo") actual.activos += 1;
      porEmpresa.set(u.id_empresa, actual);
    }

    const resumen: EmpresaResumen[] = empresas
      .map((e) => ({
        id_empresa: e.id_empresa,
        razon_social: e.razon_social,
        estado: e.estado ?? "",
        total_usuarios: porEmpresa.get(e.id_empresa)?.total ?? 0,
        usuarios_activos: porEmpresa.get(e.id_empresa)?.activos ?? 0,
        created_at: e.created_at ?? null,
      }))
      .sort((a, b) => b.total_usuarios - a.total_usuarios || a.razon_social.localeCompare(b.razon_social));

    return {
      total_empresas: empresas.length,
      empresas_activas: activas.length,
      empresas_inactivas: empresas.length - activas.length,
      empresas_nuevas_este_mes: empresas.filter((e) => esEsteMes(e.created_at)).length,
      total_usuarios: usuariosFiltrados.length,
      usuarios_activos: usuariosActivos.length,
      usuarios_inactivos: usuariosFiltrados.length - usuariosActivos.length,
      usuarios_nuevos_este_mes: usuariosFiltrados.filter((u) => esEsteMes(u.created_at)).length,
      promedio_usuarios_por_empresa:
        empresas.length > 0 ? Math.round((usuariosFiltrados.length / empresas.length) * 10) / 10 : 0,
      empresas: resumen,
    };
  }
}
