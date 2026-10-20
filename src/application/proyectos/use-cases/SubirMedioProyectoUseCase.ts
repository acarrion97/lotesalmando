import type { ProyectoMedioRepository } from "@/domain/proyecto/repositories";
import type { ProyectoMedio } from "@/domain/proyecto/entities";
import type { ProyectoMedioStorage } from "../ports/ProyectoMedioStorage";
import { tipoDeArchivo, validarArchivoMedio } from "../ports/ProyectoMedioStorage";

/**
 * Sube un archivo al bucket `medios` y registra la fila en
 * `proyecto_medios`. Si el registro falla, se borra el archivo recién subido
 * para no dejar huérfanos en el almacenamiento.
 */
export class SubirMedioProyectoUseCase {
  private readonly repo: ProyectoMedioRepository;
  private readonly storage: ProyectoMedioStorage;

  constructor(repo: ProyectoMedioRepository, storage: ProyectoMedioStorage) {
    this.repo = repo;
    this.storage = storage;
  }

  async execute(proyectoId: number, file: File): Promise<ProyectoMedio> {
    if (!proyectoId) throw new Error("Seleccione un proyecto");

    const error = validarArchivoMedio(file);
    if (error) throw new Error(error);
    const tipo = tipoDeArchivo(file);
    if (!tipo) throw new Error("Formato de archivo no admitido");

    const { url } = await this.storage.upload({ proyectoId, file });

    try {
      return await this.repo.add({ id_proyecto: proyectoId, tipo, url });
    } catch (err) {
      await this.storage.removeByUrl(url).catch(() => undefined);
      throw err;
    }
  }
}
