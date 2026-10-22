import type { ConfiguracionRepository } from "@/domain/configuracion/repositories";
import type { EmpresaLogoStorage } from "../ports/EmpresaLogoStorage";

export class QuitarLogoEmpresaUseCase {
  private readonly configuracionRepo: ConfiguracionRepository;
  private readonly storage: EmpresaLogoStorage;

  constructor(
    configuracionRepo: ConfiguracionRepository,
    storage: EmpresaLogoStorage,
  ) {
    this.configuracionRepo = configuracionRepo;
    this.storage = storage;
  }

  async execute(empresaId: number): Promise<void> {
    if (!empresaId) throw new Error("No se pudo identificar la empresa");

    const actual = await this.configuracionRepo.getByEmpresaId(empresaId);
    if (!actual?.logo_url) return;

    await this.configuracionRepo.setLogo(empresaId, null);
    await this.storage.removeByUrl(actual.logo_url).catch(() => undefined);
  }
}
