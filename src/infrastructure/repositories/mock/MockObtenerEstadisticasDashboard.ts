import type {
  ObtenerEstadisticasDashboard,
  EstadisticasDashboard,
} from "@/application/dashboard/ports/ObtenerEstadisticasDashboard";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";
import type { LotRepository } from "@/domain/lote/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { PagoRepository } from "@/domain/pago/repositories";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { AsesorRepository } from "@/domain/asesor/repositories";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { EtapaRepository } from "@/domain/etapa/repositories";
import type { ManzanaRepository } from "@/domain/manzana/repositories";

interface Fuentes {
  proyectoRepo: ProyectoRepository;
  lotRepository: LotRepository;
  saleRepo: SaleRepository;
  cobranzaRepo: CobranzaRepository;
  pagoRepo: PagoRepository;
  clienteRepo: ClienteRepository;
  asesorRepo: AsesorRepository;
  contractRepo: ContractRepository;
  etapaRepo: EtapaRepository;
  manzanaRepo: ManzanaRepository;
}

/**
 * Mismo agregado que la RPC `dashboard_estadisticas` (migraciones 055/056),
 * pero calculado sobre los repositorios en memoria del modo demo.
 *
 * Nota de alcance: en demo no se replica el filtro por asesor de
 * `useAlcanceRegistros` (el puerto no ve permisos); siempre devuelve todas
 * las ventas de la empresa, que es lo que ve un Administrador/Gerente.
 */
export class MockObtenerEstadisticasDashboard implements ObtenerEstadisticasDashboard {
  private readonly fuentes: Fuentes;

  constructor(fuentes: Fuentes) {
    this.fuentes = fuentes;
  }

