import { Tag, Tooltip } from "antd";
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined } from "@ant-design/icons";
import { classifyFreshness, formatDataAge } from "@/infrastructure/offline/freshness";

interface FreshnessBadgeProps {
  dataUpdatedAt: number | undefined;
}

const CONFIG = {
  fresh: { color: "success", icon: <CheckCircleOutlined />, label: "Al día" },
  stale: { color: "warning", icon: <ClockCircleOutlined />, label: "Desactualizado" },
  "very-stale": { color: "error", icon: <WarningOutlined />, label: "Muy desactualizado" },
} as const;

/**
 * Shows how old the currently displayed data is. Any lote availability or
 * price shown alongside this badge reflects that snapshot, not a live
 * guarantee (offline/freshness) — the tooltip says so explicitly.
 */
export function FreshnessBadge({ dataUpdatedAt }: FreshnessBadgeProps) {
  const freshness = classifyFreshness(dataUpdatedAt);
  const { color, icon, label } = CONFIG[freshness];
  const ageText = formatDataAge(dataUpdatedAt);

  return (
    <Tooltip title={`${ageText} — según la última sincronización, no necesariamente el estado actual`}>
      <Tag color={color} icon={icon} style={{ marginInlineEnd: 0 }}>
        {label}
      </Tag>
    </Tooltip>
  );
}
