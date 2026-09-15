import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Select, Avatar, Dropdown, Space, Badge } from "antd";
import {
  SettingOutlined,
  LogoutOutlined,
  BulbOutlined,
  BulbFilled,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  QuestionCircleOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { useEmpresa } from "@/presentation/providers";
import { useTheme } from "@/presentation/theme";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useAlertas } from "@/presentation/hooks";

interface HeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Header({ collapsed, onToggleCollapse }: HeaderProps) {
  const navigate = useNavigate();
  const { empresaActual, empresas, setEmpresaActual } = useEmpresa();
  const { setMode, isDark } = useTheme();
  const { user, logout } = useAuth();
  const { data: alertas } = useAlertas();
  const alertCount = alertas?.filter((a) => a.prioridad === "alta").length ?? 0;

  const userMenuItems: MenuProps["items"] = useMemo(
    () => [
      {
        key: "user-info",
        label: (
          <div style={{ padding: "8px 4px", minWidth: 200 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{user?.nombres}</div>
            <div style={{ fontSize: 12, color: "#8c8c8c" }}>{user?.email}</div>
          </div>
        ),
        disabled: true,
      },
      { type: "divider" },
      {
        key: "settings",
        icon: <SettingOutlined />,
        label: "Configuracion",
      },
      {
        key: "theme",
        icon: isDark ? <BulbFilled /> : <BulbOutlined />,
        label: isDark ? "Modo Claro" : "Modo Oscuro",
        onClick: () => setMode(isDark ? "light" : "dark"),
      },
      { type: "divider" },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Cerrar Sesion",
        danger: true,
        onClick: () => {
          logout();
          navigate("/login");
        },
      },
    ],
    [isDark, setMode, logout, navigate, user],
  );

  const handleEmpresaChange = (value: number) => {
    const empresa = empresas.find((e) => e.id_empresa === value);
    if (empresa) {
      setEmpresaActual(empresa);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "0 24px",
        height: 64,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          onClick={onToggleCollapse}
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: 8,
            transition: "all 0.2s",
            color: "#595959",
            fontSize: 16,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f5f5f5";
            e.currentTarget.style.color = "#1677ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#595959";
          }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
      </div>

      <Space size={12} align="center">
        <Select
          placeholder="Seleccionar Empresa"
          style={{ width: 260 }}
          size="large"
          value={empresaActual?.id_empresa}
          onChange={handleEmpresaChange}
          allowClear={false}
          options={empresas.map((e) => ({
            value: e.id_empresa,
            label: (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "#f0f5ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1677ff",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {e.razon_social.charAt(0)}
                </div>
                <span>{e.razon_social}</span>
              </div>
            ),
          }))}
        />

        <div
          style={{
            width: 1,
            height: 24,
            background: "#f0f0f0",
            margin: "0 4px",
          }}
        />

        <Badge count={alertCount} size="small" offset={[-2, 2]}>
          <div
            onClick={() => navigate("/alertas")}
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              borderRadius: 8,
              transition: "all 0.2s",
              color: "#595959",
              fontSize: 16,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f5f5f5";
              e.currentTarget.style.color = "#1677ff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#595959";
            }}
          >
            <BellOutlined />
          </div>
        </Badge>

        <div
          style={{
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: 8,
            transition: "all 0.2s",
            color: "#595959",
            fontSize: 16,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f5f5f5";
            e.currentTarget.style.color = "#1677ff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#595959";
          }}
        >
          <QuestionCircleOutlined />
        </div>

        <div
          style={{
            width: 1,
            height: 24,
            background: "#f0f0f0",
            margin: "0 4px",
          }}
        />

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={["click"]}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: 10,
              transition: "all 0.2s",
              border: "1px solid #f0f0f0",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fafafa";
              e.currentTarget.style.borderColor = "#d9d9d9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "#f0f0f0";
            }}
          >
            <Avatar
              size={32}
              style={{
                background: "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {user?.nombres ? getInitials(user.nombres) : "U"}
            </Avatar>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#262626" }}>
                {user?.nombres?.split(" ").slice(0, 2).join(" ") || "Usuario"}
              </div>
              <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                {user?.email || "usuario@email.com"}
              </div>
            </div>
          </div>
        </Dropdown>
      </Space>
    </div>
  );
}
