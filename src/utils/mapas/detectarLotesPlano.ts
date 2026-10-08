/**
 * Detección automática de lotes sobre la imagen de un plano.
 *
 * Los lotes se dibujan como cuadriláteros cerrados con línea gris/negra. El
 * algoritmo marca esas líneas como "paredes", etiqueta las regiones vacías
 * (relleno por inundación) y se queda con las que parecen un lote: tamaño
 * razonable y forma de cuadrilátero. Cada región se devuelve como contorno de
 * 4 puntos normalizados a 0..1 (misma convención que `lotes.poligono`).
 *
 * Funciones puras, sin DOM: reciben los píxeles (RGBA) y devuelven datos, para
 * poder verificarlas con `node scripts/verificar-deteccion-poligonos.ts`.
 */

export type Punto = [number, number];

/** Píxeles RGBA (como `ImageData`). */
export interface ImagenRaster {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface OpcionesDeteccion {
  /**
   * Píxeles con luminosidad menor a este valor cuentan como línea (0..255).
   * Si no se indica se calcula como `fondo - 7`, donde `fondo` es el blanco
   * del propio plano (un JPG con ruido no tiene blanco puro).
   */
  umbralLinea?: number;
  /** Diferencia máxima entre canales R/G/B para considerar la línea gris/negra. */
  croma?: number;
  /** Área mínima de un lote, como fracción del área total de la imagen. */
  areaMinima?: number;
  /** Área máxima de un lote, como fracción del área total de la imagen. */
  areaMaxima?: number;
  /** Fracción mínima del cuadrilátero que debe ser región vacía (el texto la agujerea). */
  solidezMinima?: number;
  /** Dilatación de las líneas en px (cierra huecos entre líneas que deberían tocarse). */
  dilatacion?: number;
  /**
   * Descarta regiones menores a esta fracción del lote mediano (restos de
   * recuadros, rótulos). 0 desactiva el filtro.
   */
  fraccionMinimaMediana?: number;
  /** Diagnóstico opcional: se llama con el motivo de cada región descartada. */
  alDescartar?: (motivo: string, centro: Punto, detalle: Record<string, number>) => void;
}

const POR_DEFECTO: Required<Omit<OpcionesDeteccion, "alDescartar">> = {
  umbralLinea: 0, // 0 = automático (fondo - 7)
  croma: 80,
  areaMinima: 0.0001,
  areaMaxima: 0.012,
  solidezMinima: 0.55,
  dilatacion: 0,
  fraccionMinimaMediana: 0.45,
};

/** Cierra huecos de 1px entre líneas que deberían tocarse. */
function dilatar(pared: Uint8Array, w: number, h: number): Uint8Array {
  const horizontal = new Uint8Array(pared.length);
  for (let y = 0; y < h; y++) {
    const fila = y * w;
    for (let x = 0; x < w; x++) {
      if (pared[fila + x] || (x > 0 && pared[fila + x - 1]) || (x < w - 1 && pared[fila + x + 1])) {
        horizontal[fila + x] = 1;
      }
    }
  }
  const salida = new Uint8Array(pared.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (horizontal[i] || (y > 0 && horizontal[i - w]) || (y < h - 1 && horizontal[i + w])) {
        salida[i] = 1;
      }
    }
  }
  return salida;
}

/** Envolvente convexa (monotone chain). */
function envolvente(puntos: Punto[]): Punto[] {
  const p = [...puntos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cruz = (o: Punto, a: Punto, b: Punto) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const inf: Punto[] = [];
  for (const q of p) {
    while (inf.length >= 2 && cruz(inf[inf.length - 2], inf[inf.length - 1], q) <= 0) inf.pop();
    inf.push(q);
  }
  const sup: Punto[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (sup.length >= 2 && cruz(sup[sup.length - 2], sup[sup.length - 1], q) <= 0) sup.pop();
    sup.push(q);
  }
  inf.pop();
  sup.pop();
  return [...inf, ...sup];
}

function areaPoligono(p: Punto[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

function distanciaASegmento(p: Punto, a: Punto, b: Punto): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas-Peucker sobre un anillo cerrado, anclado en los dos puntos más lejanos. */
function simplificarAnillo(anillo: Punto[], tol: number): Punto[] {
  const n = anillo.length;
  if (n <= 3) return anillo;
  let ia = 0;
  let ib = 0;
  let mejor = -1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(anillo[i][0] - anillo[j][0], anillo[i][1] - anillo[j][1]);
      if (d > mejor) {
        mejor = d;
        ia = i;
        ib = j;
      }
    }
  }
  const dp = (pts: Punto[]): Punto[] => {
    if (pts.length < 3) return pts;
    const a = pts[0];
    const b = pts[pts.length - 1];
    let max = -1;
    let idx = -1;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = distanciaASegmento(pts[i], a, b);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max <= tol) return [a, b];
    const izq = dp(pts.slice(0, idx + 1));
    const der = dp(pts.slice(idx));
    return [...izq.slice(0, -1), ...der];
  };
  const tramo1 = anillo.slice(ia, ib + 1);
  const tramo2 = [...anillo.slice(ib), ...anillo.slice(0, ia + 1)];
  return [...dp(tramo1).slice(0, -1), ...dp(tramo2).slice(0, -1)];
}

