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
import { GetAllClientesUseCase } from "@/application/clientes/use-cases/GetAllClientesUseCase";
import { CreateClienteUseCase } from "@/application/clientes/use-cases/CreateClienteUseCase";
import { UpdateClienteUseCase } from "@/application/clientes/use-cases/UpdateClienteUseCase";
import { DeleteClienteUseCase } from "@/application/clientes/use-cases/DeleteClienteUseCase";
import { GetCotizacionesUseCase } from "@/application/cotizaciones/use-cases/GetCotizacionesUseCase";
import { CreateCotizacionUseCase } from "@/application/cotizaciones/use-cases/CreateCotizacionUseCase";
import { UpdateCotizacionUseCase } from "@/application/cotizaciones/use-cases/UpdateCotizacionUseCase";
import { AceptarCotizacionUseCase } from "@/application/cotizaciones/use-cases/AceptarCotizacionUseCase";
import { GetVentasUseCase } from "@/application/ventas/use-cases/GetVentasUseCase";
import { GetContratosUseCase } from "@/application/contratos/use-cases/GetContratosUseCase";
import { GetCobranzasUseCase } from "@/application/cobranzas/use-cases/GetCobranzasUseCase";
import { GetCobranzasByContratoUseCase } from "@/application/cobranzas/use-cases/GetCobranzasByContratoUseCase";
import { GetPagosUseCase } from "@/application/pagos/use-cases/GetPagosUseCase";
import { RegisterPagoUseCase } from "@/application/pagos/use-cases/RegisterPagoUseCase";
import { GetCarteraMetricasUseCase } from "@/application/cobranzas/use-cases/GetCarteraMetricasUseCase";
import { DetectarCuotasVencidasUseCase } from "@/application/cobranzas/use-cases/DetectarCuotasVencidasUseCase";
import { GenerarAlertasUseCase } from "@/application/alertas/use-cases/GenerarAlertasUseCase";
import { GetUsuariosUseCase } from "@/application/usuarios/use-cases/GetUsuariosUseCase";
import { CreateUsuarioUseCase } from "@/application/usuarios/use-cases/CreateUsuarioUseCase";
import { UpdateUsuarioUseCase } from "@/application/usuarios/use-cases/UpdateUsuarioUseCase";
import { DeleteUsuarioUseCase } from "@/application/usuarios/use-cases/DeleteUsuarioUseCase";
import { GetEtapasByProyectoUseCase } from "@/application/etapas/use-cases/GetEtapasByProyectoUseCase";
import { GetAllEtapasUseCase } from "@/application/etapas/use-cases/GetAllEtapasUseCase";
import { CreateEtapaUseCase } from "@/application/etapas/use-cases/CreateEtapaUseCase";
import { UpdateEtapaUseCase } from "@/application/etapas/use-cases/UpdateEtapaUseCase";
import { DeleteEtapaUseCase } from "@/application/etapas/use-cases/DeleteEtapaUseCase";
import { GetManzanasByEtapaUseCase } from "@/application/manzanas/use-cases/GetManzanasByEtapaUseCase";
import { GetAllManzanasUseCase } from "@/application/manzanas/use-cases/GetAllManzanasUseCase";
import { CreateManzanaUseCase } from "@/application/manzanas/use-cases/CreateManzanaUseCase";
import { UpdateManzanaUseCase } from "@/application/manzanas/use-cases/UpdateManzanaUseCase";
import { DeleteManzanaUseCase } from "@/application/manzanas/use-cases/DeleteManzanaUseCase";
import { GetProspectosUseCase } from "@/application/prospectos/use-cases/GetProspectosUseCase";
import { CreateProspectoUseCase } from "@/application/prospectos/use-cases/CreateProspectoUseCase";
import { UpdateProspectoUseCase } from "@/application/prospectos/use-cases/UpdateProspectoUseCase";
import { DeleteProspectoUseCase } from "@/application/prospectos/use-cases/DeleteProspectoUseCase";
import { GetOportunidadesUseCase } from "@/application/oportunidades/use-cases/GetOportunidadesUseCase";
import { CreateOportunidadUseCase } from "@/application/oportunidades/use-cases/CreateOportunidadUseCase";
import { UpdateOportunidadUseCase } from "@/application/oportunidades/use-cases/UpdateOportunidadUseCase";
import { GetActividadesUseCase } from "@/application/actividades/use-cases/GetActividadesUseCase";
import { CreateActividadUseCase } from "@/application/actividades/use-cases/CreateActividadUseCase";
import { GetAsesoresUseCase } from "@/application/asesores/use-cases/GetAsesoresUseCase";
import { CreateAsesorUseCase } from "@/application/asesores/use-cases/CreateAsesorUseCase";
import { UpdateAsesorUseCase } from "@/application/asesores/use-cases/UpdateAsesorUseCase";
import { DeleteAsesorUseCase } from "@/application/asesores/use-cases/DeleteAsesorUseCase";
import { GetRolesUseCase } from "@/application/roles/use-cases/GetRolesUseCase";
import { GetRolesByUsuarioUseCase } from "@/application/roles/use-cases/GetRolesByUsuarioUseCase";
import { AssignRolUseCase } from "@/application/roles/use-cases/AssignRolUseCase";
import { RemoveRolUseCase } from "@/application/roles/use-cases/RemoveRolUseCase";
import { GetInventarioUseCase } from "@/application/inventario/use-cases/GetInventarioUseCase";
import { CreateInventarioUseCase } from "@/application/inventario/use-cases/CreateInventarioUseCase";
import { UpdateInventarioUseCase } from "@/application/inventario/use-cases/UpdateInventarioUseCase";
import { DeleteInventarioUseCase } from "@/application/inventario/use-cases/DeleteInventarioUseCase";
import { GetConfiguracionUseCase } from "@/application/configuracion/use-cases/GetConfiguracionUseCase";
import { SaveConfiguracionUseCase } from "@/application/configuracion/use-cases/SaveConfiguracionUseCase";
import { GetMapaByProyectoUseCase } from "@/application/mapas/use-cases/GetMapaByProyectoUseCase";
import { SubirImagenMapaUseCase } from "@/application/mapas/use-cases/SubirImagenMapaUseCase";
import { QuitarImagenMapaUseCase } from "@/application/mapas/use-cases/QuitarImagenMapaUseCase";
import { GetLotesPlanoUseCase } from "@/application/mapas/use-cases/GetLotesPlanoUseCase";
import { GuardarPoligonoLoteUseCase } from "@/application/mapas/use-cases/GuardarPoligonoLoteUseCase";
import { PublicarMapaUseCase } from "@/application/mapas/use-cases/PublicarMapaUseCase";
import { GetMapaPublicoUseCase } from "@/application/mapas/use-cases/GetMapaPublicoUseCase";
import { GetMediosProyectoUseCase } from "@/application/proyectos/use-cases/GetMediosProyectoUseCase";
import { SubirMedioProyectoUseCase } from "@/application/proyectos/use-cases/SubirMedioProyectoUseCase";
import { QuitarMedioProyectoUseCase } from "@/application/proyectos/use-cases/QuitarMedioProyectoUseCase";

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
  getAllClientes: GetAllClientesUseCase;
  createCliente: CreateClienteUseCase;
  updateCliente: UpdateClienteUseCase;
  deleteCliente: DeleteClienteUseCase;
  getCotizaciones: GetCotizacionesUseCase;
  createCotizacion: CreateCotizacionUseCase;
  updateCotizacion: UpdateCotizacionUseCase;
  getVentas: GetVentasUseCase;
  aceptarCotizacion: AceptarCotizacionUseCase;
  getContratos: GetContratosUseCase;
  getCobranzas: GetCobranzasUseCase;
  getCobranzasByContrato: GetCobranzasByContratoUseCase;
  getPagos: GetPagosUseCase;
  registerPago: RegisterPagoUseCase;
  getCarteraMetricas: GetCarteraMetricasUseCase;
  detectarCuotasVencidas: DetectarCuotasVencidasUseCase;
  generarAlertas: GenerarAlertasUseCase;
  getUsuarios: GetUsuariosUseCase;
  createUsuario: CreateUsuarioUseCase;
  updateUsuario: UpdateUsuarioUseCase;
  deleteUsuario: DeleteUsuarioUseCase;
  getAllEtapas: GetAllEtapasUseCase;
  getEtapasByProyecto: GetEtapasByProyectoUseCase;
  createEtapa: CreateEtapaUseCase;
  updateEtapa: UpdateEtapaUseCase;
  deleteEtapa: DeleteEtapaUseCase;
  getAllManzanas: GetAllManzanasUseCase;
  getManzanasByEtapa: GetManzanasByEtapaUseCase;
  createManzana: CreateManzanaUseCase;
  updateManzana: UpdateManzanaUseCase;
  deleteManzana: DeleteManzanaUseCase;
  getProspectos: GetProspectosUseCase;
  createProspecto: CreateProspectoUseCase;
  updateProspecto: UpdateProspectoUseCase;
  deleteProspecto: DeleteProspectoUseCase;
  getOportunidades: GetOportunidadesUseCase;
  createOportunidad: CreateOportunidadUseCase;
  updateOportunidad: UpdateOportunidadUseCase;
  getActividades: GetActividadesUseCase;
  createActividad: CreateActividadUseCase;
  getAsesores: GetAsesoresUseCase;
  createAsesor: CreateAsesorUseCase;
  updateAsesor: UpdateAsesorUseCase;
  deleteAsesor: DeleteAsesorUseCase;
  getRoles: GetRolesUseCase;
  getRolesByUsuario: GetRolesByUsuarioUseCase;
  assignRol: AssignRolUseCase;
  removeRol: RemoveRolUseCase;
  getInventario: GetInventarioUseCase;
  createInventario: CreateInventarioUseCase;
  updateInventario: UpdateInventarioUseCase;
  deleteInventario: DeleteInventarioUseCase;
  getConfiguracion: GetConfiguracionUseCase;
  saveConfiguracion: SaveConfiguracionUseCase;
  getMapaByProyecto: GetMapaByProyectoUseCase;
  subirImagenMapa: SubirImagenMapaUseCase;
  quitarImagenMapa: QuitarImagenMapaUseCase;
  getLotesPlano: GetLotesPlanoUseCase;
  guardarPoligonoLote: GuardarPoligonoLoteUseCase;
  publicarMapa: PublicarMapaUseCase;
  getMapaPublico: GetMapaPublicoUseCase;
  getMediosProyecto: GetMediosProyectoUseCase;
  subirMedioProyecto: SubirMedioProyectoUseCase;
  quitarMedioProyecto: QuitarMedioProyectoUseCase;
}

