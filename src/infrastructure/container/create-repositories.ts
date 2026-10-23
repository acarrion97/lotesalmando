import type { EmpresaRepository } from "@/domain/empresa/repositories";
import type { PlanRepository } from "@/domain/plan/repositories";
import type { PartnershipRepository } from "@/domain/partnership/repositories";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";
import type { LotRepository } from "@/domain/lote/repositories";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { PagoRepository } from "@/domain/pago/repositories";
import type { EntradaReservaRepository } from "@/domain/entrada/repositories";
import type { UsuarioRepository } from "@/domain/usuario/repositories";
import type { InventarioRepository } from "@/domain/inventario/repositories";
import type { EtapaRepository } from "@/domain/etapa/repositories";
import type { ManzanaRepository } from "@/domain/manzana/repositories";
import type { ProspectoRepository } from "@/domain/prospecto/repositories";
import type { OportunidadRepository } from "@/domain/oportunidad/repositories";
import type { ActividadRepository } from "@/domain/actividad/repositories";
import type { AsesorRepository } from "@/domain/asesor/repositories";
import type { RolRepository } from "@/domain/rol/repositories";
import type { ConfiguracionRepository } from "@/domain/configuracion/repositories";
import type { ConfiguracionContratoRepository } from "@/domain/configuracion/repositories";
import type { MapaRepository } from "@/domain/mapa/repositories";
import type { ProyectoMedioRepository } from "@/domain/proyecto/repositories";
import type { MapaImageStorage } from "@/application/mapas/ports/MapaImageStorage";
import type { ComprobanteRepository } from "@/domain/comprobante/repositories";
import type { PortalClienteRepository } from "@/domain/portal/repositories";
import type { PortalProspectoRepository } from "@/domain/portalProspecto/repositories";
import type { DocumentoProspectoRepository } from "@/domain/portalProspecto/repositories";
import type { ComprobanteStorage } from "@/application/comprobantes/ports/ComprobanteStorage";
import type { PortalProspectoStorage } from "@/application/portalProspecto/ports/PortalProspectoStorage";
import type { DocumentoContratoStorage } from "@/application/contratos/ports/DocumentoContratoStorage";
import type { PlanImagenStorage } from "@/application/plan/ports/PlanImagenStorage";
import type { EmpresaLogoStorage } from "@/application/configuracion/ports/EmpresaLogoStorage";
import type { ProyectoMedioStorage } from "@/application/proyectos/ports/ProyectoMedioStorage";
import type { AceptarCotizacionPort } from "@/application/cotizaciones/ports/AceptarCotizacionPort";
import type { RegistrarInteresPublicoPort } from "@/application/prospectos/ports/RegistrarInteresPublicoPort";
import type { Prospecto } from "@/domain/prospecto/entities";
import type { Oportunidad } from "@/domain/oportunidad/entities";
import type { Actividad } from "@/domain/actividad/entities";
import type { Asesor } from "@/domain/asesor/entities";
import type { ReciboRepository } from "@/domain/recibo/repositories";
import type { ConfirmarPagoConRecibo } from "@/application/recibos/ports/ConfirmarPagoConRecibo";
import type { EmitirReciboPagoPrevio as EmitirReciboPagoPrevioPort } from "@/application/recibos/ports/EmitirReciboPagoPrevio";