/** Reduce un polígono convexo a un cuadrilátero; `null` si no se deja. */
function aCuadrilatero(hull: Punto[], escala: number): Punto[] | null {
  for (let tol = 0.5; tol < 6 * escala; tol += 0.25) {
    const s = simplificarAnillo(hull, tol);
    if (s.length === 4) return s;
    if (s.length < 4) return null;
  }
  return null;
}

/** Desplaza cada lado hacia afuera `d` px (intersección de lados vecinos). */
function expandir(poly: Punto[], d: number): Punto[] {
  // orientación: normales hacia afuera según el signo del área firmada
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  const signo = a > 0 ? 1 : -1;
  const lados = poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = (dy / l) * signo;
    const ny = (-dx / l) * signo;
    return { p: [p[0] + nx * d, p[1] + ny * d] as Punto, v: [dx / l, dy / l] as Punto };
  });
  return poly.map((_, i) => {
    const a1 = lados[(i + lados.length - 1) % lados.length];
    const a2 = lados[i];
    const den = a1.v[0] * a2.v[1] - a1.v[1] * a2.v[0];
    if (Math.abs(den) < 1e-9) return poly[i];
    const t = ((a2.p[0] - a1.p[0]) * a2.v[1] - (a2.p[1] - a1.p[1]) * a2.v[0]) / den;
    return [a1.p[0] + a1.v[0] * t, a1.p[1] + a1.v[1] * t] as Punto;
  });
}

/**
 * Detecta los lotes de la imagen. Devuelve contornos de 4 puntos normalizados
 * a 0..1 (x sobre el ancho, y sobre el alto).
 */
