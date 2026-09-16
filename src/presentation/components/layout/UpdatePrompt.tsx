import { useRegisterSW } from "virtual:pwa-register/react";
import { notification, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { useEffect, useRef } from "react";

/**
 * Registers the service worker with `registerType: "prompt"` and surfaces a
 * dismissible banner when a new version is available, instead of silently
 * swapping the running app's code (see design.md decision 9).
 */
export function UpdatePrompt() {
  const notifiedRef = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      console.error("Service worker registration failed", error);
    },
  });

  useEffect(() => {
    if (!needRefresh || notifiedRef.current) return;
    notifiedRef.current = true;

    notification.info({
      key: "sw-update-available",
      message: "Nueva versión disponible",
      description: "Hay una actualización de Lotes al Mando lista para instalarse.",
      duration: 0,
      placement: "bottomRight",
      icon: <ReloadOutlined style={{ color: "#10B981" }} />,
      btn: (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            notification.destroy("sw-update-available");
            updateServiceWorker(true);
          }}
        >
          Actualizar ahora
        </Button>
      ),
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
