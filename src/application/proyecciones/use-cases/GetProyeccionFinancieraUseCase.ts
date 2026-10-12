import type { EtapaRepository } from "@/domain/etapa/repositories";
import type { ManzanaRepository } from "@/domain/manzana/repositories";
import type { LotRepository } from "@/domain/lote/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type {
  DatosBase,
  EtapaDisponible,
  ProyeccionFinancieraDto,
  ProyeccionOpciones,
} from "../dto/ProyeccionFinancieraDto";
import { calcularProyeccion } from "../modelos";

const FALLBACK_ENGANCHE_PCT = 10;
const FALLBACK_CUOTAS = 48;

function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const s = [...valores].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Proyecta ventas, valor contratado y flujo de caja de una etapa usando
 * exclusivamente datos reales de Supabase (lotes, precios y esquema de
 * cobranza observado en contratos y cobranzas).
 */
export class GetProyeccionFinancieraUseCase {
  private etapaRepo: EtapaRepository;
  private manzanaRepo: ManzanaRepository;
  private lotRepo: LotRepository;
  private ventaRepo: SaleRepository;
  private contratoRepo: ContractRepository;
  private cobranzaRepo: CobranzaRepository;

  constructor(
    etapaRepo: EtapaRepository,
    manzanaRepo: ManzanaRepository,
    lotRepo: LotRepository,
    ventaRepo: SaleRepository,
    contratoRepo: ContractRepository,
    cobranzaRepo: CobranzaRepository,
  ) {
    this.etapaRepo = etapaRepo;
    this.manzanaRepo = manzanaRepo;
    this.lotRepo = lotRepo;
    this.ventaRepo = ventaRepo;
    this.contratoRepo = contratoRepo;
    this.cobranzaRepo = cobranzaRepo;
  }

  async execute(opciones: ProyeccionOpciones): Promise<ProyeccionFinancieraDto> {
    const [etapas, manzanas, lotes, ventas, contratos, cobranzas] = await Promise.all([
      this.etapaRepo.getAll(),
      this.manzanaRepo.getAll(),
      this.lotRepo.getAll(),
      this.ventaRepo.getAll(),
      this.contratoRepo.getAll(),
      this.cobranzaRepo.getAll(),
    ]);

    const etapaDeManzana = new Map(manzanas.map((m) => [m.id_manzana, m.id_etapa]));
    const etapaById = new Map(etapas.map((e) => [e.id_etapa, e]));

    // Lotes por etapa (solo etapas que tengan lotes).
    const lotesPorEtapa = new Map<number, typeof lotes>();
    for (const l of lotes) {
      const idEtapa = etapaDeManzana.get(l.id_manzana);
      if (!idEtapa) continue;
      const lista = lotesPorEtapa.get(idEtapa);
      if (lista) lista.push(l);
      else lotesPorEtapa.set(idEtapa, [l]);
    }

    const etapasDisponibles: EtapaDisponible[] = [...lotesPorEtapa.entries()]
      .map(([id, ls]) => ({
        id_etapa: id,
        nombre: etapaById.get(id)?.nombre ?? `Etapa ${id}`,
        lotes: ls.length,
      }))
      .sort((a, b) => b.lotes - a.lotes);

    // Etapa elegida o, si no hay, la de más lotes.
    const idEtapa =
      opciones.etapaId && lotesPorEtapa.has(opciones.etapaId)
        ? opciones.etapaId
        : (etapasDisponibles[0]?.id_etapa ?? 0);

    const lotesEtapa = lotesPorEtapa.get(idEtapa) ?? [];

    const porEstado: Record<string, number> = {};
    for (const l of lotesEtapa) porEstado[l.estado] = (porEstado[l.estado] ?? 0) + 1;

    const precios = lotesEtapa
      .map((l) => Number(l.precio_lista))
      .filter((p) => Number.isFinite(p) && p > 0);
    const precioPromedio = precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : 0;

    const vendidos = porEstado.vendido ?? 0;
    const datos: DatosBase = {
      idEtapa,
      nombreEtapa: etapaById.get(idEtapa)?.nombre ?? `Etapa ${idEtapa}`,
      totalLotes: lotesEtapa.length,
      vendidos,
      reservados: porEstado.reservado ?? 0,
      disponibles: porEstado.disponible ?? 0,
      precioPromedio,
      porProyectar: Math.max(0, lotesEtapa.length - vendidos),
      enganchePct: FALLBACK_ENGANCHE_PCT,
      cuotas: FALLBACK_CUOTAS,
    };

    // Esquema de cobranza real, mediano entre los contratos de esta etapa.
    const idsLoteEtapa = new Set(lotesEtapa.map((l) => l.id_lote));
    const idsVentaEtapa = new Set(
      ventas.filter((v) => idsLoteEtapa.has(v.id_lote)).map((v) => v.id_venta),
    );
    const cobPorContrato = new Map<number, typeof cobranzas>();
    for (const cb of cobranzas) {
      const lista = cobPorContrato.get(cb.id_contrato);
      if (lista) lista.push(cb);
      else cobPorContrato.set(cb.id_contrato, [cb]);
    }

    const enganches: number[] = [];
    const numCuotas: number[] = [];
    for (const cont of contratos) {
      if (!idsVentaEtapa.has(cont.id_venta) || !Number(cont.monto_total)) continue;
      const cuotas = cobPorContrato.get(cont.id_contrato);
      if (!cuotas || cuotas.length === 0) continue;
      const ordenadas = [...cuotas].sort((a, b) => a.numero_cuota - b.numero_cuota);
      enganches.push((Number(ordenadas[0].monto_cuota) / Number(cont.monto_total)) * 100);
      numCuotas.push(ordenadas.length - 1); // menos la cuota 1 (enganche)
    }

    const medEng = mediana(enganches.filter((x) => x > 0 && x < 100));
    const medCuotas = mediana(numCuotas.filter((x) => x > 0));
    if (medEng > 0) datos.enganchePct = Math.round(medEng * 100) / 100;
    if (medCuotas > 0) datos.cuotas = Math.round(medCuotas);

    const resultado = calcularProyeccion(datos, opciones);

    return {
      ...resultado,
      etapasDisponibles,
      esquemaReal: { enganchePct: datos.enganchePct, cuotas: datos.cuotas },
    };
  }
}
