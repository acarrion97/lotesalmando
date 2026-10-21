import { supabase } from "@/infrastructure/supabase/client";
import {
  tipoDeArchivoDocumentoContrato,
  type DocumentoContratoStorage,
  type SubirDocumentoContratoInput,
  type SubirDocumentoContratoResult,
} from "@/application/contratos/ports/DocumentoContratoStorage";

const BUCKET = "contratos";
const VIDA_URL_SEGUNDOS = 3600;

function nombreSeguro(file: File): string {
  const base = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  const extension = base.includes(".") ? base.slice(base.lastIndexOf(".")) : ".pdf";
  const stem = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
  return `${stem || "contrato"}${extension}`.toLowerCase();
}

/**
 * Bucket PRIVADO `contratos`: el documento trae datos del comprador, así
 * que no es público. Solo el backoffice (autenticado) sube y lee, siempre
 * con URLs firmadas de una hora.
 */
export class SupabaseDocumentoContratoStorage implements DocumentoContratoStorage {
  async upload({ contratoId, file }: SubirDocumentoContratoInput): Promise<SubirDocumentoContratoResult> {
    const tipo = tipoDeArchivoDocumentoContrato(file);
    const nombre = nombreSeguro(file);
    const path = `contrato-${contratoId}/${Date.now()}-${nombre}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;

    return { path, tipo, nombre };
  }

  async firmarUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, VIDA_URL_SEGUNDOS);
    if (error || !data?.signedUrl) throw error ?? new Error("No se pudo abrir el documento");
    return data.signedUrl;
  }

  /**
   * La opción `download` hace que el servidor responda con
   * `Content-Disposition: attachment`, así el navegador guarda el archivo con
   * ese nombre en vez de abrirlo.
   */
  async firmarUrlDeDescarga(path: string, nombre: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, VIDA_URL_SEGUNDOS, { download: nombre });
    if (error || !data?.signedUrl) throw error ?? new Error("No se pudo descargar el documento");
    return data.signedUrl;
  }

  async removeByPath(path: string): Promise<void> {
    if (!path) return;
    await supabase.storage.from(BUCKET).remove([path]);
  }
}
