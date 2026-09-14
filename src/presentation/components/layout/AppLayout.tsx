import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { Layout, theme } from "antd";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Breadcrumbs } from "./Breadcrumbs";

const { Sider, Content } = Layout;

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          setCollapsed(broken);
        }}
        width={260}
        collapsedWidth={72}
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: "linear-gradient(180deg, #001529 0%, #002140 100%)",
          boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
        }}
        theme="dark"
      >
        <Sidebar collapsed={collapsed} />
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 72 : 260,
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
            margin: 24,
            padding: 0,
            background: "transparent",
            minHeight: "calc(100vh - 64px - 48px)",
          }}
        >
          <div
            style={{
              background: colorBgContainer,
              borderRadius: 12,
              padding: 24,
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
