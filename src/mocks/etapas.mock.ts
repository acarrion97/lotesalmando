export interface Etapa {
  id_etapa: number;
  id_proyecto: number;
  nombre: string;
  orden: number;
}

export const etapas: Etapa[] = [
  { id_etapa: 1, id_proyecto: 1, nombre: "Etapa 1", orden: 1 },
  { id_etapa: 2, id_proyecto: 1, nombre: "Etapa 2", orden: 2 },
  { id_etapa: 3, id_proyecto: 1, nombre: "Etapa 3", orden: 3 },
  { id_etapa: 4, id_proyecto: 2, nombre: "Etapa 1", orden: 1 },
  { id_etapa: 5, id_proyecto: 2, nombre: "Etapa 2", orden: 2 },
  { id_etapa: 6, id_proyecto: 2, nombre: "Etapa 3", orden: 3 },
  { id_etapa: 7, id_proyecto: 3, nombre: "Etapa 1", orden: 1 },
  { id_etapa: 8, id_proyecto: 3, nombre: "Etapa 2", orden: 2 },
  { id_etapa: 9, id_proyecto: 3, nombre: "Etapa 3", orden: 3 },
  { id_etapa: 10, id_proyecto: 4, nombre: "Etapa 1", orden: 1 },
  { id_etapa: 11, id_proyecto: 4, nombre: "Etapa 2", orden: 2 },
];
