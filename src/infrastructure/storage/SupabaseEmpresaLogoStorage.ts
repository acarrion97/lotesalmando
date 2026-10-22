import type { EmpresaLogoStorage } from "@/application/configuracion/ports/EmpresaLogoStorage";
import { supabase } from "@/infrastructure/supabase/client";

const BUCKET = "logos-empresa";
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;
const TAMANO_MAXIMO = 10 * 1024 * 1024;
const FORMATOS_ADMITIDOS = new Set(["image/png", "image/jpeg", "image/webp"]);

function extensionPorTipo(tipo: string): string {
  if (tipo === "image/png") return ".png";
  if (tipo === "image/webp") return ".webp";
  return ".jpg";
}

export class SupabaseEmpresaLogoStorage implements EmpresaLogoStorage {
  async upload(empresaId: number, file: File): Promise<{ url: string }> {
    if (!FORMATOS_ADMITIDOS.has(file.type)) {
      throw new Error("Formato no admitido: use PNG, JPG o WEBP");
    }
    if (file.size > TAMANO_MAXIMO) throw new Error("La imagen supera los 10 MB");

    const path = `empresa-${empresaId}/${crypto.randomUUID()}${extensionPorTipo(file.type)}`;
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
    if (index === -1) return;

    const path = decodeURIComponent(url.slice(index + PUBLIC_PREFIX.length).split("?")[0]);
    if (!path) return;

    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
  }
}