import { MockEmpresaRepository } from "@/infrastructure/repositories/mock/MockEmpresaRepository";
import { MockPlanRepository } from "@/infrastructure/repositories/mock/MockPlanRepository";
import { MockPartnershipRepository } from "@/infrastructure/repositories/mock/MockPartnershipRepository";
import { MockProyectoRepository } from "@/infrastructure/repositories/mock/MockProyectoRepository";
import { MockLotRepository } from "@/infrastructure/repositories/mock/MockLotRepository";
import { MockClienteRepository } from "@/infrastructure/repositories/mock/MockClienteRepository";
import { MockCotizacionRepository } from "@/infrastructure/repositories/mock/MockCotizacionRepository";
import { MockSaleRepository } from "@/infrastructure/repositories/mock/MockSaleRepository";
import { MockContractRepository } from "@/infrastructure/repositories/mock/MockContractRepository";
import { MockCobranzaRepository } from "@/infrastructure/repositories/mock/MockCobranzaRepository";
import { MockPagoRepository } from "@/infrastructure/repositories/mock/MockPagoRepository";
import { MockReciboRepository } from "@/infrastructure/repositories/mock/MockReciboRepository";
import { MockEntradaReservaRepository } from "@/infrastructure/repositories/mock/MockEntradaReservaRepository";
import { MockUsuarioRepository } from "@/infrastructure/repositories/mock/MockUsuarioRepository";
import { MockInventarioRepository } from "@/infrastructure/repositories/mock/MockInventarioRepository";
import { MockEtapaRepository } from "@/infrastructure/repositories/mock/MockEtapaRepository";
import { MockManzanaRepository } from "@/infrastructure/repositories/mock/MockManzanaRepository";
import { MockRolRepository } from "@/infrastructure/repositories/mock/MockRolRepository";
import { MockConfiguracionRepository } from "@/infrastructure/repositories/mock/MockConfiguracionRepository";
import { MockConfiguracionContratoRepository } from "@/infrastructure/repositories/mock/MockConfiguracionContratoRepository";
import { MockMapaRepository } from "@/infrastructure/repositories/mock/MockMapaRepository";
import { MockProyectoMedioRepository } from "@/infrastructure/repositories/mock/MockProyectoMedioRepository";
import { MockMapaImageStorage } from "@/infrastructure/storage/MockMapaImageStorage";
import { MockComprobanteRepository } from "@/infrastructure/repositories/mock/MockComprobanteRepository";
import { MockPortalClienteRepository } from "@/infrastructure/repositories/mock/MockPortalClienteRepository";
import { MockPortalProspectoRepository } from "@/infrastructure/repositories/mock/MockPortalProspectoRepository";
import { MockDocumentoProspectoRepository } from "@/infrastructure/repositories/mock/MockDocumentoProspectoRepository";
import { MockComprobanteStorage } from "@/infrastructure/storage/MockComprobanteStorage";
import { MockPortalProspectoStorage } from "@/infrastructure/storage/MockPortalProspectoStorage";
import { MockDocumentoContratoStorage } from "@/infrastructure/storage/MockDocumentoContratoStorage";
import { MockPlanImagenStorage } from "@/infrastructure/storage/MockPlanImagenStorage";
import { MockEmpresaLogoStorage } from "@/infrastructure/storage/MockEmpresaLogoStorage";
import { MockProyectoMedioStorage } from "@/infrastructure/storage/MockProyectoMedioStorage";
import { MockAceptarCotizacion } from "@/infrastructure/transactions/MockAceptarCotizacion";
import { SupabaseAceptarCotizacion } from "@/infrastructure/transactions/SupabaseAceptarCotizacion";
import { MockRegistrarInteresPublico } from "@/infrastructure/transactions/MockRegistrarInteresPublico";
import { SupabaseRegistrarInteresPublico } from "@/infrastructure/transactions/SupabaseRegistrarInteresPublico";
import { MockConfirmarPagoConRecibo } from "@/infrastructure/transactions/MockConfirmarPagoConRecibo";
import { SupabaseConfirmarPagoConRecibo } from "@/infrastructure/transactions/SupabaseConfirmarPagoConRecibo";
import { MockEmitirReciboPagoPrevio } from "@/infrastructure/transactions/MockEmitirReciboPagoPrevio";
import { SupabaseEmitirReciboPagoPrevio } from "@/infrastructure/transactions/SupabaseEmitirReciboPagoPrevio";

