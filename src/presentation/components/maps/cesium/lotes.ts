import type { Entity, Viewer } from "cesium";
import type { PlanoLote } from "@/domain/mapa/entities";
import { ESTILO_ESTADO_PLANO } from "../estilosEstadoLote";
import type { LimitesGeo } from "../georef";
import { poligonoAWgs84, type CoordenadaWgs84 } from "./proyectar";

type MotorCesium = typeof import("cesium");

export type EntidadesLoteCesium = Map<number, Entity>;

export function idEntidadLote(idLote: number): string {
  return `lote:${idLote}`;
}

export function actualizarEntidadesLote(
  viewer: Viewer,
  cesium: MotorCesium,
  lotes: readonly PlanoLote[],
  limites: LimitesGeo,
  entidades: EntidadesLoteCesium,
): void {
  const vigentes = new Set<number>();

  for (const lote of lotes) {
    if (!lote.poligono || lote.poligono.length < 3) continue;

    vigentes.add(lote.id_lote);
    const coordenadas = poligonoAWgs84(lote.poligono, limites);
    const posiciones = cesium.Cartesian3.fromDegreesArray(coordenadas.flat());
    const centro = centroide(coordenadas);
    const estilo = ESTILO_ESTADO_PLANO[lote.estado] ?? ESTILO_ESTADO_PLANO.disponible;
    const color = cesium.Color.fromCssColorString(estilo.color);
    const alpha = Math.max(estilo.fillOpacity, 0.18);
    const options = {
      id: idEntidadLote(lote.id_lote),
      name: `Lote ${lote.numero_lote}`,
      position: new cesium.ConstantPositionProperty(
        cesium.Cartesian3.fromDegrees(centro[0], centro[1]),
      ),
      polygon: new cesium.PolygonGraphics({
        hierarchy: new cesium.PolygonHierarchy(posiciones),
        material: color.withAlpha(alpha),
        outline: true,
        outlineColor: color,
        outlineWidth: 2,
        heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
      }),
      label: new cesium.LabelGraphics({
        text: lote.numero_lote,
        font: "12px sans-serif",
        style: cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: cesium.Color.WHITE,
        outlineColor: cesium.Color.BLACK,
        outlineWidth: 3,
        showBackground: true,
        backgroundColor: cesium.Color.BLACK.withAlpha(0.65),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        heightReference: cesium.HeightReference.CLAMP_TO_GROUND,
      }),
    };

    const entity = entidades.get(lote.id_lote);
    if (entity) {
      entity.name = options.name;
      entity.position = options.position;
      entity.polygon = options.polygon;
      entity.label = options.label;
    } else {
      entidades.set(lote.id_lote, viewer.entities.add(options));
    }
  }

  for (const [idLote] of entidades) {
    if (vigentes.has(idLote)) continue;
    viewer.entities.removeById(idEntidadLote(idLote));
    entidades.delete(idLote);
  }
}

function centroide(coordenadas: readonly CoordenadaWgs84[]): CoordenadaWgs84 {
  const total = coordenadas.length;
  const [lng, lat] = coordenadas.reduce<[number, number]>(
    ([lngActual, latActual], [siguienteLng, siguienteLat]) => [
      lngActual + siguienteLng,
      latActual + siguienteLat,
    ],
    [0, 0],
  );
  return [lng / total, lat / total];
}
