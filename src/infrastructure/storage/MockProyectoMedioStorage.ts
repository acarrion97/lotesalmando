import type {
  ProyectoMedioStorage,
  SubirMedioProyectoInput,
  SubirMedioProyectoResult,
} from "@/application/proyectos/ports/ProyectoMedioStorage";
import { validarArchivoMedio } from "@/application/proyectos/ports/ProyectoMedioStorage";

/**
 * Solo para `VITE_DATA_PROVIDER=mock`: el archivo vive en un object URL del
 * navegador (se pierde al recargar), no hay red de por medio.
 */
export class MockProyectoMedioStorage implements ProyectoMedioStorage {
  async upload({ file }: SubirMedioProyectoInput): Promise<SubirMedioProyectoResult> {
    const error = validarArchivoMedio(file);
    if (error) throw new Error(error);
    return { url: URL.createObjectURL(file) };
  }

  async removeByUrl(url: string): Promise<void> {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}