import { SupabaseEmpresaRepository } from "@/infrastructure/repositories/supabase/SupabaseEmpresaRepository";
import { SupabasePlanRepository } from "@/infrastructure/repositories/supabase/SupabasePlanRepository";
import { SupabasePartnershipRepository } from "@/infrastructure/repositories/supabase/SupabasePartnershipRepository";
import { SupabaseProyectoRepository } from "@/infrastructure/repositories/supabase/SupabaseProyectoRepository";
import { SupabaseLotRepository } from "@/infrastructure/repositories/supabase/SupabaseLotRepository";
import { SupabaseClienteRepository } from "@/infrastructure/repositories/supabase/SupabaseClienteRepository";
import { SupabaseCotizacionRepository } from "@/infrastructure/repositories/supabase/SupabaseCotizacionRepository";
import { SupabaseSaleRepository } from "@/infrastructure/repositories/supabase/SupabaseSaleRepository";
import { SupabaseContractRepository } from "@/infrastructure/repositories/supabase/SupabaseContractRepository";
import { SupabaseCobranzaRepository } from "@/infrastructure/repositories/supabase/SupabaseCobranzaRepository";
import { SupabasePagoRepository } from "@/infrastructure/repositories/supabase/SupabasePagoRepository";
import { SupabaseReciboRepository } from "@/infrastructure/repositories/supabase/SupabaseReciboRepository";
import { SupabaseEntradaReservaRepository } from "@/infrastructure/repositories/supabase/SupabaseEntradaReservaRepository";
import { SupabaseUsuarioRepository } from "@/infrastructure/repositories/supabase/SupabaseUsuarioRepository";
import { SupabaseInventarioRepository } from "@/infrastructure/repositories/supabase/SupabaseInventarioRepository";
import { SupabaseEtapaRepository } from "@/infrastructure/repositories/supabase/SupabaseEtapaRepository";
import { SupabaseManzanaRepository } from "@/infrastructure/repositories/supabase/SupabaseManzanaRepository";
import { SupabaseProspectoRepository } from "@/infrastructure/repositories/supabase/SupabaseProspectoRepository";
import { SupabaseOportunidadRepository } from "@/infrastructure/repositories/supabase/SupabaseOportunidadRepository";
import { SupabaseActividadRepository } from "@/infrastructure/repositories/supabase/SupabaseActividadRepository";
import { SupabaseAsesorRepository } from "@/infrastructure/repositories/supabase/SupabaseAsesorRepository";
import { SupabaseRolRepository } from "@/infrastructure/repositories/supabase/SupabaseRolRepository";
import { SupabaseConfiguracionRepository } from "@/infrastructure/repositories/supabase/SupabaseConfiguracionRepository";
import { SupabaseEmpresaLogoStorage } from "@/infrastructure/storage/SupabaseEmpresaLogoStorage";
import { SupabaseConfiguracionContratoRepository } from "@/infrastructure/repositories/supabase/SupabaseConfiguracionContratoRepository";
import { SupabaseMapaRepository } from "@/infrastructure/repositories/supabase/SupabaseMapaRepository";
import { SupabaseProyectoMedioRepository } from "@/infrastructure/repositories/supabase/SupabaseProyectoMedioRepository";
import { SupabaseMapaImageStorage } from "@/infrastructure/storage/SupabaseMapaImageStorage";
import { SupabaseComprobanteRepository } from "@/infrastructure/repositories/supabase/SupabaseComprobanteRepository";
import { SupabasePortalClienteRepository } from "@/infrastructure/repositories/supabase/SupabasePortalClienteRepository";
import { SupabasePortalProspectoRepository } from "@/infrastructure/repositories/supabase/SupabasePortalProspectoRepository";
import { SupabaseDocumentoProspectoRepository } from "@/infrastructure/repositories/supabase/SupabaseDocumentoProspectoRepository";
import { SupabaseComprobanteStorage } from "@/infrastructure/storage/SupabaseComprobanteStorage";
import { SupabasePortalProspectoStorage } from "@/infrastructure/storage/SupabasePortalProspectoStorage";
import { SupabaseDocumentoContratoStorage } from "@/infrastructure/storage/SupabaseDocumentoContratoStorage";
import { SupabasePlanImagenStorage } from "@/infrastructure/storage/SupabasePlanImagenStorage";
import { SupabaseProyectoMedioStorage } from "@/infrastructure/storage/SupabaseProyectoMedioStorage";

