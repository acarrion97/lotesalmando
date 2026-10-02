"""Extrae superficie, código catastral y medidas de cada lote desde el PDF del plano.

Uso:
    python scripts/extraer_catastro_plano.py <plano.pdf> [carpeta_salida]

Requiere PyMuPDF (`pip install pymupdf`). Genera en la carpeta de salida
(por defecto `datos/`):
  - lotes_catastro.csv           para revisar a mano (columna `revisar` = dudas)
  - lotes_catastro_update.sql    UPDATE sobre `lotes` (ejecutar tras la migración 014)

No toca la base de datos: el SQL se revisa y se ejecuta a mano.
Los lotes que el plano no rotula con área/catastro (p. ej. bloques sin
catastrar) no aparecen: no hay dato que extraer.
"""

import csv
import math
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

import pymupdf

RE_AREA = re.compile(r"rea:\s*([\d.]+),(\d+)\s*m")
RE_CATASTRAL = re.compile(r"Catastral\.?\s*(\d{4,6})")
RE_ENTERO = re.compile(r"^\d{1,3}$")
RE_MEDIDA = re.compile(r"^\d+,\d{2}$")
# Distancia (pt del PDF) entre códigos consecutivos a partir de la cual cambia el bloque.
SALTO_ENTRE_BLOQUES = 40
RE_MANZANA = re.compile(r"^[A-ZÁÉÍÓÚÑ]+-[A-Z0-9]+$")


def leer_spans(pagina):
    spans = []
    for bloque in pagina.get_text("dict")["blocks"]:
        for linea in bloque.get("lines", []):
            for s in linea["spans"]:
                texto = s["text"].strip()
                if not texto:
                    continue
                x0, y0, x1, y1 = s["bbox"]
                dx, dy = linea["dir"]
                spans.append(
                    {
                        "t": texto,
                        "x": (x0 + x1) / 2,
                        "y": (y0 + y1) / 2,
                        # ángulo del texto módulo 180°, redondeado a 5°: agrupa las
                        # dos orientaciones de cotas (paralelas a cada eje del bloque)
                        "ang": round((math.degrees(math.atan2(dy, dx)) % 180) / 5) * 5 % 180,
                    }
                )
    return spans


def dist(a, b):
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"])


def emparejar_lotes(spans):
    """Une cada 'Cód. Catastral' con su 'Área' y su número de lote (el círculo)."""
    catastrales = [s for s in spans if RE_CATASTRAL.search(s["t"])]
    areas = [s for s in spans if RE_AREA.search(s["t"])]
    numeros = [s for s in spans if RE_ENTERO.match(s["t"])]

    lotes = []
    for cat in catastrales:
        area = min(areas, key=lambda a: dist(a, cat))
        m = RE_AREA.search(area["t"])
        superficie = float(m.group(1).replace(".", "") + "." + m.group(2))
        lotes.append(
            {
                "codigo": RE_CATASTRAL.search(cat["t"]).group(1),
                "superficie": superficie,
                "x": (cat["x"] + area["x"]) / 2,
                "y": (cat["y"] + area["y"]) / 2,
                "numero": None,
            }
        )

    # Número de lote: asignación uno a uno, de menor a mayor distancia.
    pares = sorted(
        ((dist(n, l), i, j) for i, l in enumerate(lotes) for j, n in enumerate(numeros)),
        key=lambda p: p[0],
    )
    lotes_usados, numeros_usados = set(), set()
    for d, i, j in pares:
        if d > 14:  # más lejos que eso ya es de otro lote
            break
        if i in lotes_usados or j in numeros_usados:
            continue
        lotes[i]["numero"] = numeros[j]["t"]
        lotes_usados.add(i)
        numeros_usados.add(j)
    return lotes


def agrupar_en_manzanas(lotes, etiquetas):
    """Los códigos catastrales son correlativos dentro de una manzana, y entre
    manzanas hay una calle: se corta cuando dos códigos consecutivos quedan lejos
    (en el plano, dentro de un bloque ≤ ~33 pt y entre bloques ≥ ~50 pt).
    El número de lote es el orden dentro del bloque: el círculo del plano se
    empareja por cercanía y se confunde en las esquinas, así que solo se usa
    para avisar si no coincide."""
    ordenados = sorted(lotes, key=lambda l: int(l["codigo"]))
    grupos, actual = [], []
    for lote in ordenados:
        if actual and dist(actual[-1], lote) > SALTO_ENTRE_BLOQUES:
            grupos.append(actual)
            actual = []
        actual.append(lote)
    if actual:
        grupos.append(actual)

    for grupo in grupos:
        for i, lote in enumerate(grupo, start=1):
            lote["numero_plano"] = lote["numero"]
            if len(grupo) > 1:
                lote["numero"] = str(i)
    for grupo in grupos:
        cx = statistics.mean(l["x"] for l in grupo)
        cy = statistics.mean(l["y"] for l in grupo)
        etiqueta = min(etiquetas, key=lambda e: math.hypot(e["x"] - cx, e["y"] - cy))
        for lote in grupo:
            lote["manzana"] = etiqueta["t"]
    return grupos


