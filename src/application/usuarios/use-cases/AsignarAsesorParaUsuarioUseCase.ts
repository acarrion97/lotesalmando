import type { Asesor } from "@/domain/asesor/entities";
import type { AsesorRepository } from "@/domain/asesor/repositories";

export interface UsuarioParaAsesor {
  id_usuario: number;
  id_empresa: number;
  nombres: string;
}

/**
 * Garantiza un asesor vinculado a una cuenta con rol Vendedor: es el que se
 * usa por defecto en prospectos, cotizaciones y ventas directas.
 *
 * - Si la cuenta ya tiene asesor, se reutiliza (reactivándolo si estaba
 *   inactivo): el rol volvió a asignarse, no se duplica la fila.
 * - Si no tiene, se crea con el siguiente código `V-<n>` de la empresa,
 *   `nombre_comercial` = nombre de la cuenta y `estado` "activo".
 * - Ante una colisión de `UNIQUE(id_empresa, codigo)` (la lista que se usó
 *   para calcular el código quedó desactualizada) se vuelve a consultar y se
 *   reintenta una vez.
 */
export class AsignarAsesorParaUsuarioUseCase {
  private readonly asesorRepo: AsesorRepository;

  constructor(asesorRepo: AsesorRepository) {
    this.asesorRepo = asesorRepo;
  }

  async execute(usuario: UsuarioParaAsesor): Promise<Asesor> {
    const vinculado = (await this.asesorRepo.getByEmpresaId(usuario.id_empresa)).find(
      (a) => a.id_usuario === usuario.id_usuario,
    );
    if (vinculado) {
      return vinculado.estado === "activo"
        ? vinculado
        : this.asesorRepo.update(vinculado.id_asesor, { estado: "activo" });
    }

    let ultimoError: unknown = null;
    for (let intento = 0; intento < 2; intento++) {
      // Se refresca en cada intento: es lo que permite resolver la colisión.
      const existentes = await this.asesorRepo.getByEmpresaId(usuario.id_empresa);
      try {
        return await this.asesorRepo.create({
          id_empresa: usuario.id_empresa,
          id_usuario: usuario.id_usuario,
          codigo: siguienteCodigoVendedor(existentes),
          nombre_comercial: usuario.nombres,
          meta_ventas_mensual: 0,
          estado: "activo",
        });
      } catch (error) {
        ultimoError = error;
      }
    }
    throw ultimoError;
  }
}

/** Próximo código del patrón `V-001` dentro de la empresa. */
function siguienteCodigoVendedor(existentes: Asesor[]): string {
  const mayores = existentes
    .filter((a) => /^V-\d+$/i.test(a.codigo ?? ""))
    .map((a) => Number(a.codigo.slice(2)));
  const siguiente = (mayores.length ? Math.max(...mayores) : 0) + 1;
  return `V-${String(siguiente).padStart(3, "0")}`;
}
