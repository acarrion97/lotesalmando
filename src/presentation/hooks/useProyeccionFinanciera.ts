import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useEmpresa } from "@/presentation/providers";
import type { ProyeccionOpciones } from "@/application/proyecciones/dto/ProyeccionFinancieraDto";

/**
 * Proyección financiera de la etapa elegida, acotada a la empresa actual del
 * usuario: sin `empresaId` el select de etapas mostraría las de todas las
 * empresas. Se espera a tener empresa para no disparar una consulta sin filtrar.
 */
export function useProyeccionFinanciera(opciones: ProyeccionOpciones) {
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;

  return useQuery({
    queryKey: ["proyeccionFinanciera", empresaId, opciones],
    queryFn: () => container.getProyeccionFinanciera.execute(opciones, empresaId || undefined),
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });
}
