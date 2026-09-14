import type { EmpresaRepository } from "@/domain/empresa/repositories";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";
import type { LotRepository } from "@/domain/lote/repositories";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { PagoRepository } from "@/domain/pago/repositories";
import type { UsuarioRepository } from "@/domain/usuario/repositories";
import type { InventarioRepository } from "@/domain/inventario/repositories";
import type { EtapaRepository } from "@/domain/etapa/repositories";
import type { ManzanaRepository } from "@/domain/manzana/repositories";

import { MockEmpresaRepository } from "@/infrastructure/repositories/mock/MockEmpresaRepository";
import { MockProyectoRepository } from "@/infrastructure/repositories/mock/MockProyectoRepository";
import { MockLotRepository } from "@/infrastructure/repositories/mock/MockLotRepository";
import { MockClienteRepository } from "@/infrastructure/repositories/mock/MockClienteRepository";
import { MockCotizacionRepository } from "@/infrastructure/repositories/mock/MockCotizacionRepository";
import { MockSaleRepository } from "@/infrastructure/repositories/mock/MockSaleRepository";
import { MockContractRepository } from "@/infrastructure/repositories/mock/MockContractRepository";
import { MockCobranzaRepository } from "@/infrastructure/repositories/mock/MockCobranzaRepository";
import { MockPagoRepository } from "@/infrastructure/repositories/mock/MockPagoRepository";
import { MockUsuarioRepository } from "@/infrastructure/repositories/mock/MockUsuarioRepository";
import { MockInventarioRepository } from "@/infrastructure/repositories/mock/MockInventarioRepository";
import { MockEtapaRepository } from "@/infrastructure/repositories/mock/MockEtapaRepository";
import { MockManzanaRepository } from "@/infrastructure/repositories/mock/MockManzanaRepository";

import { SupabaseEmpresaRepository } from "@/infrastructure/repositories/supabase/SupabaseEmpresaRepository";
import { SupabaseProyectoRepository } from "@/infrastructure/repositories/supabase/SupabaseProyectoRepository";
import { SupabaseLotRepository } from "@/infrastructure/repositories/supabase/SupabaseLotRepository";
import { SupabaseClienteRepository } from "@/infrastructure/repositories/supabase/SupabaseClienteRepository";
import { SupabaseCotizacionRepository } from "@/infrastructure/repositories/supabase/SupabaseCotizacionRepository";
import { SupabaseSaleRepository } from "@/infrastructure/repositories/supabase/SupabaseSaleRepository";
import { SupabaseContractRepository } from "@/infrastructure/repositories/supabase/SupabaseContractRepository";
import { SupabaseCobranzaRepository } from "@/infrastructure/repositories/supabase/SupabaseCobranzaRepository";
import { SupabasePagoRepository } from "@/infrastructure/repositories/supabase/SupabasePagoRepository";
import { SupabaseUsuarioRepository } from "@/infrastructure/repositories/supabase/SupabaseUsuarioRepository";
import { SupabaseInventarioRepository } from "@/infrastructure/repositories/supabase/SupabaseInventarioRepository";
import { SupabaseEtapaRepository } from "@/infrastructure/repositories/supabase/SupabaseEtapaRepository";
import { SupabaseManzanaRepository } from "@/infrastructure/repositories/supabase/SupabaseManzanaRepository";

export interface Repositories {
  empresaRepo: EmpresaRepository;
  proyectoRepo: ProyectoRepository;
  lotRepository: LotRepository;
  clienteRepo: ClienteRepository;
  cotizacionRepo: CotizacionRepository;
  saleRepo: SaleRepository;
  contractRepo: ContractRepository;
  cobranzaRepo: CobranzaRepository;
  pagoRepo: PagoRepository;
  usuarioRepo: UsuarioRepository;
  inventarioRepo: InventarioRepository;
  etapaRepo: EtapaRepository;
  manzanaRepo: ManzanaRepository;
}

function createMockRepositories(): Repositories {
  return {
    empresaRepo: new MockEmpresaRepository(),
    proyectoRepo: new MockProyectoRepository(),
    lotRepository: new MockLotRepository(),
    clienteRepo: new MockClienteRepository(),
    cotizacionRepo: new MockCotizacionRepository(),
    saleRepo: new MockSaleRepository(),
    contractRepo: new MockContractRepository(),
    cobranzaRepo: new MockCobranzaRepository(),
    pagoRepo: new MockPagoRepository(),
    usuarioRepo: new MockUsuarioRepository(),
    inventarioRepo: new MockInventarioRepository(),
    etapaRepo: new MockEtapaRepository(),
    manzanaRepo: new MockManzanaRepository(),
  };
}

function createSupabaseRepositories(): Repositories {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase provider selected but VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required."
    );
  }

  return {
    empresaRepo: new SupabaseEmpresaRepository(),
    proyectoRepo: new SupabaseProyectoRepository(),
    lotRepository: new SupabaseLotRepository(),
    clienteRepo: new SupabaseClienteRepository(),
    cotizacionRepo: new SupabaseCotizacionRepository(),
    saleRepo: new SupabaseSaleRepository(),
    contractRepo: new SupabaseContractRepository(),
    cobranzaRepo: new SupabaseCobranzaRepository(),
    pagoRepo: new SupabasePagoRepository(),
    usuarioRepo: new SupabaseUsuarioRepository(),
    inventarioRepo: new SupabaseInventarioRepository(),
    etapaRepo: new SupabaseEtapaRepository(),
    manzanaRepo: new SupabaseManzanaRepository(),
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

  throw new Error(
    `Unsupported VITE_DATA_PROVIDER "${provider}". Expected "supabase" or "mock".`
  );
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
