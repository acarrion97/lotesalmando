import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProyectoMedio } from "@/domain/proyecto/entities";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import { inventoryKeys } from "./inventoryKeys";

/**
 * Fotos y videos del proyecto, con las mutaciones de subir y borrar.
 * La lista se invalida al cambiar cualquiera de las dos para que la
 * tarjeta de Configuración siempre muestre lo que hay en Storage.
 */
export function useMediosProyecto(proyectoId: number) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const queryClient = useQueryClient();
  const queryKey = inventoryKeys.mediosProyecto(empresaId, proyectoId);

  const query = useQuery({
    queryKey,
    queryFn: () => container.getMediosProyecto.execute(proyectoId),
    enabled: !!empresaId && !!proyectoId,
  });

  const subir = useMutation({
    mutationFn: (file: File) => container.subirMedioProyecto.execute(proyectoId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const quitar = useMutation({
    mutationFn: (medio: ProyectoMedio) => container.quitarMedioProyecto.execute(medio),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    medios: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    subir,
    quitar,
  };
}
