export interface Configuracion {
  id_configuracion: number;
  id_empresa: number;
  moneda: string;
  idioma: string;
  timezone: string;
  impuesto_porcentaje: number;
  logo_empresa: string;
  color_primario: string;
}

export const configuraciones: Configuracion[] = [
  {
    id_configuracion: 1,
    id_empresa: 1,
    moneda: "USD",
    idioma: "es",
    timezone: "America/Guayaquil",
    impuesto_porcentaje: 12,
    logo_empresa: "/logos/constructora-norte.png",
    color_primario: "#1E40AF",
  },
  {
    id_configuracion: 2,
    id_empresa: 2,
    moneda: "USD",
    idioma: "es",
    timezone: "America/Guayaquil",
    impuesto_porcentaje: 12,
    logo_empresa: "/logos/inmobiliaria-sur.png",
    color_primario: "#047857",
  },
];
