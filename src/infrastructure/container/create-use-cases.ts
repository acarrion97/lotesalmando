import type { Repositories } from "./create-repositories";

import { GetEmpresasUseCase } from "@/application/empresa/use-cases/GetEmpresasUseCase";
import { GetEmpresaByIdUseCase } from "@/application/empresa/use-cases/GetEmpresaByIdUseCase";
import { CreateEmpresaConAdminUseCase } from "@/application/empresa/use-cases/CreateEmpresaConAdminUseCase";
import { GetPlataformaMetricasUseCase } from "@/application/empresa/use-cases/GetPlataformaMetricasUseCase";
import { UpdateEmpresaPlanUseCase } from "@/application/empresa/use-cases/UpdateEmpresaPlanUseCase";
import { GetPlanesUseCase } from "@/application/plan/use-cases/GetPlanesUseCase";
import { GuardarPlanUseCase } from "@/application/plan/use-cases/GuardarPlanUseCase";
import { EliminarPlanUseCase } from "@/application/plan/use-cases/EliminarPlanUseCase";
import { SubirImagenPlanUseCase } from "@/application/plan/use-cases/SubirImagenPlanUseCase";
import { GetPartnershipsUseCase } from "@/application/partnership/use-cases/GetPartnershipsUseCase";
import { GuardarPartnershipUseCase } from "@/application/partnership/use-cases/GuardarPartnershipUseCase";
import { EliminarPartnershipUseCase } from "@/application/partnership/use-cases/EliminarPartnershipUseCase";
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
import { ReservarProspectoUseCase } from "@/application/prospectos/use-cases/ReservarProspectoUseCase";
import { RegistrarEntradaReservaUseCase } from "@/application/entradas/use-cases/RegistrarEntradaReservaUseCase";
import { GetEntradasReservaUseCase } from "@/application/entradas/use-cases/GetEntradasReservaUseCase";
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
import { GetProyeccionFinancieraUseCase } from "@/application/proyecciones/use-cases/GetProyeccionFinancieraUseCase";
import { DetectarCuotasVencidasUseCase } from "@/application/cobranzas/use-cases/DetectarCuotasVencidasUseCase";
import { GenerarAlertasUseCase } from "@/application/alertas/use-cases/GenerarAlertasUseCase";
import { GetUsuariosUseCase } from "@/application/usuarios/use-cases/GetUsuariosUseCase";
import { CreateUsuarioUseCase } from "@/application/usuarios/use-cases/CreateUsuarioUseCase";
import { CreateUsuarioAuthUseCase } from "@/application/usuarios/use-cases/CreateUsuarioAuthUseCase";
import { UpdateUsuarioUseCase } from "@/application/usuarios/use-cases/UpdateUsuarioUseCase";
import { DeleteUsuarioUseCase } from "@/application/usuarios/use-cases/DeleteUsuarioUseCase";
import { AsignarAsesorParaUsuarioUseCase } from "@/application/usuarios/use-cases/AsignarAsesorParaUsuarioUseCase";
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
import { RegistrarInteresPublicoUseCase } from "@/application/prospectos/use-cases/RegistrarInteresPublicoUseCase";
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
import { GetRolesPorUsuariosUseCase } from "@/application/roles/use-cases/GetRolesPorUsuariosUseCase";
import { GetPermisosByUsuarioUseCase } from "@/application/roles/use-cases/GetPermisosByUsuarioUseCase";
import { CreateRolUseCase } from "@/application/roles/use-cases/CreateRolUseCase";
import { UpdateRolUseCase } from "@/application/roles/use-cases/UpdateRolUseCase";
import { DeleteRolUseCase } from "@/application/roles/use-cases/DeleteRolUseCase";
import { GetAllPermisosUseCase } from "@/application/roles/use-cases/GetAllPermisosUseCase";
import { CreatePermisoUseCase } from "@/application/roles/use-cases/CreatePermisoUseCase";
import { DeletePermisoUseCase } from "@/application/roles/use-cases/DeletePermisoUseCase";
import { GetPermisoIdsByRolUseCase } from "@/application/roles/use-cases/GetPermisoIdsByRolUseCase";
import { AssignPermisoARolUseCase } from "@/application/roles/use-cases/AssignPermisoARolUseCase";
import { RemovePermisoDeRolUseCase } from "@/application/roles/use-cases/RemovePermisoDeRolUseCase";
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
import { DefinirUbicacionMapaUseCase } from "@/application/mapas/use-cases/DefinirUbicacionMapaUseCase";
import { SubirRender3DUseCase } from "@/application/mapas/use-cases/SubirRender3DUseCase";
import { QuitarRender3DUseCase } from "@/application/mapas/use-cases/QuitarRender3DUseCase";
import { GetMapaPublicoUseCase } from "@/application/mapas/use-cases/GetMapaPublicoUseCase";
import { GetMediosProyectoUseCase } from "@/application/proyectos/use-cases/GetMediosProyectoUseCase";
import { SubirMedioProyectoUseCase } from "@/application/proyectos/use-cases/SubirMedioProyectoUseCase";
import { QuitarMedioProyectoUseCase } from "@/application/proyectos/use-cases/QuitarMedioProyectoUseCase";

