import type {
  PortalProspectoStorage,
  SubirDocumentoInput,
  SubirDocumentoResult,
} from "@/application/portalProspecto/ports/PortalProspectoStorage";

/**
 * Solo para `VITE_DATA_PROVIDER=mock`: el archivo vive en un object URL
 * del navegador (se pierde al recargar) y no hay red de por medio.
 */
export class MockPortalProspectoStorage implements PortalProspectoStorage {
  async upload({ carpeta, file }: SubirDocumentoInput): Promise<SubirDocumentoResult> {
    return { path: `${carpeta}/${Date.now()}-${file.name || "documento"}` };
  }

  async firmarUrl(path: string): Promise<string> {
    // En mock no hay objeto real: se devuelve un data URL para que la
    // UI pueda "abrir" sin romper.
    return `data:application/octet-stream;base64,${btoa(path)}`;
  }

  async removeByPath(): Promise<void> {
    // Nada que borrar en memoria.
  }
}