  async execute(idProyecto?: number | null): Promise<EstadisticasDashboard> {
    const {
      proyectoRepo,
      lotRepository,
      saleRepo,
      cobranzaRepo,
      pagoRepo,
      clienteRepo,
      asesorRepo,
      contractRepo,
      etapaRepo,
      manzanaRepo,
    } = this.fuentes;

    const [proyectos, lotes, ventas, cobranzas, pagos, clientes, asesores, etapas, manzanas, contratos] =
      await Promise.all([
        proyectoRepo.getAll(),
        lotRepository.getAll(),
        saleRepo.getAll(),
        cobranzaRepo.getAll(),
        pagoRepo.getAll(),
        clienteRepo.getAll(),
        asesorRepo.getAll(),
        etapaRepo.getAll(),
        manzanaRepo.getAll(),
        contractRepo.getAll(),
      ]);

    // -------------------------------------------------------
    // Índice lote -> proyecto (misma cadena que la RPC)
    //   lote -> manzana_bloque -> etapas -> proyectos
    // Solo se construye si hay filtro; sin filtro no cuesta nada.
    // -------------------------------------------------------
    const proyectoFiltrado = idProyecto ?? null;
    const proyectoDeLote = new Map<number, number>();
    const idLoteDeVenta = new Map<number, number>();
    const idVentaDeContrato = new Map<number, number>();
    const idContratoDeCobranza = new Map<number, number>();

    if (proyectoFiltrado !== null) {
      const proyectoDeEtapa = new Map(etapas.map((e) => [e.id_etapa, e.id_proyecto]));
      const proyectoDeManzana = new Map<number, number>();
      for (const manzana of manzanas) {
        const idEtapa = proyectoDeEtapa.get(manzana.id_etapa);
        if (idEtapa !== undefined) proyectoDeManzana.set(manzana.id_manzana, idEtapa);
      }
      for (const lote of lotes) {
        const idProyectoDelLote = proyectoDeManzana.get(lote.id_manzana);
        if (idProyectoDelLote !== undefined) proyectoDeLote.set(lote.id_lote, idProyectoDelLote);
      }
    }

    for (const venta of ventas) idLoteDeVenta.set(venta.id_venta, venta.id_lote);
    for (const contrato of contratos) idVentaDeContrato.set(contrato.id_contrato, contrato.id_venta);
    for (const cobranza of cobranzas) idContratoDeCobranza.set(cobranza.id_cobranza, cobranza.id_contrato);

    /** true sin filtro; con filtro, ¿el lote pertenece al proyecto? */
    const enProyecto = (idLote: number | undefined) =>
      proyectoFiltrado === null ||
      (idLote !== undefined && proyectoDeLote.get(idLote) === proyectoFiltrado);

    /** true sin filtro; con filtro, ¿la cuota cayó sobre un lote del proyecto? */
    const cobranzaEnProyecto = (idContrato: number | undefined) => {
      if (proyectoFiltrado === null) return true;
      if (idContrato === undefined) return false;
      const idVenta = idVentaDeContrato.get(idContrato);
      if (idVenta === undefined) return false;
      return enProyecto(idLoteDeVenta.get(idVenta));
    };

    /** true sin filtro; con filtro, ¿el pago recae sobre una cuota del proyecto? */
    const pagoEnProyecto = (idCobranza: number) =>
      proyectoFiltrado === null || cobranzaEnProyecto(idContratoDeCobranza.get(idCobranza));

    const lotesFiltrados =
      proyectoFiltrado === null ? lotes : lotes.filter((l) => enProyecto(l.id_lote));
    const ventasFiltradas =
      proyectoFiltrado === null ? ventas : ventas.filter((v) => enProyecto(v.id_lote));
    const cobranzasFiltradas =
      proyectoFiltrado === null
        ? cobranzas
        : cobranzas.filter((c) => cobranzaEnProyecto(c.id_contrato));
    const pagosFiltrados =
      proyectoFiltrado === null ? pagos : pagos.filter((p) => pagoEnProyecto(p.id_cobranza));

    const porEstado: Record<string, number> = {};
    for (const lote of lotesFiltrados) {
      porEstado[lote.estado] = (porEstado[lote.estado] ?? 0) + 1;
    }

    // Una venta cuenta como realizada tanto si esta completada como
    // pendiente; solo las canceladas quedan fuera (esVentaRealizada).
    const esVentaRealizada = (estado?: string | null) => {
      const e = (estado ?? "").trim().toLowerCase();
      return e === "completada" || e === "pendiente";
    };

    const ahora = new Date();
    const delMesActual = (fecha: Date) =>
      fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
    const delMesAnterior = (fecha: Date) => {
      const anio = ahora.getMonth() === 0 ? ahora.getFullYear() - 1 : ahora.getFullYear();
      const mes = ahora.getMonth() === 0 ? 11 : ahora.getMonth() - 1;
      return fecha.getMonth() === mes && fecha.getFullYear() === anio;
    };

    const ventasMesActual = ventasFiltradas.filter(
      (v) => esVentaRealizada(v.estado) && delMesActual(new Date(v.created_at ?? "")),
    );
    const ventasMesAnterior = ventasFiltradas.filter(
      (v) => esVentaRealizada(v.estado) && delMesAnterior(new Date(v.created_at ?? "")),
    );
    const valorVendido =
      ventasFiltradas
        .filter((v) => esVentaRealizada(v.estado))
        .reduce((sum, v) => sum + Math.round(v.precio_final * 100), 0) / 100;

    const sumaPorEstado = (estado: string) =>
      cobranzasFiltradas
        .filter((c) => c.estado === estado)
        .reduce((sum, c) => sum + c.monto_cuota, 0);
    const cuentaPorEstado = (estado: string) =>
      cobranzasFiltradas.filter((c) => c.estado === estado).length;

    const cobranzasTotal = cobranzasFiltradas.reduce((sum, c) => sum + c.monto_cuota, 0);

    return {
      // La lista de proyectos NUNCA se filtra: alimenta las opciones del
      // selector "Filtrar por proyecto" de la página.
      proyectos: proyectos
        .map((p) => ({ id_proyecto: p.id_proyecto, nombre: p.nombre }))
        .sort((a, b) => a.id_proyecto - b.id_proyecto),
      lotes: { total: lotesFiltrados.length, por_estado: porEstado },
      ventas: {
        mes_actual: ventasMesActual.length,
        mes_anterior: ventasMesAnterior.length,
        valor_vendido: valorVendido,
      },
      cartera: {
        total: cobranzasFiltradas.length,
        pendiente: cuentaPorEstado("pendiente"),
        pagada: cuentaPorEstado("pagada"),
        vencida: cuentaPorEstado("vencida"),
        monto_total: cobranzasTotal,
        monto_pendiente: sumaPorEstado("pendiente"),
        monto_pagado: sumaPorEstado("pagada"),
        monto_vencido: sumaPorEstado("vencida"),
      },
      pagos: { total: pagosFiltrados.reduce((sum, p) => sum + p.monto_pagado, 0) },
      // Clientes y asesores no tienen proyecto: a nivel de empresa.
      clientes: clientes.length,
      asesores_activos: asesores.filter((a) => a.estado === "activo").length,
      generado_en: new Date().toISOString(),
    };
  }
}