export interface UseCases {
  getEmpresas: GetEmpresasUseCase;
  createEmpresaConAdmin: CreateEmpresaConAdminUseCase;
  getPlataformaMetricas: GetPlataformaMetricasUseCase;
  getEmpresaById: GetEmpresaByIdUseCase;
  updateEmpresaPlan: UpdateEmpresaPlanUseCase;
  getPlanes: GetPlanesUseCase;
  guardarPlan: GuardarPlanUseCase;
  eliminarPlan: EliminarPlanUseCase;
  subirImagenPlan: SubirImagenPlanUseCase;
  getPartnerships: GetPartnershipsUseCase;
  guardarPartnership: GuardarPartnershipUseCase;
  eliminarPartnership: EliminarPartnershipUseCase;
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
  reservarProspecto: ReservarProspectoUseCase;
  registrarEntrada: RegistrarEntradaReservaUseCase;
  getEntradasReserva: GetEntradasReservaUseCase;
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
  getProyeccionFinanciera: GetProyeccionFinancieraUseCase;
  detectarCuotasVencidas: DetectarCuotasVencidasUseCase;
  generarAlertas: GenerarAlertasUseCase;
  getUsuarios: GetUsuariosUseCase;
  createUsuario: CreateUsuarioUseCase;
  createUsuarioAuth: CreateUsuarioAuthUseCase;
  updateUsuario: UpdateUsuarioUseCase;
  deleteUsuario: DeleteUsuarioUseCase;
  asignarAsesorParaUsuario: AsignarAsesorParaUsuarioUseCase;
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
  /** Registro de interés de un visitante del mapa público (RPC en Supabase). */
  registrarInteresPublico: RegistrarInteresPublicoUseCase;
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
  getRolesPorUsuarios: GetRolesPorUsuariosUseCase;
  getPermisosByUsuario: GetPermisosByUsuarioUseCase;
  createRol: CreateRolUseCase;
  updateRol: UpdateRolUseCase;
  deleteRol: DeleteRolUseCase;
  getAllPermisos: GetAllPermisosUseCase;
  createPermiso: CreatePermisoUseCase;
  deletePermiso: DeletePermisoUseCase;
  getPermisoIdsByRol: GetPermisoIdsByRolUseCase;
  assignPermisoARol: AssignPermisoARolUseCase;
  removePermisoDeRol: RemovePermisoDeRolUseCase;
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
  definirUbicacionMapa: DefinirUbicacionMapaUseCase;
  subirRender3D: SubirRender3DUseCase;
  quitarRender3D: QuitarRender3DUseCase;
  getMapaPublico: GetMapaPublicoUseCase;
  getMediosProyecto: GetMediosProyectoUseCase;
  subirMedioProyecto: SubirMedioProyectoUseCase;
  quitarMedioProyecto: QuitarMedioProyectoUseCase;
}

