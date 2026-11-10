import type { ClienteRepository } from "@/domain/cliente/repositories";
import { normalizarIdentificacion } from "@/domain/cliente/normalizarIdentificacion";

/**
 * Valida en la capa de aplicación que una identificación no se repita dentro
 * de la empresa. La regla vive aquí para que el formulario y cualquier otro
 * flujo que use los casos de uso tengan el mismo comportamiento.
 */
export async function validarIdentificacionUnica(
  clienteRepo: ClienteRepository,
  idEmpresa: number | null | undefined,
  cedulaRuc: string | null | undefined,
  idClienteExcluir?: number,
): Promise<void> {
  const identificacion = cedulaRuc ? normalizarIdentificacion(cedulaRuc) : "";
  if (!idEmpresa || !identificacion) return;

  const clientes = await clienteRepo.getByEmpresaId(idEmpresa);
  const duplicado = clientes.some(
    (cliente) =>
      cliente.id_cliente !== idClienteExcluir &&
      normalizarIdentificacion(cliente.cedula_ruc) === identificacion,
  );

  if (duplicado) {
    throw new Error("Ya existe un cliente con esa cédula o RUC en esta empresa");
  }
}