export interface Repositories {
  empresaRepo: EmpresaRepository;
  planRepo: PlanRepository;
  partnershipRepo: PartnershipRepository;
  proyectoRepo: ProyectoRepository;
  lotRepository: LotRepository;
  clienteRepo: ClienteRepository;
  cotizacionRepo: CotizacionRepository;
  saleRepo: SaleRepository;
  contractRepo: ContractRepository;
  cobranzaRepo: CobranzaRepository;
  pagoRepo: PagoRepository;
  reciboRepo: ReciboRepository;
  confirmarPagoConRecibo: ConfirmarPagoConRecibo;
  /**
   * Emite el recibo de un pago registrado antes del cambio de recibos
   * (RPC 044 en Supabase / misma lógica fiscal en el modo demo).
   */
  emitirReciboPagoPrevio: EmitirReciboPagoPrevioPort;
  /** Entradas (señas) cobradas al reservar un lote; no apuntan a cuota. */
  entradaRepo: EntradaReservaRepository;
  usuarioRepo: UsuarioRepository;
  inventarioRepo: InventarioRepository;
  etapaRepo: EtapaRepository;
  manzanaRepo: ManzanaRepository;
  prospectoRepo: ProspectoRepository;
  oportunidadRepo: OportunidadRepository;
  actividadRepo: ActividadRepository;
  asesorRepo: AsesorRepository;
  rolRepo: RolRepository;
  configuracionRepo: ConfiguracionRepository;
  empresaLogoStorage: EmpresaLogoStorage;
  /** Datos legales del contrato por proyecto (respaldo: configuración de empresa). */
  configuracionContratoRepo: ConfiguracionContratoRepository;
  mapaRepo: MapaRepository;
  /** Puerto de infraestructura: subida de la imagen del plano a Storage. */
  mapaImageStorage: MapaImageStorage;
  comprobanteRepo: ComprobanteRepository;
  portalClienteRepo: PortalClienteRepository;
  /** Puerta del portal de prospectos (RPCs 044, rol anon). */
  portalProspectoRepo: PortalProspectoRepository;
  /** Documentación enviada por el portal, para revisión del backoffice (RLS por empresa). */
  documentoProspectoRepo: DocumentoProspectoRepository;
  comprobanteStorage: ComprobanteStorage;
  /** Puerto de infraestructura: subida de documentos del portal de prospectos. */
  portalProspectoStorage: PortalProspectoStorage;
  documentoContratoStorage: DocumentoContratoStorage;
  planImageStorage: PlanImagenStorage;
  /** Fotos y videos del proyecto que alimentan la galería pública. */
  proyectoMedioRepo: ProyectoMedioRepository;
  /** Puerto de infraestructura: subida de fotos/videos a Storage. */
  proyectoMedioStorage: ProyectoMedioStorage;
  /** Puerto de infraestructura: aceptación atómica de una cotización (RPC en Supabase). */
  aceptarCotizacion: AceptarCotizacionPort;
  /** Puerto de infraestructura: registro de interés del mapa público (RPC en Supabase). */
  registrarInteresPublico: RegistrarInteresPublicoPort;
}

