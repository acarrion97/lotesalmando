export interface Proyecto {
  id_proyecto: number;
  id_empresa: number;
  nombre: string;
  descripcion: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  estado: string;
  fecha_inicio: string;
  fecha_fin_estimada: string;
  total_lotes: number;
  precio_minimo: number;
  precio_maximo: number;
}

export const proyectos: Proyecto[] = [
  {
    id_proyecto: 1,
    id_empresa: 1,
    nombre: "Villa del Lago",
    descripcion: "Conjunto residencial a orillas del lago San Pablo, con vista panorámica al volcán Cayambe",
    direccion: "Km 5 vía a San Pablo, Ibarra",
    ciudad: "Ibarra",
    provincia: "Imbabura",
    estado: "en_venta",
    fecha_inicio: "2024-01-10",
    fecha_fin_estimada: "2025-06-30",
    total_lotes: 120,
    precio_minimo: 28000,
    precio_maximo: 65000,
  },
  {
    id_proyecto: 2,
    id_empresa: 1,
    nombre: "Residencial El Parque",
    descripcion: "Urbanización cerrada con áreas verdes, parques y zona deportiva",
    direccion: "Av. Atahualpa y Calle 10, Ambato",
    ciudad: "Ambato",
    provincia: "Tungurahua",
    estado: "en_venta",
    fecha_inicio: "2024-03-05",
    fecha_fin_estimada: "2025-12-15",
    total_lotes: 85,
    precio_minimo: 32000,
    precio_maximo: 58000,
  },
  {
    id_proyecto: 3,
    id_empresa: 2,
    nombre: "Ciudad Norte",
    descripcion: "Proyecto de desarrollo urbano con lotes industriales y residenciales",
    direccion: "Vía a Daule Km 12, Guayaquil",
    ciudad: "Guayaquil",
    provincia: "Guayas",
    estado: "en_venta",
    fecha_inicio: "2024-02-20",
    fecha_fin_estimada: "2025-09-30",
    total_lotes: 200,
    precio_minimo: 45000,
    precio_maximo: 120000,
  },
  {
    id_proyecto: 4,
    id_empresa: 2,
    nombre: "Lomas Verdes",
    descripcion: "Conjunto habitacional ecológico con tecnología sustentable",
    direccion: "Cumbayá y Tumbaco, Quito",
    ciudad: "Quito",
    provincia: "Pichincha",
    estado: "en_planeacion",
    fecha_inicio: "2024-06-01",
    fecha_fin_estimada: "2026-03-31",
    total_lotes: 60,
    precio_minimo: 55000,
    precio_maximo: 95000,
  },
];
