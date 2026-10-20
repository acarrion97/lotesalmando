import type {
  RegistrarInteresPublicoCommand,
  RegistrarInteresPublicoPort,
  RegistroInteresResult,
} from "@/application/prospectos/ports/RegistrarInteresPublicoPort";
import type { LotRepository } from "@/domain/lote/repositories";
import type { OportunidadRepository } from "@/domain/oportunidad/repositories";
import type { ProspectoRepository } from "@/domain/prospecto/repositories";

/**
 * Réplica en memoria de la RPC `mapa_publico_registrar_interes` para el modo
 * mock: mismas validaciones, misma deduplicación por email y la misma
 * oportunidad por lote. No es atómica como la RPC, pero el modo mock no
 * tiene transacciones.
 */
export class MockRegistrarInteresPublico implements RegistrarInteresPublicoPort {
  private readonly prospectoRepo: ProspectoRepository;
  private readonly oportunidadRepo: OportunidadRepository;
  private readonly lotRepo: LotRepository;

  constructor(
    prospectoRepo: ProspectoRepository,
    oportunidadRepo: OportunidadRepository,
    lotRepo: LotRepository,
  ) {
    this.prospectoRepo = prospectoRepo;
    this.oportunidadRepo = oportunidadRepo;
    this.lotRepo = lotRepo;
  }

  async execute(command: RegistrarInteresPublicoCommand): Promise<RegistroInteresResult> {
    const nombres = command.nombres.trim();
    const email = command.email.trim();
    const telefono = command.telefono.trim();

    if (nombres.length < 2) throw new Error("Ingrese su nombre");
    if (email === "" || !email.includes("@")) throw new Error("Ingrese un email válido");
    if (telefono.length < 5) throw new Error("Ingrese un teléfono válido");

    const lote = await this.lotRepo.getById(command.id_lote);
    if (!lote) throw new Error("El lote no pertenece a este proyecto");

    // El mock trabaja con una sola empresa de demostración.
    const idEmpresa = 1;
    const emailComparacion = email.toLowerCase();
    const prospectos = await this.prospectoRepo.getAll();
    const existente = prospectos.find((p) => p.email.trim().toLowerCase() === emailComparacion);

    let idProspecto: number;
    let reutilizado = false;

    if (existente) {
      idProspecto = existente.id_prospecto;
      reutilizado = true;
      if (!existente.telefono) {
        await this.prospectoRepo.update(idProspecto, { telefono });
      }
      if (existente.estado === "perdido") {
        await this.prospectoRepo.update(idProspecto, { estado: "nuevo" });
      }
    } else {
      const creado = await this.prospectoRepo.create({
        id_empresa: idEmpresa,
        id_asesor: null,
        nombres,
        email,
        telefono,
        origen: "mapa publico",
        estado: "nuevo",
        notas: `Registrado desde el mapa público: lote ${lote.numero_lote}`,
        fecha_ultimo_seguimiento: null,
      });
      idProspecto = creado.id_prospecto;
    }

    const oportunidades = await this.oportunidadRepo.getByProspectoId(idProspecto);
    const existenteOportunidad = oportunidades.find((o) => o.id_lote === command.id_lote);

    if (existenteOportunidad) {
      return { id_prospecto: idProspecto, id_oportunidad: existenteOportunidad.id_oportunidad, reutilizado };
    }

    const oportunidad = await this.oportunidadRepo.create({
      id_empresa: idEmpresa,
      id_prospecto: idProspecto,
      id_lote: command.id_lote,
      etapa: "interesado",
      valor_estimado: lote.precio_lista ?? 0,
      notas: "Interés registrado desde el mapa público",
    });

    return { id_prospecto: idProspecto, id_oportunidad: oportunidad.id_oportunidad, reutilizado };
  }
}
