import { useMemo } from "react";
import { Breadcrumb } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { useLocation, Link } from "react-router-dom";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  proyectos: "Proyectos",
  mapas: "Mapas",
  lotes: "Lotes",
  inventario: "Inventario",
  clientes: "Clientes",
  cotizaciones: "Cotizaciones",
  ventas: "Ventas",
  contratos: "Contratos",
  cobranzas: "Cobranzas",
  pagos: "Pagos",
  proyeccion: "Proyección",
  usuarios: "Usuarios",
  configuracion: "Configuracion",
  "roles-permisos": "Roles y Permisos",
  plataforma: "Plataforma",
  empresas: "Empresas",
  planes: "Planes",
  partnerships: "Partners",
  prospectos: "Prospectos",
  asesores: "Asesores",
  alertas: "Mando IA",
};

export function Breadcrumbs() {
  const location = useLocation();

  const breadcrumbItems = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    const items = [
      {
        title: (
          <Link to="/">
            <HomeOutlined />
          </Link>
        ),
      },
    ];

    let currentPath = "";
    for (const segment of pathSegments) {
      currentPath += `/${segment}`;
      const label = routeLabels[segment] || segment;
      const isLast = currentPath === location.pathname;

      items.push({
        title: isLast ? (
          <span>{label}</span>
        ) : (
          <Link to={currentPath}>{label}</Link>
        ),
      });
    }

    return items;
  }, [location.pathname]);

  if (location.pathname === "/") {
    return null;
  }

  return <Breadcrumb items={breadcrumbItems} />;
}
