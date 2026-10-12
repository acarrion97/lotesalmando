# Modelos Matemáticos para Proyección de Ventas y Flujo de Caja — Lotes

> Documento técnico para estructurar la proyección de absorción, el valor
> contratado y el flujo de caja de un proyecto de lotificación.
> Rama: `docs/modelos-financieros-lotes`.

---

## 0. Datos reales de referencia (proyecto "Ciudadela San Lucas")

Todo lo que sigue está calibrado con datos leídos de producción (Supabase):

| Parámetro | Valor real | Origen |
|---|---|---|
| Lotes totales (etapa) | 227 | `lotes` filtrado por etapa |
| Precio promedio | $13.407 | media de `precio_lista` (rango $10.800–$22.660) |
| Vendidos / Reservados / Disponibles | 98 / 91 / 38 | `lotes.estado` |
| Enganche (cuota 1) | mediana ~10% | `cobranzas` cuota #1 / `contratos.monto_total` |
| Nº de cuotas financiadas | 47 | mediana de `cobranzas` por contrato |
| Interés | 0% | suma de cuotas = `monto_total` exacto |
| Recaudación actual | ~$5.000–$8.000/mes | `pagos.monto_pagado` por mes |

> El esquema real es: **enganche variable (~10%) + N cuotas sin interés**, con
> planes **escalonados** (cuotas crecientes) en la mayoría de contratos.

---

## 1. Variables del modelo

| Símbolo | Significado |
|---|---|
| `K` | Lotes totales de la etapa (capacidad/porter) |
| `R` | Lotes por absorber en el horizonte (`K − ya vendidos`) |
| `T` | Horizonte de ventas (meses) |
| `t` | Mes (1..T) |
| `P` | Precio promedio por lote |
| `e` | % de enganche (cuota inicial) |
| `n` | Nº de cuotas del financiamiento |
| `r` | Interés anual (0 si la constructora financia sin interés) |
| `i = r/12` | Interés mensual |

---

## 2. Modelos de absorción (ventas mensuales)

Todos devuelven el **acumulado** `Q(t)` y la venta del mes es la diferencia
`v(t) = Q(t) − Q(t−1)`. Las curvas se **normalizan** para que `Q(T) = R`
(cierren exacto el inventario) y `Q(0) = 0`, evitando que el remanente se
concentre en el último mes.

### 2.1 Logística de Pearl-Reed (base recomendada)

Curva "S" simétrica: arranque lento (preventa), pico a mitad de proyecto
(avance de obra), cierre lento (últimos lotes difíciles).

```
Q(t) = R · [ S(t) − S(0) ] / [ S(T) − S(0) ]
S(t) = 1 / (1 + e^(−a(t − t0)))
```

- `a = 6/T` → pendiente estándar (cubre ~99% del rango en T).
- `t0 = T/2` → el pico de ventas cae en la mitad del horizonte.

**Cuándo usarlo:** el caso por defecto. No requiere datos históricos previos.

### 2.2 Modelo de Bass (difusión)

Mejor cuando hay **efecto de referidos / boca a boca**, típico en lotes.

```
Q(t) = R · [ (1 − e^(−(p+q)t)) / (1 + (q/p)·e^(−(p+q)t)) ]
```

- `p` = coeficiente de innovación (publicidad, leads fríos) — sugerido `0.03`.
- `q` = coeficiente de imitación (referidos, recomendación) — sugerido `0.38`.

**Cuándo usarlo:** cuando el canal de referidos es fuerte y quieres capturar la
aceleración temprana por recomendación. Requiere calibrar `p` y `q` con datos.

### 2.3 Gompertz (asimétrica)

Pico **antes** de la mitad y desaceleración final más pronunciada que la
arrancada. Modela la realidad de que "los últimos lotes son los más difíciles".

```
Q(t) = R · exp( −exp( −a(t − t0) ) )
```

- `a = 6/T`, `t0 = 0.45·T` (pico levemente adelantado).

**Cuándo usarlo:** cuando hay prisa por vender rápido (preventa agresiva) y se
espera un cuello de botella final.

### 2.4 Comparación (misma entrada, 12 meses, R = 129)

| Modelo | Carácter | Pico (mes) | Ventas pico |
|---|---|---|---|
| Logística | Simétrico, equilibrado | 7 | 18 |
| Bass | Arranque más fuerte, cola larga | 7 | 16 |
| Gompertz | Pico temprano, cierre duro | 6 | 25 |

