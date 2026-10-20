import type {
  DocumentoContratoStorage,
  SubirDocumentoContratoInput,
  SubirDocumentoContratoResult,
} from "@/application/contratos/ports/DocumentoContratoStorage";
import { tipoDeArchivoDocumentoContrato } from "@/application/contratos/ports/DocumentoContratoStorage";

/** Solo para `VITE_DATA_PROVIDER=mock`: el documento vive en memoria. */
export class MockDocumentoContratoStorage implements DocumentoContratoStorage {
  private urls = new Map<string, string>();

  async upload({ contratoId, file }: SubirDocumentoContratoInput): Promise<SubirDocumentoContratoResult> {
    const tipo = tipoDeArchivoDocumentoContrato(file);
    const nombre = file.name || `contrato.${tipo}`;
    const path = `contrato-${contratoId}/${Date.now()}-${nombre}`;
    this.urls.set(path, URL.createObjectURL(file));
    return { path, tipo, nombre };
  }

  async firmarUrl(path: string): Promise<string> {
    return this.urls.get(path) ?? path;
  }

  async removeByPath(path: string): Promise<void> {
    const url = this.urls.get(path);
    if (url) URL.revokeObjectURL(url);
    this.urls.delete(path);
  }
}
