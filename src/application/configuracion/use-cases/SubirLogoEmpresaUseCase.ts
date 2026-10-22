import type { ConfiguracionRepository } from "@/domain/configuracion/repositories";
import type { EmpresaLogoStorage } from "../ports/EmpresaLogoStorage";

export class SubirLogoEmpresaUseCase {
  private readonly configuracionRepo: ConfiguracionRepository;
  private readonly storage: EmpresaLogoStorage;

  constructor(
    configuracionRepo: ConfiguracionRepository,
    storage: EmpresaLogoStorage,
  ) {
    this.configuracionRepo = configuracionRepo;
    this.storage = storage;
  }

  async execute(empresaId: number, file: File): Promise<string> {
    if (!empresaId) throw new Error("No se pudo identificar la empresa");

    const anterior = await this.configuracionRepo.getByEmpresaId(empresaId);
    const { url } = await this.storage.upload(empresaId, file);

    try {
      await this.configuracionRepo.setLogo(empresaId, url);
    } catch (error) {
      await this.storage.removeByUrl(url).catch(() => undefined);
      throw error;
    }

    if (anterior?.logo_url && anterior.logo_url !== url) {
      await this.storage.removeByUrl(anterior.logo_url).catch(() => undefined);
    }

    return url;
  }
}
