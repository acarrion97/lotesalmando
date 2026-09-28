import { supabase } from "@/infrastructure/supabase/client";
import type {
  MapaImageStorage,
  SubirImagenInput,
  SubirImagenResult,
} from "@/application/mapas/ports/MapaImageStorage";

const BUCKET = "mapas";
/** Fragmento que separa el host del path dentro de la URL pública. */
const PUBLIC_PREFIX = "/storage/v1/object/public/mapas/";
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB (límite del bucket)

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
  return `${stem || "plano"}${extension}`.toLowerCase();
}

function extensionPorTipo(tipo: string): string {
  if (tipo === "image/png") return ".png";
  if (tipo === "image/webp") return ".webp";
  return ".jpg";
}

export class SupabaseMapaImageStorage implements MapaImageStorage {
  async upload({ proyectoId, file }: SubirImagenInput): Promise<SubirImagenResult> {
    if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen");
    if (file.size > TAMANO_MAXIMO) throw new Error("La imagen supera los 10 MB");

    // Path único por subida: evita que el CDN sirva la versión anterior.
    const path = `proyecto-${proyectoId}/${Date.now()}-${nombreSeguro(file)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;

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
