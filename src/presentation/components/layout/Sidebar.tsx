import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Typography } from "antd";
import { useOnlineStatus } from "@/presentation/hooks";
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
  TeamOutlined,
  SettingOutlined,
  BellOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";

const { Text } = Typography;

type MenuItem = Required<MenuProps>["items"][number];

const groupLabel = (text: string) => (
<Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: "rgba(255,255,255,0.72)", textTransform: "uppercase" }}>
    {text}
  </Text>
);

const menuItems: MenuItem[] = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
  {
    key: "inventario",
    label: groupLabel("INVENTARIO"),
    type: "group",
    children: [
      { key: "/proyectos", icon: <ProjectOutlined />, label: "Proyectos" },
      { key: "/mapas", icon: <EnvironmentOutlined />, label: "Mapas" },
      { key: "/lotes", icon: <HomeOutlined />, label: "Lotes" },
      { key: "/inventario", icon: <InboxOutlined />, label: "Inventario" },
    ],
  },
  {
    key: "comercial",
    label: groupLabel("COMERCIAL"),
    type: "group",
    children: [
      { key: "/clientes", icon: <UserOutlined />, label: "Clientes" },
      { key: "/cotizaciones", icon: <FileTextOutlined />, label: "Cotizaciones" },
      { key: "/ventas", icon: <DollarOutlined />, label: "Ventas" },
      { key: "/prospectos", icon: <UserOutlined />, label: "Prospectos" },
      { key: "/asesores", icon: <TeamOutlined />, label: "Asesores" },
    ],
  },
  {
    key: "financiero",
    label: groupLabel("FINANCIERO"),
    type: "group",
    children: [
      { key: "/contratos", icon: <FileProtectOutlined />, label: "Contratos" },
      { key: "/cobranzas", icon: <CreditCardOutlined />, label: "Cobranzas" },
      { key: "/pagos", icon: <PayCircleOutlined />, label: "Pagos" },
    ],
  },
  {
    key: "ia",
    label: groupLabel("INTELIGENCIA"),
    type: "group",
    children: [
      { key: "/alertas", icon: <BellOutlined />, label: "Mando IA" },
    ],
  },
  {
    key: "administracion",
    label: groupLabel("ADMINISTRACION"),
    type: "group",
    children: [
      { key: "/usuarios", icon: <TeamOutlined />, label: "Usuarios" },
      { key: "/configuracion", icon: <SettingOutlined />, label: "Configuracion" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnline = useOnlineStatus();

  const selectedKeys = [location.pathname === "/" ? "/dashboard" : location.pathname];

  const openKeys = (() => {
    const path = location.pathname;
    const groups = ["inventario", "comercial", "financiero", "ia", "administracion"];

    for (const group of groups) {
      const groupItem = menuItems.find(
        (item) => item && "key" in item && item.key === group,
      );

      if (groupItem && "children" in groupItem && groupItem.children) {
        const childKeys = groupItem.children.map((child) =>
          child && "key" in child ? child.key : "",
        );

        if (childKeys.includes(path)) {
          return [group];
        }
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
