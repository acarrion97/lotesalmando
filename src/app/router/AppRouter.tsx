import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppLayout } from "@/presentation/components/layout/AppLayout";
import { LoginPage } from "@/presentation/pages/auth/LoginPage";
import { RegisterEmpresaPage } from "@/presentation/pages/auth/RegisterEmpresaPage";
import { OlvideContrasenaPage } from "@/presentation/pages/auth/OlvideContrasenaPage";
import { ReestablecerContrasenaPage } from "@/presentation/pages/auth/ReestablecerContrasenaPage";
import { SeleccionarPlanPage } from "@/presentation/pages/auth/SeleccionarPlanPage";
import { DashboardPage } from "@/presentation/pages/dashboard";
import { ProyectosPage } from "@/presentation/pages/proyectos";
import { EtapasPage } from "@/presentation/pages/etapas";
import { ManzanasPage } from "@/presentation/pages/manzanas";
import { MapasPage } from "@/presentation/pages/mapas";
import { MapaPublicoPage } from "@/presentation/pages/mapa-publico";
import { PortalClientePage } from "@/presentation/pages/portal-cliente";
import { PortalProspectoPage } from "@/presentation/pages/portal-prospecto";
import { LotesPage } from "@/presentation/pages/lotes";
import { ReservasPage } from "@/presentation/pages/reservas";
import { InventarioPage } from "@/presentation/pages/inventario";
import { ClientesPage } from "@/presentation/pages/clientes";
import { CotizacionesPage, NuevaCotizacionPage } from "@/presentation/pages/cotizaciones";
import { VentasPage } from "@/presentation/pages/ventas";
import { ContratosPage } from "@/presentation/pages/contratos";
import { AlertasPage } from "@/presentation/pages/alertas";
import { CobranzasPage } from "@/presentation/pages/cobranzas";
import { ProyeccionFinancieraPage } from "@/presentation/pages/proyeccion";
import { ReportesPage } from "@/presentation/pages/reportes";
import { PagosPage } from "@/presentation/pages/pagos";
import { UsuariosPage } from "@/presentation/pages/usuarios";
import { ConfiguracionPage } from "@/presentation/pages/configuracion";
import { SuscripcionPage } from "@/presentation/pages/suscripcion";
import { ProspectosPage } from "@/presentation/pages/prospectos";
import { AsesoresPage } from "@/presentation/pages/asesores";
import { RolesPermisosPage } from "@/presentation/pages/roles-permisos";
import { EmpresasPage } from "@/presentation/pages/empresas";
import { PlanesPage } from "@/presentation/pages/planes";
import { PartnershipsPage } from "@/presentation/pages/partnerships";
import { PlataformaPage } from "@/presentation/pages/plataforma";
import { permisoParaRuta } from "@/presentation/permisos/permisosConfig";

/**
 * Envuelve una página con el permiso que su ruta exige (definido en
 * permisosConfig). Si el usuario no tiene ese permiso, ProtectedRoute lo
 * redirige al dashboard.
 */
function R({ ruta, children }: { ruta: string; children: React.ReactNode }) {
  return <ProtectedRoute permiso={permisoParaRuta(ruta)}>{children}</ProtectedRoute>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Registro dinámico: /registro/empresa y /registro/agente aceptan
            ademas el codigo de partnership como query param (?codigo=XXX).
            /registro/:clave es la pagina propia de cualquier plan "unico"
            (es_unico = true); las rutas estaticas de arriba tienen prioridad
            sobre el param. */}
        <Route path="/registro/empresa" element={<RegisterEmpresaPage tipo="empresa" />} />
        <Route path="/registro/agente" element={<RegisterEmpresaPage tipo="agente" />} />
        <Route path="/registro/:clave" element={<RegisterEmpresaPage tipo="plan" />} />
        <Route path="/olvide-contrasena" element={<OlvideContrasenaPage />} />
        <Route path="/reestablecer-contrasena" element={<ReestablecerContrasenaPage />} />
        <Route path="/registro/planes" element={<SeleccionarPlanPage />} />
        <Route path="/mapa/:slug" element={<MapaPublicoPage />} />
        <Route path="/portal-cliente" element={<PortalClientePage />} />
        {/* Portal de documentación del prospecto: identificación por email,
            el slug da el alcance de la empresa (igual que /mapa/:slug). */}
        <Route path="/portal-prospecto/:slug" element={<PortalProspectoPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<R ruta="/dashboard"><DashboardPage /></R>} />
          <Route path="/proyectos" element={<R ruta="/proyectos"><ProyectosPage /></R>} />
          <Route path="/etapas" element={<R ruta="/etapas"><EtapasPage /></R>} />
          <Route path="/manzanas" element={<R ruta="/manzanas"><ManzanasPage /></R>} />
          <Route path="/mapas" element={<R ruta="/mapas"><MapasPage /></R>} />
          <Route path="/lotes" element={<R ruta="/lotes"><LotesPage /></R>} />
          <Route path="/reservas" element={<R ruta="/reservas"><ReservasPage /></R>} />
          <Route path="/inventario" element={<R ruta="/inventario"><InventarioPage /></R>} />
          <Route path="/clientes" element={<R ruta="/clientes"><ClientesPage /></R>} />
          <Route path="/cotizaciones" element={<R ruta="/cotizaciones"><CotizacionesPage /></R>} />
          <Route path="/cotizaciones/nueva" element={<R ruta="/cotizaciones/nueva"><NuevaCotizacionPage /></R>} />
          <Route path="/ventas" element={<R ruta="/ventas"><VentasPage /></R>} />
          <Route path="/contratos" element={<R ruta="/contratos"><ContratosPage /></R>} />
          <Route path="/alertas" element={<R ruta="/alertas"><AlertasPage /></R>} />
          <Route path="/cobranzas" element={<R ruta="/cobranzas"><CobranzasPage /></R>} />
          <Route path="/proyeccion" element={<R ruta="/proyeccion"><ProyeccionFinancieraPage /></R>} />
          <Route path="/reportes" element={<R ruta="/reportes"><ReportesPage /></R>} />
          <Route path="/pagos" element={<R ruta="/pagos"><PagosPage /></R>} />
          <Route path="/usuarios" element={<R ruta="/usuarios"><UsuariosPage /></R>} />
          <Route path="/prospectos" element={<R ruta="/prospectos"><ProspectosPage /></R>} />
          <Route path="/prospectos/documentacion" element={<Navigate to="/prospectos" replace />} />
          <Route path="/asesores" element={<R ruta="/asesores"><AsesoresPage /></R>} />
          <Route path="/configuracion" element={<R ruta="/configuracion"><ConfiguracionPage /></R>} />
          <Route path="/suscripcion" element={<R ruta="/suscripcion"><SuscripcionPage /></R>} />
          <Route path="/roles-permisos" element={<R ruta="/roles-permisos"><RolesPermisosPage /></R>} />
          <Route path="/plataforma" element={<R ruta="/plataforma"><PlataformaPage /></R>} />
          <Route path="/empresas" element={<R ruta="/empresas"><EmpresasPage /></R>} />
          <Route path="/planes" element={<R ruta="/planes"><PlanesPage /></R>} />
          <Route path="/partnerships" element={<R ruta="/partnerships"><PartnershipsPage /></R>} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
