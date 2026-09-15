import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Typography } from "antd";
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
} from "@ant-design/icons";
import type { MenuProps } from "antd";

const { Text } = Typography;

type MenuItem = Required<MenuProps>["items"][number];

const menuItems: MenuItem[] = [
  {
    key: "/dashboard",
    icon: <DashboardOutlined />,
    label: "Dashboard",
  },
  {
    key: "comercial",
    label: (
      <Text
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.2,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
        }}
      >
        COMERCIAL
      </Text>
    ),
    type: "group",
    children: [
      { key: "/proyectos", icon: <ProjectOutlined />, label: "Proyectos" },
      { key: "/mapas", icon: <EnvironmentOutlined />, label: "Mapas" },
      { key: "/lotes", icon: <HomeOutlined />, label: "Lotes" },
      { key: "/inventario", icon: <InboxOutlined />, label: "Inventario" },
      { key: "/clientes", icon: <UserOutlined />, label: "Clientes" },
      { key: "/cotizaciones", icon: <FileTextOutlined />, label: "Cotizaciones" },
      { key: "/ventas", icon: <DollarOutlined />, label: "Ventas" },
      { key: "/prospectos", icon: <UserOutlined />, label: "Prospectos" },
    ],
  },
  {
    key: "financiero",
    label: (
      <Text
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.2,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
        }}
      >
        FINANCIERO
      </Text>
    ),
    type: "group",
    children: [
      { key: "/contratos", icon: <FileProtectOutlined />, label: "Contratos" },
      { key: "/cobranzas", icon: <CreditCardOutlined />, label: "Cobranzas" },
      { key: "/pagos", icon: <PayCircleOutlined />, label: "Pagos" },
    ],
  },
  {
    key: "administracion",
    label: (
      <Text
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.2,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
        }}
      >
        ADMINISTRACION
      </Text>
    ),
    type: "group",
    children: [
      { key: "/usuarios", icon: <TeamOutlined />, label: "Usuarios" },
    ],
  },
  {
    key: "configuracion",
    label: (
      <Text
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.2,
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
        }}
      >
        CONFIGURACION
      </Text>
    ),
    type: "group",
    children: [
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

  const selectedKeys = useMemo(() => {
    const path = location.pathname;
    return [path === "/" ? "/dashboard" : path];
  }, [location.pathname]);

  const openKeys = useMemo(() => {
    const path = location.pathname;
    const groups = ["comercial", "financiero", "administracion", "configuracion"];
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
  }, [location.pathname]);

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
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
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <img
            src="/logo-icon.png"
            alt="Lotes al Mando"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
        {!collapsed && (
          <div>
            <div
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: 3,
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              LOTES
            </div>
            <div
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 1,
                lineHeight: 1.1,
                marginTop: 1,
              }}
            >
              AL MANDO
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: 7,
                fontWeight: 500,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                marginTop: 3,
              }}
            >
              PLATAFORMA INMOBILIARIA INTEGRAL
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 8px" }}>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={collapsed ? [] : openKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 0,
            background: "transparent",
          }}
        />
      </div>

      {!collapsed && (
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#52c41a",
                boxShadow: "0 0 8px #52c41a",
              }}
            />
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
              Sistema activo
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}
