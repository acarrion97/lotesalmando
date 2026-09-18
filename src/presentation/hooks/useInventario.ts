import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { inventoryKeys } from "./inventoryKeys";

export function useInventario() {
  const container = getContainer();

  return useQuery({
    queryKey: inventoryKeys.inventario(),
    queryFn: () => container.getInventario.execute(),
  });
}