function createMockRepositories(): Repositories {
  const cotizacionRepo = new MockCotizacionRepository();
  const lotRepository = new MockLotRepository();
  const saleRepo = new MockSaleRepository();
  const contractRepo = new MockContractRepository();
  // Recibe contrato + venta para emular el trigger que pasa la venta a
  // 'completada' cuando todas sus cuotas quedan pagadas (migración 040).
  const cobranzaRepo = new MockCobranzaRepository(contractRepo, saleRepo);
  const pagoRepo = new MockPagoRepository();
  const reciboRepo = new MockReciboRepository();
  const empresaRepo = new MockEmpresaRepository();
  const proyectoRepo = new MockProyectoRepository();
  const clienteRepo = new MockClienteRepository();
  const manzanaRepo = new MockManzanaRepository();
  const etapaRepo = new MockEtapaRepository();
  const configuracionContratoRepo = new MockConfiguracionContratoRepository();
  const comprobanteRepo = new MockComprobanteRepository();
  const inventarioRepo = new MockInventarioRepository();
  const aceptarCotizacion = new MockAceptarCotizacion(
    cotizacionRepo,
    lotRepository,
    saleRepo,
    inventarioRepo,
    contractRepo,
    cobranzaRepo,
  );
  const confirmarPagoConRecibo = new MockConfirmarPagoConRecibo(
    cobranzaRepo,
    pagoRepo,
    comprobanteRepo,
    reciboRepo,
    configuracionContratoRepo,
    contractRepo,
    saleRepo,
    clienteRepo,
    lotRepository,
    manzanaRepo,
    etapaRepo,
    proyectoRepo,
    empresaRepo,
  );
  // Emisión de recibos para pagos antiguos: misma numeración y validaciones
  // que la confirmación normal, compartiendo el contador del repositorio.
  const emitirReciboPagoPrevio = new MockEmitirReciboPagoPrevio(
    pagoRepo,
    cobranzaRepo,
    reciboRepo,
    configuracionContratoRepo,
    contractRepo,
    saleRepo,
    clienteRepo,
    lotRepository,
    manzanaRepo,
    etapaRepo,
    proyectoRepo,
    empresaRepo,
  );

  const prospectoRepo: ProspectoRepository = {
    getAll: async () => [],
    getByEmpresaId: async () => [],
    getById: async () => null,
    create: async (data: Omit<Prospecto, "id_prospecto" | "created_at">): Promise<Prospecto> => ({
      ...data,
      id_prospecto: 1,
      created_at: "",
    }),
    update: async (_id: number, data: Partial<Prospecto>): Promise<Prospecto> => ({
      ...data,
      id_prospecto: 1,
      id_empresa: data.id_empresa ?? 1,
      id_asesor: data.id_asesor ?? null,
      nombres: data.nombres ?? "",
      email: data.email ?? "",
      telefono: data.telefono ?? "",
      origen: data.origen ?? "",
      estado: data.estado ?? "nuevo",
      notas: data.notas ?? "",
      fecha_ultimo_seguimiento: data.fecha_ultimo_seguimiento ?? null,
      created_at: "",
    }),
    delete: async () => {},
  };

  const oportunidadRepo: OportunidadRepository = {
    getAll: async () => [],
    getByEmpresaId: async () => [],
    getByProspectoId: async () => [],
    getByLoteId: async () => [],
    getById: async () => null,
    create: async (
      data: Omit<Oportunidad, "id_oportunidad" | "created_at">,
    ): Promise<Oportunidad> => ({
      ...data,
      id_oportunidad: 1,
      created_at: "",
    }),
    update: async (_id: number, data: Partial<Oportunidad>): Promise<Oportunidad> => ({
      ...data,
      id_oportunidad: 1,
      id_empresa: data.id_empresa ?? 1,
      id_prospecto: data.id_prospecto ?? 1,
      id_lote: data.id_lote ?? null,
      etapa: data.etapa ?? "contactado",
      valor_estimado: data.valor_estimado ?? 0,
      notas: data.notas ?? "",
      created_at: "",
    }),
    delete: async () => {},
  };

  const actividadRepo: ActividadRepository = {
    getByProspectoId: async () => [],
    create: async (data: Omit<Actividad, "id_actividad" | "created_at">): Promise<Actividad> => ({
      ...data,
      id_actividad: 1,
      created_at: "",
    }),
  };

  const asesorRepo: AsesorRepository = {
    getAll: async () => [],
    getByEmpresaId: async () => [],
    getById: async () => null,
    create: async (data: Omit<Asesor, "id_asesor" | "created_at">): Promise<Asesor> => ({
      ...data,
      id_asesor: 1,
      created_at: "",
    }),
    update: async (_id: number, data: Partial<Asesor>): Promise<Asesor> => ({
      ...data,
      id_asesor: 1,
      id_empresa: data.id_empresa ?? 1,
      id_usuario: data.id_usuario ?? null,
      codigo: data.codigo ?? "",
      nombre_comercial: data.nombre_comercial ?? "",
      meta_ventas_mensual: data.meta_ventas_mensual ?? 0,
      estado: data.estado ?? "activo",
      created_at: "",
    }),
    delete: async () => {},
  };

  return {
    empresaRepo,
    planRepo: new MockPlanRepository(),
    partnershipRepo: new MockPartnershipRepository(),
    proyectoRepo,
    lotRepository,
    clienteRepo,
    cotizacionRepo,
    saleRepo,
    contractRepo,
    cobranzaRepo,
    inventarioRepo,
    pagoRepo,
    reciboRepo,
    confirmarPagoConRecibo,
    emitirReciboPagoPrevio,
    entradaRepo: new MockEntradaReservaRepository(),
    usuarioRepo: new MockUsuarioRepository(),
    aceptarCotizacion,
    etapaRepo,
    manzanaRepo,
    prospectoRepo,
    oportunidadRepo,
    registrarInteresPublico: new MockRegistrarInteresPublico(
      prospectoRepo,
      oportunidadRepo,
      lotRepository,
    ),
    actividadRepo,
    asesorRepo,
    rolRepo: new MockRolRepository(),
    configuracionRepo: new MockConfiguracionRepository(),
    empresaLogoStorage: new MockEmpresaLogoStorage(),
    configuracionContratoRepo,
    mapaRepo: new MockMapaRepository(),
    mapaImageStorage: new MockMapaImageStorage(),
    planImageStorage: new MockPlanImagenStorage(),
    proyectoMedioRepo: new MockProyectoMedioRepository(),
    proyectoMedioStorage: new MockProyectoMedioStorage(),
    comprobanteRepo,
    portalClienteRepo: new MockPortalClienteRepository(),
    portalProspectoRepo: new MockPortalProspectoRepository(),
    documentoProspectoRepo: new MockDocumentoProspectoRepository(),
    comprobanteStorage: new MockComprobanteStorage(),
    portalProspectoStorage: new MockPortalProspectoStorage(),
    documentoContratoStorage: new MockDocumentoContratoStorage(),
  };
}

