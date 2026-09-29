import { Tabs } from "antd";
import { DownloadOutlined, ImportOutlined } from "@ant-design/icons";
import { PlantillaWizard } from "./PlantillaWizard";
import { ImportacionWizard } from "./ImportacionWizard";

/**
 * Apartado de Configuración para trabajar con archivos planos:
 * generar la plantilla con las cabeceras de una tabla o importar un archivo
 * existente sobre esa misma tabla.
 */
export function ExportacionWizard() {
  return (
    <Tabs
      items={[
        {
          key: "plantilla",
          label: (
            <span>
              <DownloadOutlined /> Generar plantilla
            </span>
          ),
          children: <PlantillaWizard />,
        },
        {
          key: "importar",
          label: (
            <span>
              <ImportOutlined /> Importar archivo
            </span>
          ),
          children: <ImportacionWizard />,
        },
      ]}
    />
  );
}
