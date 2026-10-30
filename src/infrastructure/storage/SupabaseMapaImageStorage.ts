import { supabase } from "@/infrastructure/supabase/client";
import type {
  MapaImageStorage,
  SubirImagenInput,
  SubirImagenResult,
} from "@/application/mapas/ports/MapaImageStorage";

const BUCKET = "mapas";
/** Fragmento que separa el host del path dentro de la URL pública. */
const PUBLIC_PREFIX = "/storage/v1/object/public/mapas/";
const TAMANO_MAXIMO_IMAGEN = 10 * 1024 * 1024;
const TAMANO_MAXIMO_MODELO = 50 * 1024 * 1024;
const EXTENSIONES_IMAGEN = [".png", ".jpg", ".jpeg", ".webp"];
const EXTENSIONES_MODELO = [".obj", ".glb", ".gltf", ".stl", ".fbx", ".dae"];

function esModelo(file: File, carpeta?: string): boolean {
  return (
    carpeta === "render-3d" &&
    EXTENSIONES_MODELO.some((ext) => file.name.toLowerCase().endsWith(ext))
  );
}

function extensionAdmitida(file: File, modelo: boolean): boolean {
  const extensiones = modelo ? EXTENSIONES_MODELO : EXTENSIONES_IMAGEN;
  return extensiones.some((ext) => file.name.toLowerCase().endsWith(ext));
}

function tipoContenido(file: File, modelo: boolean): string {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (modelo) {
    switch (extension) {
      case ".obj":
        return "model/obj";
      case ".glb":
        return "model/gltf-binary";
      case ".gltf":
        return "model/gltf+json";
      case ".stl":
        return "model/stl";
      case ".fbx":
        return "application/octet-stream";
      case ".dae":
        return "model/vnd.collada+xml";
    }
  }
  if (file.type) return file.type;
  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

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
  async upload({ proyectoId, file, carpeta }: SubirImagenInput): Promise<SubirImagenResult> {
    const modelo = esModelo(file, carpeta);
    if (!extensionAdmitida(file, modelo)) {
      throw new Error("La extensión del archivo no es válida");
    }
    if (!modelo && file.type && !file.type.startsWith("image/")) {
      throw new Error("El archivo debe ser una imagen");
    }
    const limite = modelo ? TAMANO_MAXIMO_MODELO : TAMANO_MAXIMO_IMAGEN;
    if (file.size > limite) {
      throw new Error(`El archivo supera los ${Math.round(limite / (1024 * 1024))} MB`);
    }

    // Path único por subida: evita que el CDN sirva la versión anterior.
    const subcarpeta = carpeta ? `${carpeta.replace(/[^a-zA-Z0-9_-]/g, "")}/` : "";
    const path = `proyecto-${proyectoId}/${subcarpeta}${Date.now()}-${nombreSeguro(file)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: tipoContenido(file, modelo),
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
