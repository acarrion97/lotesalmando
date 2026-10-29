import { Divider, Slider, Switch, Typography } from "antd";
import { SunOutlined } from "@ant-design/icons";
import type { CapaBaseCesium } from "./VisorCesium";
import type { CalidadEscena } from "./controlesEscena";
import {
  CALIDAD_INICIAL,
  RANGO_ERROR_PANTALLA,
  RANGO_ESCALA_RESOLUCION,
  RANGO_HORA,
  horaATexto,
} from "./controlesEscena";

const { Text } = Typography;

interface FilaSliderProps {
  etiqueta: string;
  valor: number;
  rango: { min: number; max: number; paso: number };
  formato: (valor: number) => string;
  onChange: (valor: number) => void;
  descripcion?: string;
}

/** Etiqueta + valor + slider: la misma forma para la hora y para cada control. */
function FilaSlider({ etiqueta, valor, rango, formato, onChange, descripcion }: FilaSliderProps) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ fontSize: 12 }}>{etiqueta}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formato(valor)}
        </Text>
      </div>
      <Slider
        min={rango.min}
        max={rango.max}
        step={rango.paso}
        value={valor}
        onChange={onChange}
        tooltip={{ formatter: (valor) => (valor == null ? "" : formato(valor)) }}
      />
      {descripcion && (
        <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: -6 }}>
          {descripcion}
        </Text>
      )}
    </div>
  );
}

interface PanelControlesEscenaProps {
  hora: number;
  onHora: (hora: number) => void;
  calidad: CalidadEscena;
  onCalidad: (calidad: CalidadEscena) => void;
  /** Capa base activa: sobre la malla fotográfica la hora no cambia el sombreado. */
  capaBase: CapaBaseCesium;
}

/**
 * Controles de la escena 3D: hora del día (tarea 5.1) y calidad de render
 * (tarea 5.2). Todo muta la escena viva —el reloj del Viewer y las propiedades
 * de los tilesets— sin recrear el visor (design.md D4).
 */
export function PanelControlesEscena({
  hora,
  onHora,
  calidad,
  onCalidad,
  capaBase,
}: PanelControlesEscenaProps) {
  return (
    <div style={{ width: 264 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        <SunOutlined style={{ fontSize: 13 }} />
        <Text strong style={{ fontSize: 12 }}>
          Hora del día
        </Text>
      </div>
      <FilaSlider
        etiqueta="Posición del sol"
        valor={hora}
        rango={RANGO_HORA}
        formato={horaATexto}
        onChange={onHora}
        descripcion={
          capaBase === "fotografica"
            ? "La vista fotográfica conserva su iluminación grabada: a ella la hora solo mueve el cielo."
            : undefined
        }
      />

      <Divider style={{ margin: "4px 0 8px" }} />

      <Text strong style={{ fontSize: 12, display: "block", marginBottom: 2 }}>
        Calidad
      </Text>
      <FilaSlider
        etiqueta="Nitidez (error de pantalla)"
        valor={calidad.errorPantalla}
        rango={RANGO_ERROR_PANTALLA}
        formato={(valor) => `${valor}`}
        onChange={(errorPantalla) => onCalidad({ ...calidad, errorPantalla })}
        descripcion="Más nitidez pide tiles de mayor detalle: sube el consumo de datos y de cuota."
      />
      <FilaSlider
        etiqueta="Escala de resolución"
        valor={calidad.escalaResolucion}
        rango={RANGO_ESCALA_RESOLUCION}
        formato={(valor) => `${Math.round(valor * 100)} %`}
        onChange={(escalaResolucion) => onCalidad({ ...calidad, escalaResolucion })}
      />
      <div style={{ display: "flex", gap: 16 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <Switch
            size="small"
            checked={calidad.fxaa}
            onChange={(fxaa) => onCalidad({ ...calidad, fxaa })}
          />
          Suavizado (FXAA)
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <Switch
            size="small"
            checked={calidad.hdr}
            onChange={(hdr) => onCalidad({ ...calidad, hdr })}
          />
          HDR
        </label>
      </div>

      {(calidad.errorPantalla !== CALIDAD_INICIAL.errorPantalla ||
        calidad.escalaResolucion !== CALIDAD_INICIAL.escalaResolucion) && (
        <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 8 }}>
          Una calidad más alta consume más ancho de banda y cuota del proveedor 3D.
        </Text>
      )}
    </div>
  );
}
