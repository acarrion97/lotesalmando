import type { MapaRepository } from "@/domain/mapa/repositories";
import type { PuntoPlano } from "@/domain/lote/entities";

const redondear = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Guarda el contorno de un lote sobre el plano. Los vértices llegan
 * normalizados (0..1); se recortan al rango y se redondean a 4 decimales
 * (≈0.1 px en un plano de 1000 px) para no inflar el JSON.
 * Con `null` o un arreglo vacío se quita el lote del plano.
 */
export class GuardarPoligonoLoteUseCase {
  private readonly repo: MapaRepository;
  constructor(repo: MapaRepository) {
    this.repo = repo;
  }

  async execute(loteId: number, poligono: PuntoPlano[] | null): Promise<void> {
    if (!loteId) throw new Error("Seleccione un lote");
    if (!poligono || poligono.length === 0) {
      await this.repo.guardarPoligono(loteId, null);
      return;
    }
    if (poligono.length < 3) throw new Error("El contorno necesita al menos 3 puntos");

    const limpio = poligono.map(
      ([x, y]) =>
        [redondear(Math.min(1, Math.max(0, x))), redondear(Math.min(1, Math.max(0, y)))] as PuntoPlano,
    );
    await this.repo.guardarPoligono(loteId, limpio);
  }
}
