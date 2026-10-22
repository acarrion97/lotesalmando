export interface EmpresaLogoStorage {
  upload(empresaId: number, file: File): Promise<{ url: string }>;
  removeByUrl(url: string): Promise<void>;
}
