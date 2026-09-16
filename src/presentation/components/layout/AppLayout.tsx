import { useState, useCallback, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Layout, theme } from "antd";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Breadcrumbs } from "./Breadcrumbs";

const { Sider, Content } = Layout;

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  useEffect(() => {
    const updateViewport = () => {
      const nextIsMobile = window.innerWidth < 1024;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        setMobileOpen(false);
      }
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
      return;
    }

    setCollapsed((prev) => !prev);
  }, [isMobile]);

  const siderVisible = isMobile ? mobileOpen : true;

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.35)",
            zIndex: 99,
          }}
        />
      )}

      <Sider
        collapsible={!isMobile}
        collapsed={isMobile ? false : collapsed}
        onCollapse={(nextCollapsed) => {
          if (!isMobile) {
            setCollapsed(nextCollapsed);
          }
        }}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          setIsMobile(broken);
          setMobileOpen(false);
        }}
        width={260}
        collapsedWidth={72}
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: isMobile ? (siderVisible ? 0 : -260) : 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: "linear-gradient(180deg, #001529 0%, #002140 100%)",
          boxShadow: isMobile ? "0 8px 24px rgba(0,0,0,0.25)" : "2px 0 8px rgba(0,0,0,0.15)",
          transition: "left 0.2s ease",
        }}
        theme="dark"
      >
        <Sidebar collapsed={isMobile ? false : collapsed} />
      </Sider>

      <Layout
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 72 : 260,
          transition: "margin-left 0.2s",
        }}
      >
        <Layout.Header
          style={{
            padding: 0,
            background: colorBgContainer,
            borderBottom: "1px solid #f0f0f0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            position: "sticky",
            top: 0,
            zIndex: 99,
            display: "flex",
            alignItems: "center",
            height: 64,
          }}
        >
          <Header collapsed={collapsed} onToggleCollapse={handleToggleCollapse} />
        </Layout.Header>

        <Content
          style={{
            margin: isMobile ? 12 : 24,
            padding: 0,
            background: "transparent",
            minHeight: "calc(100vh - 64px - 48px)",
          }}
        >
          <div
            style={{
              background: colorBgContainer,
              borderRadius: 12,
              padding: isMobile ? 16 : 24,
              boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              minHeight: "calc(100vh - 64px - 48px)",
            }}
          >
            <Breadcrumbs />
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
