import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Typography } from "antd";
import { useOnlineStatus } from "@/presentation/hooks";
import { usePermiso } from "@/presentation/providers";
import { MODULOS, GRUPOS_MENU, ITEMS_SUELTOS } from "@/presentation/permisos/permisosConfig";
import {
  DashboardOutlined,
  ProjectOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  InboxOutlined,
  UserOutlined,
  FileTextOutlined,
  DollarOutlined,
  FileProtectOutlined,
  CreditCardOutlined,
  PayCircleOutlined,
  FundOutlined,
  TeamOutlined,
  SettingOutlined,
  BellOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  BankOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

const { Text } = Typography;

type MenuItem = Required<MenuProps>["items"][number];

const groupLabel = (text: string) => (
<Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: "rgba(255,255,255,0.72)", textTransform: "uppercase" }}>
    {text}
  </Text>
);

const iconosPorRuta: Record<string, React.ReactNode> = {
  "/dashboard": <DashboardOutlined />,
  "/proyectos": <ProjectOutlined />,
  "/etapas": <ProjectOutlined />,
  "/manzanas": <EnvironmentOutlined />,
  "/mapas": <EnvironmentOutlined />,
  "/lotes": <HomeOutlined />,
  "/inventario": <InboxOutlined />,
  "/clientes": <UserOutlined />,
  "/cotizaciones": <FileTextOutlined />,
  "/ventas": <DollarOutlined />,
  "/prospectos": <UserOutlined />,
  "/asesores": <TeamOutlined />,
  "/contratos": <FileProtectOutlined />,
  "/cobranzas": <CreditCardOutlined />,
  "/pagos": <PayCircleOutlined />,
  "/proyeccion": <FundOutlined />,
  "/alertas": <BellOutlined />,
  "/usuarios": <TeamOutlined />,
  "/configuracion": <SettingOutlined />,
  "/roles-permisos": <SafetyCertificateOutlined />,
  "/plataforma": <GlobalOutlined />,
  "/empresas": <BankOutlined />,
};

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const { tienePermiso } = usePermiso();

  // Módulos que el usuario puede ver, según sus permisos de la BD.
  const modulosVisibles = useMemo(
    () => new Set(MODULOS.filter((m) => tienePermiso(m.permiso)).map((m) => m.key)),
    [tienePermiso],
  );

  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];

    // Ítems sueltos (Dashboard) primero.
    for (const key of ITEMS_SUELTOS) {
      if (!modulosVisibles.has(key)) continue;
      const modulo = MODULOS.find((m) => m.key === key);
      items.push({
        key,
        icon: iconosPorRuta[key],
        label: modulo?.label ?? key,
      });
    }

    // Luego los grupos, ocultando los que quedaron vacíos.
    for (const grupo of GRUPOS_MENU) {
      const children: MenuItem[] = grupo.items
        .filter((key) => modulosVisibles.has(key))
        .map((key) => {
          const modulo = MODULOS.find((m) => m.key === key);
          return { key, icon: iconosPorRuta[key], label: modulo?.label ?? key };
        });

      if (children.length === 0) continue;

      items.push({
        key: grupo.key,
        label: groupLabel(grupo.groupLabel ?? grupo.key),
        type: "group",
        children,
      });
    }

    return items;
  }, [modulosVisibles]);

  const selectedKeys = [location.pathname === "/" ? "/dashboard" : location.pathname];

  const openKeys = (() => {
    const path = location.pathname;

    for (const grupo of GRUPOS_MENU) {
      if (grupo.items.includes(path)) {
        return [grupo.key];
      }
    }

    return [];
  })();

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          padding: collapsed ? "20px 0" : "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          marginBottom: 8,
        }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          <img src="/logo-icon.png" alt="Lotes al Mando" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
        {!collapsed && (
          <div>
            <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 9, fontWeight: 600, letterSpacing: 3, textTransform: "uppercase", lineHeight: 1 }}>LOTES</div>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: 1, lineHeight: 1.1, marginTop: 1 }}>AL MANDO</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 7, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 3 }}>PLATAFORMA INMOBILIARIA INTEGRAL</div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 8px" }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          openKeys={collapsed ? [] : openKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ borderRight: 0, background: "transparent" }}
        />
      </div>

      {!collapsed && (
        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "auto" }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isOnline ? "#52c41a" : "#faad14",
                boxShadow: isOnline ? "0 0 8px #52c41a" : "0 0 8px #faad14",
              }}
            />
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              {isOnline ? "Sistema activo" : "Sin conexión"}
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}