---

## 3. Valor contratado

```
Valor del mes t      = v(t) · P
Valor acumulado (t)  = Σ_{k≤t} v(k) · P
```

Es lo que se firma en contratos (no lo que entra a caja).

---

## 4. Flujo de caja real (lo que entra a la caja)

Separado en dos fuentes:

```
Enganches(t)       = v(t) · P · e
Mensualidades(t)   = c · A(t)
Ingreso total (t)  = Enganches(t) + Mensualidades(t)
```

- `c` = cuota mensual por lote.
- `A(t)` = lotes activos financiados en el mes `t` (los vendidos en meses
  `m < t`, contando solo los que aún tienen cuotas por correr: `t − m ≤ n`).

### 4.1 Cuota mensual `c`

**Sin interés (0%)** — el esquema real actual:
```
c = P·(1 − e) / n
```

**Con interés (French / amortización real):**
```
c = F · [ i(1+i)^n ] / [ (1+i)^n − 1 ]      con F = P·(1 − e)
```

### 4.2 Nota importante: escenario vs realidad

El modelo anterior asume cuotas **uniformes**. En los datos reales la mayoría de
contratos usan planes **escalonados** (cuotas crecientes: ej. $500, $500, $700,
$1000…). Para replicar eso hay que sustituir `c` por un vector de cuotas por
contrato en lugar de un escalar. El script admite `--cuotas` y `--tasa` para
ambos escenarios.

---

## 5. Flujo neto (ingresos − costos)

```
Costo(t)   = Urbanización/T  +  Ingreso(t)·%costo_var
Neto(t)    = Ingreso(t) − Costo(t)
```

Costos típicos de lotificación a considerar (no están en la base de datos, se
parametrizan):

| Concepto | Naturaleza |
|---|---|
| Urbanización (vialidades, servicios) | Fijo, se prorratea o va por avance de obra |
| Impuestos y tasas municipales | Variable (% ingreso) |
| Comisiones de venta | Variable (% ingreso, 2–6%) |
| Marketing / publicidad | Mixto |
| Gastos administrativos | Fijo mensual |

### 5.1 Métricas financieras

- **Payback:** primer mes donde el acumulado neto ≥ 0.
- **TIR mensual:** `r*` tal que `Σ Neto(t)/(1+r*)^t = 0`; se anualiza como
  `(1+r*)^12 − 1`.
- **VPN:** `Σ Neto(t)/(1+k)^t − Inversión`, con `k` = costo de capital.

---

## 6. Uso del script

```bash
SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=sb_pub_xxx \
  node scripts/proyeccion-financiera.mjs \
  --etapa=3 --meses=12 --modelo=logistic \
  --enganche=10 --cuotas=47 --tasa=0 \
  --costo_urb=0 --costo_var=0
```

| Argumento | Defecto | Significado |
|---|---|---|
| `--etapa` | la de más lotes | Etapa a proyectar |
| `--meses` | 12 | Horizonte |
| `--modelo` | `logistic` | `logistic` \| `bass` \| `gompertz` |
| `--enganche` | mediana real | % cuota inicial |
| `--cuotas` | mediana real | Nº de cuotas |
| `--tasa` | 0 | Interés anual (0 = sin interés) |
| `--costo_urb` | 0 | Urbanización total a prorratear |
| `--costo_var` | 0 | % costo variable sobre ingreso |

El script imprime las **4 tablas**: absorción, valor contratado, flujo de caja
(ingresos) y flujo neto (si hay costos), más las métricas.

---

## 7. Supuestos de velocidad de venta

- **Arranque moderado** (preventa, marca aún en construcción).
- **Aceleración a mitad** por avance de obra y visibilidad del proyecto.
- **Desaceleración final** por escasez de lotes buenos y menor urgencia.
- La normalización garantiza que el horizonte cierre exacto el inventario, sin
  picos artificiales en el último mes.

---

## 8. Recomendación

1. **Modelo base:** logística (no requiere calibración previa, es el más
   robusto para planear caja).
2. **Cuando tengas histórico de referidos:** calibrar Bass con `p`/`q` reales.
3. **Para el cuello de botella final:** usar Gompertz como escenario pesimista.
4. **Escenarios:** correr los tres y presentar rango (pesimista / base /
   optimista) en vez de un número único.
5. **Sensibilidad:** variar `e`, `n`, `P` y velocidad para dimensionar el
   impacto en caja antes de comprometer el plan.
