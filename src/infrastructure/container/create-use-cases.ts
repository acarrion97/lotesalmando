import type { Repositories } from "./create-repositories";

import { GetEmpresasUseCase } from "@/application/empresa/use-cases/GetEmpresasUseCase";
import { GetEmpresaByIdUseCase } from "@/application/empresa/use-cases/GetEmpresaByIdUseCase";
import { GetProyectosUseCase } from "@/application/proyectos/use-cases/GetProyectosUseCase";
import { GetProyectoByIdUseCase } from "@/application/proyectos/use-cases/GetProyectoByIdUseCase";
import { CreateProyectoUseCase } from "@/application/proyectos/use-cases/CreateProyectoUseCase";
import { UpdateProyectoUseCase } from "@/application/proyectos/use-cases/UpdateProyectoUseCase";
import { DeleteProyectoUseCase } from "@/application/proyectos/use-cases/DeleteProyectoUseCase";
import { GetLotesUseCase } from "@/application/lotes/use-cases/GetLotesUseCase";
import { GetLotesByManzanaUseCase } from "@/application/lotes/use-cases/GetLotesByManzanaUseCase";
import { CreateLoteUseCase } from "@/application/lotes/use-cases/CreateLoteUseCase";
import { UpdateLoteUseCase } from "@/application/lotes/use-cases/UpdateLoteUseCase";
import { DeleteLoteUseCase } from "@/application/lotes/use-cases/DeleteLoteUseCase";
import { ReservarLoteUseCase } from "@/application/lotes/use-cases/ReservarLoteUseCase";
import { CancelarReservaUseCase } from "@/application/lotes/use-cases/CancelarReservaUseCase";
import { GetClientesUseCase } from "@/application/clientes/use-cases/GetClientesUseCase";
import { CreateClienteUseCase } from "@/application/clientes/use-cases/CreateClienteUseCase";
import { UpdateClienteUseCase } from "@/application/clientes/use-cases/UpdateClienteUseCase";
import { DeleteClienteUseCase } from "@/application/clientes/use-cases/DeleteClienteUseCase";
import { GetCotizacionesUseCase } from "@/application/cotizaciones/use-cases/GetCotizacionesUseCase";
import { CreateCotizacionUseCase } from "@/application/cotizaciones/use-cases/CreateCotizacionUseCase";
import { GetVentasUseCase } from "@/application/ventas/use-cases/GetVentasUseCase";
import { CreateVentaUseCase } from "@/application/ventas/use-cases/CreateVentaUseCase";
import { GetContratosUseCase } from "@/application/contratos/use-cases/GetContratosUseCase";
import { GetCobranzasUseCase } from "@/application/cobranzas/use-cases/GetCobranzasUseCase";
import { GetPagosUseCase } from "@/application/pagos/use-cases/GetPagosUseCase";
import { RegisterPagoUseCase } from "@/application/pagos/use-cases/RegisterPagoUseCase";
import { GetUsuariosUseCase } from "@/application/usuarios/use-cases/GetUsuariosUseCase";
import { CreateUsuarioUseCase } from "@/application/usuarios/use-cases/CreateUsuarioUseCase";
import { UpdateUsuarioUseCase } from "@/application/usuarios/use-cases/UpdateUsuarioUseCase";
import { DeleteUsuarioUseCase } from "@/application/usuarios/use-cases/DeleteUsuarioUseCase";
import { GetEtapasByProyectoUseCase } from "@/application/etapas/use-cases/GetEtapasByProyectoUseCase";
import { GetManzanasByEtapaUseCase } from "@/application/manzanas/use-cases/GetManzanasByEtapaUseCase";
import { MockCreateSaleTransaction } from "@/infrastructure/transactions/MockCreateSaleTransaction";

