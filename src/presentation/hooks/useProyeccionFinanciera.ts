import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import type { ProyeccionOpciones } from "@/application/proyecciones/dto/ProyeccionFinancieraDto";

export function useProyeccionFinanciera(opciones: ProyeccionOpciones) {
  const container = getContainer();

  return useQuery({
    queryKey: ["proyeccionFinanciera", opciones],
    queryFn: () => container.getProyeccionFinanciera.execute(opciones),
    staleTime: 5 * 60 * 1000,
  });
}
