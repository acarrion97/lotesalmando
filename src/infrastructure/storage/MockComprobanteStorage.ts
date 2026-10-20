import type {
  ComprobanteStorage,
  SubirComprobanteInput,
  SubirComprobanteResult,
} from "@/application/comprobantes/ports/ComprobanteStorage";

/**
 * Solo para `VITE_DATA_PROVIDER=mock`: el archivo vive en un object URL
 * del navegador (se pierde al recargar) y no hay red de por medio.
 */
export class MockComprobanteStorage implements ComprobanteStorage {
  async upload({ carpeta, file }: SubirComprobanteInput): Promise<SubirComprobanteResult> {
    return { path: `${carpeta}/${Date.now()}-${file.name || "comprobante"}` };
  }

  async firmarUrl(path: string): Promise<string> {
    // En mock no hay objeto real: se devuelve un data URL vacío para que la
    // UI pueda "abrir" sin romper.
    return `data:application/octet-stream;base64,${btoa(path)}`;
  }

  async removeByPath(): Promise<void> {
    // Nada que borrar en memoria.
  }
}