export interface UseCases {
  getEmpresas: GetEmpresasUseCase;
  getEmpresaById: GetEmpresaByIdUseCase;
  getProyectos: GetProyectosUseCase;
  getProyectoById: GetProyectoByIdUseCase;
  createProyecto: CreateProyectoUseCase;
  updateProyecto: UpdateProyectoUseCase;
  deleteProyecto: DeleteProyectoUseCase;
  getLotes: GetLotesUseCase;
  getLotesByManzana: GetLotesByManzanaUseCase;
  createLote: CreateLoteUseCase;
  updateLote: UpdateLoteUseCase;
  deleteLote: DeleteLoteUseCase;
  reservarLote: ReservarLoteUseCase;
  cancelarReserva: CancelarReservaUseCase;
  getClientes: GetClientesUseCase;
  createCliente: CreateClienteUseCase;
  updateCliente: UpdateClienteUseCase;
  deleteCliente: DeleteClienteUseCase;
  getCotizaciones: GetCotizacionesUseCase;
  createCotizacion: CreateCotizacionUseCase;
  getVentas: GetVentasUseCase;
  createVenta: CreateVentaUseCase;
  getContratos: GetContratosUseCase;
  getCobranzas: GetCobranzasUseCase;
  getPagos: GetPagosUseCase;
  registerPago: RegisterPagoUseCase;
  getUsuarios: GetUsuariosUseCase;
  createUsuario: CreateUsuarioUseCase;
  updateUsuario: UpdateUsuarioUseCase;
  deleteUsuario: DeleteUsuarioUseCase;
  getEtapasByProyecto: GetEtapasByProyectoUseCase;
  getManzanasByEtapa: GetManzanasByEtapaUseCase;
}

export function createUseCases(repos: Repositories): UseCases {
  const createSaleTransaction = new MockCreateSaleTransaction(
    repos.lotRepository,
    repos.saleRepo,
    repos.inventarioRepo,
    repos.contractRepo,
    repos.cobranzaRepo,
  );

  return {
    getEmpresas: new GetEmpresasUseCase(repos.empresaRepo),
    getEmpresaById: new GetEmpresaByIdUseCase(repos.empresaRepo),
    getProyectos: new GetProyectosUseCase(repos.proyectoRepo),
    getProyectoById: new GetProyectoByIdUseCase(repos.proyectoRepo),
    createProyecto: new CreateProyectoUseCase(repos.proyectoRepo),
    updateProyecto: new UpdateProyectoUseCase(repos.proyectoRepo),
    deleteProyecto: new DeleteProyectoUseCase(repos.proyectoRepo),
    getLotes: new GetLotesUseCase(repos.lotRepository),
    getLotesByManzana: new GetLotesByManzanaUseCase(repos.lotRepository),
    createLote: new CreateLoteUseCase(repos.lotRepository),
    updateLote: new UpdateLoteUseCase(repos.lotRepository),
    deleteLote: new DeleteLoteUseCase(repos.lotRepository),
    reservarLote: new ReservarLoteUseCase(repos.lotRepository, repos.inventarioRepo),
    cancelarReserva: new CancelarReservaUseCase(repos.lotRepository, repos.inventarioRepo),
    getClientes: new GetClientesUseCase(repos.clienteRepo),
    createCliente: new CreateClienteUseCase(repos.clienteRepo),
    updateCliente: new UpdateClienteUseCase(repos.clienteRepo),
    deleteCliente: new DeleteClienteUseCase(repos.clienteRepo),
    getCotizaciones: new GetCotizacionesUseCase(repos.cotizacionRepo),
    createCotizacion: new CreateCotizacionUseCase(repos.cotizacionRepo),
    getVentas: new GetVentasUseCase(repos.saleRepo),
    createVenta: new CreateVentaUseCase(createSaleTransaction),
    getContratos: new GetContratosUseCase(repos.contractRepo),
    getCobranzas: new GetCobranzasUseCase(repos.cobranzaRepo),
    getPagos: new GetPagosUseCase(repos.pagoRepo),
    registerPago: new RegisterPagoUseCase(repos.cobranzaRepo, repos.pagoRepo),
    getUsuarios: new GetUsuariosUseCase(repos.usuarioRepo),
    createUsuario: new CreateUsuarioUseCase(repos.usuarioRepo),
    updateUsuario: new UpdateUsuarioUseCase(repos.usuarioRepo),
    deleteUsuario: new DeleteUsuarioUseCase(repos.usuarioRepo),
    getEtapasByProyecto: new GetEtapasByProyectoUseCase(repos.etapaRepo),
    getManzanasByEtapa: new GetManzanasByEtapaUseCase(repos.manzanaRepo),
  };
}
