export interface Usuario {
  id_usuario: number;
  id_empresa: number;
  nombres: string;
  email: string;
  estado: "activo" | "inactivo";
}

export const usuarios: Usuario[] = [
  {
    id_usuario: 1,
    id_empresa: 1,
    nombres: "Andrés Cevallos Torres",
    email: "andres.cevallos@constructoradelnorte.com.ec",
    estado: "activo",
  },
  {
    id_usuario: 2,
    id_empresa: 1,
    nombres: "Patricia Moreira Paz",
    email: "patricia.moreira@constructoradelnorte.com.ec",
    estado: "activo",
  },
  {
    id_usuario: 3,
    id_empresa: 2,
    nombres: "Santiago Acosta Vera",
    email: "santiago.acosta@inmobiliariasur.com.ec",
    estado: "activo",
  },
  {
    id_usuario: 4,
    id_empresa: 2,
    nombres: "Carolina Bustamante Ríos",
    email: "carolina.bustamante@inmobiliariasur.com.ec",
    estado: "activo",
  },
];