function createSupabaseRepositories(): Repositories {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase provider selected but VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.",
    );
  }

  const reciboRepo = new SupabaseReciboRepository();
  const confirmarPagoConRecibo = new SupabaseConfirmarPagoConRecibo();
  const emitirReciboPagoPrevio = new SupabaseEmitirReciboPagoPrevio();

  return {
    empresaRepo: new SupabaseEmpresaRepository(),
    planRepo: new SupabasePlanRepository(),
    partnershipRepo: new SupabasePartnershipRepository(),
    proyectoRepo: new SupabaseProyectoRepository(),
    lotRepository: new SupabaseLotRepository(),
    clienteRepo: new SupabaseClienteRepository(),
    cotizacionRepo: new SupabaseCotizacionRepository(),
    saleRepo: new SupabaseSaleRepository(),
    contractRepo: new SupabaseContractRepository(),
    cobranzaRepo: new SupabaseCobranzaRepository(),
    pagoRepo: new SupabasePagoRepository(),
    reciboRepo,
    confirmarPagoConRecibo,
    emitirReciboPagoPrevio,
    entradaRepo: new SupabaseEntradaReservaRepository(),
    usuarioRepo: new SupabaseUsuarioRepository(),
    inventarioRepo: new SupabaseInventarioRepository(),
    etapaRepo: new SupabaseEtapaRepository(),
    manzanaRepo: new SupabaseManzanaRepository(),
    prospectoRepo: new SupabaseProspectoRepository(),
    oportunidadRepo: new SupabaseOportunidadRepository(),
    actividadRepo: new SupabaseActividadRepository(),
    asesorRepo: new SupabaseAsesorRepository(),
    rolRepo: new SupabaseRolRepository(),
    configuracionRepo: new SupabaseConfiguracionRepository(),
    empresaLogoStorage: new SupabaseEmpresaLogoStorage(),
    configuracionContratoRepo: new SupabaseConfiguracionContratoRepository(),
    mapaRepo: new SupabaseMapaRepository(),
    mapaImageStorage: new SupabaseMapaImageStorage(),
    planImageStorage: new SupabasePlanImagenStorage(),
    proyectoMedioRepo: new SupabaseProyectoMedioRepository(),
    proyectoMedioStorage: new SupabaseProyectoMedioStorage(),
    aceptarCotizacion: new SupabaseAceptarCotizacion(),
    registrarInteresPublico: new SupabaseRegistrarInteresPublico(),
    comprobanteRepo: new SupabaseComprobanteRepository(),
    portalClienteRepo: new SupabasePortalClienteRepository(),
    portalProspectoRepo: new SupabasePortalProspectoRepository(),
    documentoProspectoRepo: new SupabaseDocumentoProspectoRepository(),
    comprobanteStorage: new SupabaseComprobanteStorage(),
    portalProspectoStorage: new SupabasePortalProspectoStorage(),
    documentoContratoStorage: new SupabaseDocumentoContratoStorage(),
  };
}

function resolveDataProvider(): "mock" | "supabase" {
  const provider = String(import.meta.env.VITE_DATA_PROVIDER ?? "")
    .trim()
    .toLowerCase();

  if (provider === "" || provider === "supabase") {
    return "supabase";
  }

  if (provider === "mock") {
    return "mock";
  }

  throw new Error(`Unsupported VITE_DATA_PROVIDER "${provider}". Expected "supabase" or "mock".`);
}

export function createRepositories(): Repositories {
  const provider = resolveDataProvider();

  switch (provider) {
    case "supabase":
      return createSupabaseRepositories();
    case "mock":
      return createMockRepositories();
  }
}
