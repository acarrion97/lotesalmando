export interface Empresa {
  id_empresa: number;
  razon_social: string;
  ruc: string;
  estado: string;
  plan: string | null;
  id_partner: number | null;
}

export const empresas: Empresa[] = [
  {
    id_empresa: 1,
    razon_social: "Constructora del Norte",
    ruc: "0992345678001",
    estado: "activa",
    plan: null,
    id_partner: null,
  },
  {
    id_empresa: 2,
    razon_social: "Inmobiliaria Sur",
    ruc: "0912345678001",
    estado: "activa",
    plan: null,
    id_partner: null,
  },
];