def inferir_medidas(lotes, cotas):
    """Frente x fondo de los lotes rectangulares: se aceptan solo si el producto de
    las dos cotas más cercanas coincide con la superficie (±0,15 %)."""
    regulares = [l for l in lotes if abs(l["superficie"] - 144.0) < 0.01]
    if len(regulares) < 5:
        return
    vecino = [
        min(math.hypot(a["x"] - b["x"], a["y"] - b["y"]) for b in regulares if b is not a)
        for a in regulares
    ]
    escala = statistics.median(vecino) / 8.0  # un lote de 144 m² mide 8 m de frente
    radio = 14 * escala

    for lote in lotes:
        cercanas = sorted(
            (c for c in cotas if math.hypot(c["x"] - lote["x"], c["y"] - lote["y"]) <= radio),
            key=lambda c: math.hypot(c["x"] - lote["x"], c["y"] - lote["y"]),
        )
        por_angulo = {}
        for c in cercanas:
            por_angulo.setdefault(c["ang"], []).append(c)
        angulos = [a for a, v in por_angulo.items() if len(v) >= 1]
        mejor = None
        for i, a1 in enumerate(angulos):
            for a2 in angulos[i + 1 :]:
                for c1 in por_angulo[a1][:4]:
                    for c2 in por_angulo[a2][:4]:
                        v1 = float(c1["t"].replace(",", "."))
                        v2 = float(c2["t"].replace(",", "."))
                        if abs(v1 * v2 - lote["superficie"]) / lote["superficie"] <= 0.0015:
                            d = dist(c1, lote) + dist(c2, lote)
                            if mejor is None or d < mejor[0]:
                                mejor = (d, v1, v2)
        if mejor:
            chico, grande = sorted(mejor[1:])
            lote["medidas"] = f"{chico:.2f} x {grande:.2f}".replace(".", ",")


def comillas(texto):
    return "'" + texto.replace("'", "''") + "'"


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    origen = Path(sys.argv[1])
    salida = Path(sys.argv[2] if len(sys.argv) > 2 else "datos")
    salida.mkdir(parents=True, exist_ok=True)

    pagina = pymupdf.open(origen)[0]
    spans = leer_spans(pagina)
    etiquetas = [s for s in spans if RE_MANZANA.match(s["t"]) and s["t"].upper() == s["t"]]
    cotas = [s for s in spans if RE_MEDIDA.match(s["t"])]

    lotes = emparejar_lotes(spans)
    grupos = agrupar_en_manzanas(lotes, etiquetas)
    inferir_medidas(lotes, cotas)

    # Dudas a revisar a mano
    por_manzana = Counter(g[0]["manzana"] for g in grupos)
    tamano_bloque = {l["codigo"]: len(g) for g in grupos for l in g}
    for lote in lotes:
        dudas = []
        if lote["numero"] is None:
            dudas.append("sin número de lote en el plano")
        if por_manzana[lote["manzana"]] > 1:
            dudas.append("manzana asignada a más de un bloque")
        if tamano_bloque[lote["codigo"]] == 1:
            dudas.append("lote suelto: manzana asignada por cercanía, confirmar")
        if not lote.get("medidas"):
            dudas.append("medidas no rectangulares o no detectadas")
        lote["revisar"] = "; ".join(dudas)

    lotes.sort(key=lambda l: int(l["codigo"]))
    with open(salida / "lotes_catastro.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["manzana", "numero_lote", "superficie_m2", "codigo_catastral", "medidas", "revisar"])
        for l in lotes:
            w.writerow(
                [
                    l["manzana"],
                    l["numero"] or "",
                    f"{l['superficie']:.2f}".replace(".", ","),
                    l["codigo"],
                    l.get("medidas", ""),
                    l["revisar"],
                ]
            )

    # El SQL solo incluye lotes con número: sin él no hay a qué fila del sistema unirlos.
    filas = [
        f"  ({comillas(l['manzana'])}, {comillas(l['numero'])}, {l['superficie']:.2f}, "
        f"{comillas(l['codigo'])}, {comillas(l['medidas']) if l.get('medidas') else 'NULL'})"
        for l in lotes
        if l["numero"]
    ]
    valores = ",\n".join(filas)
    sql = f"""-- Datos catastrales extraídos de {origen.name} ({len(filas)} lotes).
-- Requiere la migración 014. Actualiza los lotes YA cargados, uniéndolos por
-- nombre de manzana + número de lote; no inserta lotes nuevos.
-- Si el mismo nombre de manzana existe en varios proyectos, agregá el filtro
-- de proyecto/etapa en el UPDATE antes de ejecutar.
--
-- Ejecutá TODO junto en el SQL Editor (la tabla temporal vive solo en esa
-- sesión). Primero mirá el resultado del SELECT; si "coinciden" es menor a
-- "total", faltan lotes o los nombres de manzana difieren: no sigas a ciegas.

CREATE TEMP TABLE tmp_catastro (manzana, numero_lote, superficie_m2, codigo_catastral, medidas) AS
VALUES
{valores};

SELECT count(*) AS total,
       count(l.id_lote) AS coinciden
FROM tmp_catastro d
LEFT JOIN manzana_bloque mb ON upper(mb.nombre_codigo) = upper(d.manzana)
LEFT JOIN lotes l ON l.id_manzana = mb.id_manzana AND l.numero_lote = d.numero_lote;

UPDATE lotes l
SET superficie_m2 = d.superficie_m2,
    codigo_catastral = d.codigo_catastral,
    medidas = d.medidas
FROM tmp_catastro d, manzana_bloque mb
WHERE mb.id_manzana = l.id_manzana
  AND upper(mb.nombre_codigo) = upper(d.manzana)
  AND l.numero_lote = d.numero_lote;
"""
    (salida / "lotes_catastro_update.sql").write_text(sql, encoding="utf-8")

    con_medidas = sum(1 for l in lotes if l.get("medidas"))
    print(f"Lotes con catastro: {len(lotes)} | con medidas: {con_medidas} | para revisar: "
          f"{sum(1 for l in lotes if l['revisar'])}")
    print("Bloques:", [(g[0]["manzana"], len(g), g[0]["codigo"], g[-1]["codigo"]) for g in grupos])


if __name__ == "__main__":
    main()
