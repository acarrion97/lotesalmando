export interface Mapa {
  id_mapa: number;
  id_proyecto: number;
  url_publica: string;
}

export const mapas: Mapa[] = [
  { id_mapa: 1, id_proyecto: 1, url_publica: "/mapas/villa-del-lago-v1.png" },
  { id_mapa: 2, id_proyecto: 2, url_publica: "/mapas/residencial-el-parque-v1.png" },
  { id_mapa: 3, id_proyecto: 3, url_publica: "/mapas/ciudad-norte-v1.png" },
  { id_mapa: 4, id_proyecto: 3, url_publica: "/mapas/ciudad-norte-industrial-v1.png" },
];
