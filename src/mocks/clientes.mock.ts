export interface Cliente {
  id_cliente: number;
  id_empresa: number;
  nombres: string;
  cedula_ruc: string;
  email: string;
  telefono: string | null;
}

export const clientes: Cliente[] = [
  {
    id_cliente: 1,
    id_empresa: 1,
    nombres: "Carlos Mendoza Rivera",
    cedula_ruc: "1804567890",
    email: "carlos.mendoza@gmail.com",
    telefono: "0991234567",
  },
  {
    id_cliente: 2,
    id_empresa: 1,
    nombres: "María Fernanda López Castillo",
    cedula_ruc: "0709876543",
    email: "maria.lopez@hotmail.com",
    telefono: "0987654321",
  },
  {
    id_cliente: 3,
    id_empresa: 2,
    nombres: "Roberto Jiménez Pérez",
    cedula_ruc: "0401234567",
    email: "roberto.jimenez@outlook.com",
    telefono: null,
  },
  {
    id_cliente: 4,
    id_empresa: 1,
    nombres: "Ana Lucía Morales Vega",
    cedula_ruc: "1102345678",
    email: "ana.morales@gmail.com",
    telefono: "0965554433",
  },
  {
    id_cliente: 5,
    id_empresa: 2,
    nombres: "Luis Herrera Gómez",
    cedula_ruc: "0912345678",
    email: "luis.herrera@yahoo.com",
    telefono: null,
  },
  {
    id_cliente: 6,
    id_empresa: 1,
    nombres: "Diana Paredes Silva",
    cedula_ruc: "0503456789",
    email: "diana.paredes@gmail.com",
    telefono: "0922110099",
  },
];