export function createUseCases(repos: Repositories): UseCases {
  const reservarLote = new ReservarLoteUseCase(repos.lotRepository, repos.inventarioRepo);
  const registrarEntrada = new RegistrarEntradaReservaUseCase(
    repos.entradaRepo,
    repos.lotRepository,
  );

  return {
    getEmpresas: new GetEmpresasUseCase(repos.empresaRepo),
    createEmpresaConAdmin: new CreateEmpresaConAdminUseCase(repos.empresaRepo),
    getPlataformaMetricas: new GetPlataformaMetricasUseCase(repos.empresaRepo),
    getEmpresaById: new GetEmpresaByIdUseCase(repos.empresaRepo),
    updateEmpresaPlan: new UpdateEmpresaPlanUseCase(repos.empresaRepo),
    getPlanes: new GetPlanesUseCase(repos.planRepo),
    guardarPlan: new GuardarPlanUseCase(repos.planRepo, repos.planImageStorage),
    eliminarPlan: new EliminarPlanUseCase(repos.planRepo, repos.planImageStorage),
    subirImagenPlan: new SubirImagenPlanUseCase(repos.planImageStorage),
    getPartnerships: new GetPartnershipsUseCase(repos.partnershipRepo),
    guardarPartnership: new GuardarPartnershipUseCase(repos.partnershipRepo),
    eliminarPartnership: new EliminarPartnershipUseCase(repos.partnershipRepo),
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
    reservarLote,
    cancelarReserva: new CancelarReservaUseCase(repos.lotRepository, repos.inventarioRepo),
    registrarEntrada,
    getEntradasReserva: new GetEntradasReservaUseCase(repos.entradaRepo),
    reservarProspecto: new ReservarProspectoUseCase({
      prospectoRepo: repos.prospectoRepo,
      clienteRepo: repos.clienteRepo,
      lotRepo: repos.lotRepository,
      inventarioRepo: repos.inventarioRepo,
      oportunidadRepo: repos.oportunidadRepo,
      reservarLote,
      registrarEntrada,
    }),
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
    getProyeccionFinanciera: new GetProyeccionFinancieraUseCase(
      repos.etapaRepo,
      repos.manzanaRepo,
      repos.lotRepository,
      repos.saleRepo,
      repos.contractRepo,
      repos.cobranzaRepo,
    ),
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
    createUsuarioAuth: new CreateUsuarioAuthUseCase(repos.usuarioRepo),
    updateUsuario: new UpdateUsuarioUseCase(repos.usuarioRepo),
    deleteUsuario: new DeleteUsuarioUseCase(repos.usuarioRepo),
    asignarAsesorParaUsuario: new AsignarAsesorParaUsuarioUseCase(repos.asesorRepo),
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
    registrarInteresPublico: new RegistrarInteresPublicoUseCase(repos.registrarInteresPublico),
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
    getRolesPorUsuarios: new GetRolesPorUsuariosUseCase(repos.rolRepo),
    getPermisosByUsuario: new GetPermisosByUsuarioUseCase(repos.rolRepo),
    createRol: new CreateRolUseCase(repos.rolRepo),
    updateRol: new UpdateRolUseCase(repos.rolRepo),
    deleteRol: new DeleteRolUseCase(repos.rolRepo),
    getAllPermisos: new GetAllPermisosUseCase(repos.rolRepo),
    createPermiso: new CreatePermisoUseCase(repos.rolRepo),
    deletePermiso: new DeletePermisoUseCase(repos.rolRepo),
    getPermisoIdsByRol: new GetPermisoIdsByRolUseCase(repos.rolRepo),
    assignPermisoARol: new AssignPermisoARolUseCase(repos.rolRepo),
    removePermisoDeRol: new RemovePermisoDeRolUseCase(repos.rolRepo),
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
    definirUbicacionMapa: new DefinirUbicacionMapaUseCase(repos.mapaRepo),
    subirRender3D: new SubirRender3DUseCase(repos.mapaRepo, repos.mapaImageStorage),
    quitarRender3D: new QuitarRender3DUseCase(repos.mapaRepo, repos.mapaImageStorage),
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
