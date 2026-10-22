import type { EmpresaLogoStorage } from "@/application/configuracion/ports/EmpresaLogoStorage";

const FORMATOS_ADMITIDOS = new Set(["image/png", "image/jpeg", "image/webp"]);
const TAMANO_MAXIMO = 10 * 1024 * 1024;

export class MockEmpresaLogoStorage implements EmpresaLogoStorage {
  async upload(_empresaId: number, file: File): Promise<{ url: string }> {
    if (!FORMATOS_ADMITIDOS.has(file.type)) {
      throw new Error("Formato no admitido: use PNG, JPG o WEBP");
    }
    if (file.size > TAMANO_MAXIMO) throw new Error("La imagen supera los 10 MB");
    return { url: URL.createObjectURL(file) };
  }

  async removeByUrl(url: string): Promise<void> {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}
