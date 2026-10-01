import { supabase } from "@/infrastructure/supabase/client";
import type {
  ProyectoMedioStorage,
  SubirMedioProyectoInput,
  SubirMedioProyectoResult,
} from "@/application/proyectos/ports/ProyectoMedioStorage";
import { validarArchivoMedio } from "@/application/proyectos/ports/ProyectoMedioStorage";

const BUCKET = "medios";
/** Fragmento que separa el host del path dentro de la URL pública. */
const PUBLIC_PREFIX = "/storage/v1/object/public/medios/";

function nombreSeguro(file: File): string {
  const base = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);

  const extension = base.includes(".")
    ? base.slice(base.lastIndexOf("."))
    : extensionPorTipo(file.type);
  const stem = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base;
  return `${stem || "medio"}${extension}`.toLowerCase();
}

function extensionPorTipo(tipo: string): string {
  if (tipo === "image/png") return ".png";
  if (tipo === "image/webp") return ".webp";
  if (tipo === "video/mp4") return ".mp4";
  if (tipo === "video/webm") return ".webm";
  if (tipo.startsWith("video/")) return ".mp4";
  return ".jpg";
}

export class SupabaseProyectoMedioStorage implements ProyectoMedioStorage {
  async upload({ proyectoId, file }: SubirMedioProyectoInput): Promise<SubirMedioProyectoResult> {
    if (!proyectoId) throw new Error("Seleccione un proyecto");
    const error = validarArchivoMedio(file);
    if (error) throw new Error(error);

    // Path único por subida: evita que el CDN sirva la versión anterior.
    const path = `proyecto-${proyectoId}/${Date.now()}-${nombreSeguro(file)}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl };
  }

  async removeByUrl(url: string): Promise<void> {
    const index = url.indexOf(PUBLIC_PREFIX);
    if (index === -1) return; // URL de otro origen: no intentamos borrar

    const path = decodeURIComponent(url.slice(index + PUBLIC_PREFIX.length).split("?")[0]);
    if (!path) return;

    await supabase.storage.from(BUCKET).remove([path]);
  }
}