export function createUseCases(repos: Repositories): UseCases {
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
    getAllClientes: new GetAllClientesUseCase(repos.clienteRepo),
    createCliente: new CreateClienteUseCase(repos.clienteRepo),
    updateCliente: new UpdateClienteUseCase(repos.clienteRepo),
    deleteCliente: new DeleteClienteUseCase(repos.clienteRepo),
    getCotizaciones: new GetCotizacionesUseCase(repos.cotizacionRepo),
    createCotizacion: new CreateCotizacionUseCase(repos.cotizacionRepo),
    updateCotizacion: new UpdateCotizacionUseCase(repos.cotizacionRepo),
    getVentas: new GetVentasUseCase(repos.saleRepo),
    aceptarCotizacion: new AceptarCotizacionUseCase(repos.aceptarCotizacion),
    getContratos: new GetContratosUseCase(repos.contractRepo),
    getCobranzas: new GetCobranzasUseCase(repos.cobranzaRepo),
    getCobranzasByContrato: new GetCobranzasByContratoUseCase(repos.cobranzaRepo),
    getPagos: new GetPagosUseCase(repos.pagoRepo),
    registerPago: new RegisterPagoUseCase(repos.cobranzaRepo, repos.pagoRepo),
    getCarteraMetricas: new GetCarteraMetricasUseCase(repos.cobranzaRepo),
    detectarCuotasVencidas: new DetectarCuotasVencidasUseCase(repos.cobranzaRepo),
    generarAlertas: new GenerarAlertasUseCase(
      repos.lotRepository,
      repos.prospectoRepo,
      repos.cobranzaRepo,
      repos.contractRepo,
      repos.saleRepo,
      repos.clienteRepo,
    ),
    getUsuarios: new GetUsuariosUseCase(repos.usuarioRepo),
    createUsuario: new CreateUsuarioUseCase(repos.usuarioRepo),
    updateUsuario: new UpdateUsuarioUseCase(repos.usuarioRepo),
    deleteUsuario: new DeleteUsuarioUseCase(repos.usuarioRepo),
    getAllEtapas: new GetAllEtapasUseCase(repos.etapaRepo),
    getEtapasByProyecto: new GetEtapasByProyectoUseCase(repos.etapaRepo),
    createEtapa: new CreateEtapaUseCase(repos.etapaRepo),
    updateEtapa: new UpdateEtapaUseCase(repos.etapaRepo),
    deleteEtapa: new DeleteEtapaUseCase(repos.etapaRepo),
    getAllManzanas: new GetAllManzanasUseCase(repos.manzanaRepo),
    getManzanasByEtapa: new GetManzanasByEtapaUseCase(repos.manzanaRepo),
    createManzana: new CreateManzanaUseCase(repos.manzanaRepo),
    updateManzana: new UpdateManzanaUseCase(repos.manzanaRepo),
    deleteManzana: new DeleteManzanaUseCase(repos.manzanaRepo),
    getProspectos: new GetProspectosUseCase(repos.prospectoRepo),
    createProspecto: new CreateProspectoUseCase(repos.prospectoRepo),
    updateProspecto: new UpdateProspectoUseCase(repos.prospectoRepo),
    deleteProspecto: new DeleteProspectoUseCase(repos.prospectoRepo),
    getOportunidades: new GetOportunidadesUseCase(repos.oportunidadRepo),
    createOportunidad: new CreateOportunidadUseCase(repos.oportunidadRepo),
    updateOportunidad: new UpdateOportunidadUseCase(repos.oportunidadRepo),
    getActividades: new GetActividadesUseCase(repos.actividadRepo),
    createActividad: new CreateActividadUseCase(repos.actividadRepo),
    getAsesores: new GetAsesoresUseCase(repos.asesorRepo),
    createAsesor: new CreateAsesorUseCase(repos.asesorRepo),
    updateAsesor: new UpdateAsesorUseCase(repos.asesorRepo),
    deleteAsesor: new DeleteAsesorUseCase(repos.asesorRepo),
    getRoles: new GetRolesUseCase(repos.rolRepo),
    getRolesByUsuario: new GetRolesByUsuarioUseCase(repos.rolRepo),
    assignRol: new AssignRolUseCase(repos.rolRepo),
    removeRol: new RemoveRolUseCase(repos.rolRepo),
    getInventario: new GetInventarioUseCase(repos.inventarioRepo),
    createInventario: new CreateInventarioUseCase(repos.inventarioRepo),
    updateInventario: new UpdateInventarioUseCase(repos.inventarioRepo),
    deleteInventario: new DeleteInventarioUseCase(repos.inventarioRepo),
    getConfiguracion: new GetConfiguracionUseCase(repos.configuracionRepo),
    saveConfiguracion: new SaveConfiguracionUseCase(repos.configuracionRepo),
    getMapaByProyecto: new GetMapaByProyectoUseCase(repos.mapaRepo),
    subirImagenMapa: new SubirImagenMapaUseCase(repos.mapaRepo, repos.mapaImageStorage),
    quitarImagenMapa: new QuitarImagenMapaUseCase(repos.mapaRepo, repos.mapaImageStorage),
    getLotesPlano: new GetLotesPlanoUseCase(repos.mapaRepo),
    guardarPoligonoLote: new GuardarPoligonoLoteUseCase(repos.mapaRepo),
    publicarMapa: new PublicarMapaUseCase(repos.mapaRepo),
    getMapaPublico: new GetMapaPublicoUseCase(repos.mapaRepo),
    getMediosProyecto: new GetMediosProyectoUseCase(repos.proyectoMedioRepo),
    subirMedioProyecto: new SubirMedioProyectoUseCase(
      repos.proyectoMedioRepo,
      repos.proyectoMedioStorage,
    ),
    quitarMedioProyecto: new QuitarMedioProyectoUseCase(
      repos.proyectoMedioRepo,
      repos.proyectoMedioStorage,
    ),
  };
}