export function detectarPoligonos(img: ImagenRaster, opciones: OpcionesDeteccion = {}): Punto[][] {
  const { alDescartar: _omitido, ...resto } = opciones;
  void _omitido;
  const o = { ...POR_DEFECTO, ...resto };
  const { width: w, height: h, data } = img;
  const total = w * h;

  let umbral = o.umbralLinea;
  if (!umbral) {
    // Fondo = percentil 90 de la luminosidad (muestreando).
    const hist = new Uint32Array(256);
    let n = 0;
    for (let i = 0; i < total; i += 7) {
      const k = i * 4;
      hist[Math.round(0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2])]++;
      n++;
    }
    let acum = 0;
    let fondo = 255;
    for (let v = 0; v < 256; v++) {
      acum += hist[v];
      if (acum >= n * 0.9) {
        fondo = v;
        break;
      }
    }
    umbral = Math.min(248, fondo - 7);
  }

  const pared = new Uint8Array(total);
  for (let i = 0, k = 0; i < total; i++, k += 4) {
    const r = data[k];
    const g = data[k + 1];
    const b = data[k + 2];
    const luz = 0.299 * r + 0.587 * g + 0.114 * b;
    const croma = Math.max(r, g, b) - Math.min(r, g, b);
    if (data[k + 3] === 0) continue;
    // Línea gris/negra del lote; el rojo de las cotas también cuenta porque a
    // veces se dibuja encima de la línea y deja un hueco entre lotes vecinos.
    const esRojo = r > 170 && g < 120 && b < 120;
    if ((luz < umbral && croma < o.croma) || esRojo) pared[i] = 1;
  }
  let muro: Uint8Array = pared;
  for (let k = 0; k < o.dilatacion; k++) muro = dilatar(muro, w, h);

  const etiquetas = new Int32Array(total);
  const minPx = o.areaMinima * total;
  const maxPx = o.areaMaxima * total;
  const pila = new Int32Array(total);
  const resultado: Punto[][] = [];
  const escala = Math.max(1, w / 2000);
  let siguiente = 0;

  for (let inicio = 0; inicio < total; inicio++) {
    if (muro[inicio] || etiquetas[inicio]) continue;
    siguiente++;
    let sp = 0;
    pila[sp++] = inicio;
    etiquetas[inicio] = siguiente;
    let area = 0;
    let tocaBorde = false;
    const borde: Punto[] = [];
    const miembros: number[] = [];
    while (sp > 0) {
      const i = pila[--sp];
      area++;
      const x = i % w;
      const y = (i - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) tocaBorde = true;
      if (area <= maxPx * 1.2) miembros.push(i);
      let esBorde = false;
      const vecinos = [
        x > 0 ? i - 1 : -1,
        x < w - 1 ? i + 1 : -1,
        y > 0 ? i - w : -1,
        y < h - 1 ? i + w : -1,
      ];
      for (const v of vecinos) {
        if (v < 0 || muro[v]) {
          esBorde = true;
          continue;
        }
        if (!etiquetas[v]) {
          etiquetas[v] = siguiente;
          pila[sp++] = v;
        }
      }
      if (esBorde && area <= maxPx * 1.2) borde.push([x + 0.5, y + 0.5]);
    }
    if (tocaBorde || area < minPx || area > maxPx) continue;

    const hull = envolvente(borde);
    const centro: Punto = centroide(borde).map((v, k) => v / (k === 0 ? w : h)) as Punto;
    if (hull.length < 4) continue;
    const areaHull = areaPoligono(hull);
    if (areaHull === 0 || area / areaHull < o.solidezMinima) {
      opciones.alDescartar?.("solidez", centro, { area, areaHull });
      continue;
    }
    const cuad = aCuadrilatero(hull, escala);
    if (!cuad) {
      opciones.alDescartar?.("no-cuadrilatero", centro, { area, areaHull, vertices: hull.length });
      continue;
    }
    // Debe parecerse al lote: el cuadrilátero casi no sobra sobre la envolvente.
    if (areaPoligono(cuad) / areaHull > 1.12) {
      opciones.alDescartar?.("forma", centro, { ratio: areaPoligono(cuad) / areaHull });
      continue;
    }
    // La pared mide ~3px (línea + dilatación): se recupera el centro de la línea.
    const grande = expandir(cuad, 1.5);
    resultado.push(grande.map(([x, y]) => [x / w, y / h] as Punto));
  }
  if (o.fraccionMinimaMediana > 0 && resultado.length >= 5) {
    const areas = resultado.map(areaPoligono).sort((a, b) => a - b);
    const mediana = areas[Math.floor(areas.length / 2)];
    return resultado.filter((p) => areaPoligono(p) >= mediana * o.fraccionMinimaMediana);
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Agrupación en manzanas y numeración
// ---------------------------------------------------------------------------

export function centroide(p: Punto[]): Punto {
  let x = 0;
  let y = 0;
  for (const q of p) {
    x += q[0];
    y += q[1];
  }
  return [x / p.length, y / p.length];
}

function distanciaEntre(a: Punto[], b: Punto[]): number {
  let min = Infinity;
  for (const p of a) {
    for (let i = 0; i < b.length; i++) {
      min = Math.min(min, distanciaASegmento(p, b[i], b[(i + 1) % b.length]));
    }
  }
  for (const p of b) {
    for (let i = 0; i < a.length; i++) {
      min = Math.min(min, distanciaASegmento(p, a[i], a[(i + 1) % a.length]));
    }
  }
  return min;
}

/**
 * Agrupa lotes que se tocan (la calle los separa de los demás). `tolerancia`
 * en fracción del ancho de la imagen.
 */
export function agruparEnBloques(poligonos: Punto[][], tolerancia = 0.003): number[][] {
  const padre = poligonos.map((_, i) => i);
  const raiz = (i: number): number => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  const cajas = poligonos.map((p) => {
    const xs = p.map((q) => q[0]);
    const ys = p.map((q) => q[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  });
  for (let i = 0; i < poligonos.length; i++) {
    for (let j = i + 1; j < poligonos.length; j++) {
      const a = cajas[i];
      const b = cajas[j];
      if (
        a[2] + tolerancia < b[0] ||
        b[2] + tolerancia < a[0] ||
        a[3] + tolerancia < b[1] ||
        b[3] + tolerancia < a[1]
      ) {
        continue;
      }
      if (distanciaEntre(poligonos[i], poligonos[j]) <= tolerancia) padre[raiz(i)] = raiz(j);
    }
  }
  const grupos = new Map<number, number[]>();
  poligonos.forEach((_, i) => {
    const r = raiz(i);
    grupos.set(r, [...(grupos.get(r) ?? []), i]);
  });
  return [...grupos.values()];
}

export type InicioNumeracion = "superior" | "inferior";
export type PrimeraColumna = "izquierda" | "derecha";
/**
 * - `u`: la primera columna baja y la segunda sube (1..13 abajo, 14..26 arriba).
 * - `paralelo`: ambas columnas en el mismo sentido.
 * - `alternado`: de a pares cruzando la manzana (1 y 2 en la misma fila).
 */
export type PatronNumeracion = "u" | "paralelo" | "alternado";

export interface OpcionesNumeracion {
  inicio: InicioNumeracion;
  primeraColumna: PrimeraColumna;
  patron: PatronNumeracion;
}

/**
 * Devuelve los índices de `poligonos` (los de un mismo bloque) en el orden de
 * numeración 1, 2, 3... según las opciones. Funciona con manzanas giradas: usa
 * el eje largo del bloque, no la vertical de la pantalla.
 */
export function ordenarBloque(
  poligonos: Punto[][],
  indices: number[],
  opciones: OpcionesNumeracion,
): number[] {
  if (indices.length <= 1) return [...indices];
  const cs = indices.map((i) => centroide(poligonos[i]));
  const mx = cs.reduce((s, c) => s + c[0], 0) / cs.length;
  const my = cs.reduce((s, c) => s + c[1], 0) / cs.length;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const c of cs) {
    sxx += (c[0] - mx) ** 2;
    sxy += (c[0] - mx) * (c[1] - my);
    syy += (c[1] - my) ** 2;
  }
  // Eje principal (largo del bloque).
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  let u: Punto = [Math.cos(ang), Math.sin(ang)];
  if (u[1] < 0 || (u[1] === 0 && u[0] < 0)) u = [-u[0], -u[1]]; // apunta hacia abajo
  let v: Punto = [-u[1], u[0]];
  if (v[0] < 0) v = [-v[0], -v[1]]; // apunta hacia la derecha
  const proy = (c: Punto, e: Punto) => (c[0] - mx) * e[0] + (c[1] - my) * e[1];

  // Ancho típico de un lote en la dirección v, para separar columnas.
  const anchos = indices
    .map((i) => {
      const ps = poligonos[i].map((q) => proy(q, v));
      return Math.max(...ps) - Math.min(...ps);
    })
    .sort((a, b) => a - b);
  const ancho = anchos[Math.floor(anchos.length / 2)] || 1;

  const items = indices.map((idx, k) => ({ idx, pu: proy(cs[k], u), pv: proy(cs[k], v) }));
  items.sort((a, b) => a.pv - b.pv);
  const columnas: (typeof items)[] = [[items[0]]];
  for (let k = 1; k < items.length; k++) {
    if (items[k].pv - items[k - 1].pv > ancho * 0.6) columnas.push([items[k]]);
    else columnas[columnas.length - 1].push(items[k]);
  }
  // izquierda = menor pv
  if (opciones.primeraColumna === "derecha") columnas.reverse();
  const haciaAbajo = opciones.inicio === "superior";
  const ordenCol = (col: typeof items, abajo: boolean) =>
    [...col].sort((a, b) => (abajo ? a.pu - b.pu : b.pu - a.pu)).map((e) => e.idx);

  if (columnas.length === 1) return ordenCol(columnas[0], haciaAbajo);

  if (opciones.patron === "alternado" && columnas.length === 2) {
    const a = ordenCol(columnas[0], haciaAbajo);
    const b = ordenCol(columnas[1], haciaAbajo);
    const salida: number[] = [];
    for (let k = 0; k < Math.max(a.length, b.length); k++) {
      if (k < a.length) salida.push(a[k]);
      if (k < b.length) salida.push(b[k]);
    }
    return salida;
  }
  const salida: number[] = [];
  columnas.forEach((col, k) => {
    const abajo = opciones.patron === "u" && k % 2 === 1 ? !haciaAbajo : haciaAbajo;
    salida.push(...ordenCol(col, abajo));
  });
  return salida;
}
