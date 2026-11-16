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

interface Fuentes {
  proyectoRepo: ProyectoRepository;
  lotRepository: LotRepository;
  saleRepo: SaleRepository;
  cobranzaRepo: CobranzaRepository;
  pagoRepo: PagoRepository;
  clienteRepo: ClienteRepository;
  asesorRepo: AsesorRepository;
}

/**
 * Mismo agregado que la RPC `dashboard_estadisticas` (migración 055), pero
 * calculado sobre los repositorios en memoria del modo demo.
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

  async execute(): Promise<EstadisticasDashboard> {
    const {
      proyectoRepo,
      lotRepository,
      saleRepo,
      cobranzaRepo,
      pagoRepo,
      clienteRepo,
      asesorRepo,
    } = this.fuentes;

    const [proyectos, lotes, ventas, cobranzas, pagos, clientes, asesores] = await Promise.all([
      proyectoRepo.getAll(),
      lotRepository.getAll(),
      saleRepo.getAll(),
      cobranzaRepo.getAll(),
      pagoRepo.getAll(),
      clienteRepo.getAll(),
      asesorRepo.getAll(),
    ]);

    const porEstado: Record<string, number> = {};
    for (const lote of lotes) {
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

    const ventasMesActual = ventas.filter(
      (v) => esVentaRealizada(v.estado) && delMesActual(new Date(v.created_at ?? "")),
    );
    const ventasMesAnterior = ventas.filter(
      (v) => esVentaRealizada(v.estado) && delMesAnterior(new Date(v.created_at ?? "")),
    );
    const valorVendido =
      ventas
        .filter((v) => esVentaRealizada(v.estado))
        .reduce((sum, v) => sum + Math.round(v.precio_final * 100), 0) / 100;

    const sumaPorEstado = (estado: string) =>
      cobranzas.filter((c) => c.estado === estado).reduce((sum, c) => sum + c.monto_cuota, 0);
    const cuentaPorEstado = (estado: string) => cobranzas.filter((c) => c.estado === estado).length;

    const cobranzasTotal = cobranzas.reduce((sum, c) => sum + c.monto_cuota, 0);

    return {
      proyectos: proyectos
        .map((p) => ({ id_proyecto: p.id_proyecto, nombre: p.nombre }))
        .sort((a, b) => a.id_proyecto - b.id_proyecto),
      lotes: { total: lotes.length, por_estado: porEstado },
      ventas: {
        mes_actual: ventasMesActual.length,
        mes_anterior: ventasMesAnterior.length,
        valor_vendido: valorVendido,
      },
      cartera: {
        total: cobranzas.length,
        pendiente: cuentaPorEstado("pendiente"),
        pagada: cuentaPorEstado("pagada"),
        vencida: cuentaPorEstado("vencida"),
        monto_total: cobranzasTotal,
        monto_pendiente: sumaPorEstado("pendiente"),
        monto_pagado: sumaPorEstado("pagada"),
        monto_vencido: sumaPorEstado("vencida"),
      },
      pagos: { total: pagos.reduce((sum, p) => sum + p.monto_pagado, 0) },
      clientes: clientes.length,
      asesores_activos: asesores.filter((a) => a.estado === "activo").length,
      generado_en: new Date().toISOString(),
    };
  }
}
