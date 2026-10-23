import { supabase } from "@/infrastructure/supabase/client";
import type {
  PortalProspectoStorage,
  SubirDocumentoInput,
  SubirDocumentoResult,
} from "@/application/portalProspecto/ports/PortalProspectoStorage";

const BUCKET = "documentos_prospectos";
/** La URL firmada dura una hora: suficiente para verla en pantalla. */
const VIDA_URL_SEGUNDOS = 3600;

function nombreSeguro(file: File): string {
  const base = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  const extension = base.includes(".") ? base.slice(base.lastIndexOf(".")) : extensionPorTipo(file.type);
  const stem = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
  return `${stem || "documento"}${extension}`.toLowerCase();
}

function extensionPorTipo(tipo: string): string {
  if (tipo === "image/png") return ".png";
  if (tipo === "image/webp") return ".webp";
  if (tipo === "application/pdf") return ".pdf";
  return ".jpg";
}

/**
 * Bucket PRIVADO `documentos_prospectos`. El portal público (rol anon)
 * solo puede SUBIR a la carpeta de su prospecto (política de la
 * migración 044); leer el archivo exige sesión y URL firmada. Por eso el
 * resultado de `upload` es el path y no una URL pública.
 */
export class SupabasePortalProspectoStorage implements PortalProspectoStorage {
  async upload({ carpeta, file }: SubirDocumentoInput): Promise<SubirDocumentoResult> {
    const carpetaSegura = carpeta.replace(/[^a-zA-Z0-9_-]/g, "");
    // Path único por subida: evita que un reenvío pise la prueba anterior.
    const path = `${carpetaSegura}/${Date.now()}-${nombreSeguro(file)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;

    return { path };
  }

  async firmarUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, VIDA_URL_SEGUNDOS);
    if (error || !data?.signedUrl) throw error ?? new Error("No se pudo abrir el documento");
    return data.signedUrl;
  }

  async removeByPath(path: string): Promise<void> {
    if (!path) return;
    await supabase.storage.from(BUCKET).remove([path]);
  }
}
