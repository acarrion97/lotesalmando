import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppLayout } from "@/presentation/components/layout/AppLayout";
import { LoginPage } from "@/presentation/pages/auth/LoginPage";
import { RegisterPage } from "@/presentation/pages/auth/RegisterPage";
import { DashboardPage } from "@/presentation/pages/dashboard";
import { ProyectosPage } from "@/presentation/pages/proyectos";
import { MapasPage } from "@/presentation/pages/mapas";
import { LotesPage } from "@/presentation/pages/lotes";
import { InventarioPage } from "@/presentation/pages/inventario";
import { ClientesPage } from "@/presentation/pages/clientes";
import { CotizacionesPage, NuevaCotizacionPage } from "@/presentation/pages/cotizaciones";
import { VentasPage } from "@/presentation/pages/ventas";
import { ContratosPage } from "@/presentation/pages/contratos";
import { CobranzasPage } from "@/presentation/pages/cobranzas";
import { PagosPage } from "@/presentation/pages/pagos";
import { UsuariosPage } from "@/presentation/pages/usuarios";
import { ConfiguracionPage } from "@/presentation/pages/configuracion";
import { ProspectosPage } from "@/presentation/pages/prospectos";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/proyectos" element={<ProyectosPage />} />
          <Route path="/mapas" element={<MapasPage />} />
          <Route path="/lotes" element={<LotesPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/cotizaciones" element={<CotizacionesPage />} />
          <Route path="/cotizaciones/nueva" element={<NuevaCotizacionPage />} />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/contratos" element={<ContratosPage />} />
          <Route path="/cobranzas" element={<CobranzasPage />} />
          <Route path="/pagos" element={<PagosPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/prospectos" element={<ProspectosPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
