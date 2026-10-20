import type { ProyectoMedio, ProyectoMedioTipo } from "../entities";

export interface AddProyectoMedioInput {
  id_proyecto: number;
  tipo: ProyectoMedioTipo;
  url: string;
}

/** Medios (fotos/videos) del proyecto que alimentan la galería pública. */
export interface ProyectoMedioRepository {
  /** Medios del proyecto, del más reciente al más antiguo. */
  getByProyectoId(proyectoId: number): Promise<ProyectoMedio[]>;
  /** Registra un medio ya subido al almacenamiento. */
  add(data: AddProyectoMedioInput): Promise<ProyectoMedio>;
  /** Borra el registro (el archivo se borra aparte, best-effort). */
  remove(id: number): Promise<void>;
}
