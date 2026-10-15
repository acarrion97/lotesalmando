import { useMutation } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

/** Sube la imagen de un plan al storage y devuelve su URL publica. */
export function useSubirImagenPlan() {
  return useMutation({
    mutationFn: (file: File) => getContainer().subirImagenPlan.execute(file),
  });
}
