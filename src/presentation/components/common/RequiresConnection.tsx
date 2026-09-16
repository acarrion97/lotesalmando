import { Result } from "antd";
import { WifiOutlined } from "@ant-design/icons";

/**
 * Cartera, pagos, and dashboard financial data are intentionally excluded
 * from offline persistence (offline/data-policy) — freshness matters more
 * than availability for money. This replaces the page content instead of
 * silently showing an empty table or a misleading $0 when there's no
 * connection and nothing cached to show.
 */
export function RequiresConnection() {
  return (
    <Result
      icon={<WifiOutlined style={{ color: "#faad14" }} />}
      title="Se requiere conexión"
      subTitle="Esta información no se guarda para uso sin conexión porque su vigencia es crítica. Vuelva a conectarse para consultarla."
    />
  );
}
