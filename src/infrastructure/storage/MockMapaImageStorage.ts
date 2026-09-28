import type {
  MapaImageStorage,
  SubirImagenInput,
  SubirImagenResult,
} from "@/application/mapas/ports/MapaImageStorage";

/**
 * Solo para `VITE_DATA_PROVIDER=mock`: la imagen vive en un object URL del
 * navegador (se pierde al recargar), no hay red de por medio.
 */
export class MockMapaImageStorage implements MapaImageStorage {
  async upload({ file }: SubirImagenInput): Promise<SubirImagenResult> {
    if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen");
    return { url: URL.createObjectURL(file) };
  }

  async removeByUrl(url: string): Promise<void> {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}
