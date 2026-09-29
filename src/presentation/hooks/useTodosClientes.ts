import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

/**
 * Full client list (no tenant scope) for *picking* a client in cotizacion,
 * venta and reserva forms. Without it a client created while reserving a lot
 * cannot be selected, because the scoped list (useClientes) will not contain
 * it until it has a venta or cotizacion. The Clientes table keeps using
 * useClientes.
 */
export function useTodosClientes() {
  const container = getContainer();

  return useQuery({
    queryKey: ["clientes", "todos"],
    queryFn: () => container.getAllClientes.execute(),
  });
}
