import type { MapaRepository } from "@/domain/mapa/repositories";
import type { Mapa } from "@/domain/mapa/entities";

/** "Las Margaritas Eco Hábitat" -> "las-margaritas-eco-habitat" */
export function normalizarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Publica el plano del proyecto en `/mapa/:slug` (o lo despublica con
 * `null`). Requiere que el proyecto ya tenga imagen de plano.
 */
export class PublicarMapaUseCase {
  private readonly repo: MapaRepository;
  constructor(repo: MapaRepository) {
    this.repo = repo;
  }

  async execute(proyectoId: number, slug: string | null): Promise<Mapa> {
    const mapa = await this.repo.getByProyectoId(proyectoId);
    if (!mapa?.url_publica) throw new Error("Primero suba el plano del proyecto");

    if (slug === null) return this.repo.setSlug(mapa.id_mapa, null);

    const limpio = normalizarSlug(slug);
    if (limpio.length < 3) throw new Error("El enlace debe tener al menos 3 caracteres");
    return this.repo.setSlug(mapa.id_mapa, limpio);
  }
}
