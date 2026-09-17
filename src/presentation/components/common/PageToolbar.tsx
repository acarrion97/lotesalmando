import type { ReactNode } from "react";
import { Input, Space, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface PageToolbarSearch {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number | string;
}

interface PageToolbarProps {
  title: ReactNode;
  subtitle?: ReactNode;
  search?: PageToolbarSearch;
  /** Extra content rendered before the primary actions (e.g. filters). */
  extra?: ReactNode;
  /** Primary actions, e.g. a "Nuevo" button. */
  actions?: ReactNode;
}

/**
 * Responsive page header: title/subtitle on the left, search + actions on the right.
 * Wraps onto its own row instead of squeezing the title into a single narrow
 * column (the cause of the vertical-text rendering bug on small viewports).
 */
export function PageToolbar({ title, subtitle, search, extra, actions }: PageToolbarProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Title level={4} style={{ margin: 0 }} ellipsis>
          {title}
        </Title>
        {subtitle && <Text type="secondary">{subtitle}</Text>}
      </div>
      <Space wrap>
        {search && (
          <Input
            placeholder={search.placeholder ?? "Buscar..."}
            prefix={<SearchOutlined />}
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            style={{ width: search.width ?? 250 }}
            allowClear
          />
        )}
        {extra}
        {actions}
      </Space>
    </div>
  );
}
