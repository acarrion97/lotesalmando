import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { Alert, Empty, Modal, Result, Spin, Tabs, Typography } from "antd";
import { CalculatorOutlined, EnvironmentOutlined, PictureOutlined } from "@ant-design/icons";
import { ubicacionDe, type PlanoLote } from "@/domain/mapa/entities";
import { useMapaPublico, useOnlineStatus, useRegistrarInteresPublico } from "@/presentation/hooks";
import { LeyendaPlano, etiquetaLote } from "@/presentation/components/maps/PlanoInteractivo";
import { VisorMapaModos, type ModoMapa } from "@/presentation/components/maps/VisorMapaModos";
import { CarruselMedios } from "@/presentation/components/publicos/CarruselMedios";
import {
  CalculadoraFinanciamiento,
  type RegistroInteresLote,
} from "@/presentation/components/publicos/CalculadoraFinanciamiento";
import { FichaLotePublico } from "@/presentation/components/publicos/FichaLotePublico";

const { Title, Text } = Typography;

const CLAVES_TAB = ["galeria", "mapa", "financiamiento"] as const;
type TabClave = (typeof CLAVES_TAB)[number];

/** Ícono de cada pestaña, en un registro (tarea 6.4) para poder componerlo. */
const MAPA_TAB_ICONS: Record<TabClave, ReactNode> = {
  galeria: <PictureOutlined />,
  mapa: <EnvironmentOutlined />,
  financiamiento: <CalculatorOutlined />,
};

const RESUMEN_ESTADOS = [
  { clave: "total" as const, etiqueta: "Lotes", color: "#1677ff" },
  { clave: "disponibles" as const, etiqueta: "Disponibles", color: "#52c41a" },
  { clave: "reservados" as const, etiqueta: "Reservados", color: "#faad14" },
  { clave: "vendidos" as const, etiqueta: "Vendidos", color: "#8b1a1a" },
];

/**
 * Enlace público `/mapa/:slug` (sin sesión): galería con visor de recursos,
 * plano con ficha de lote y calculadora de financiamiento, en pestañas de la
 * misma URL (`?tab=`). Los tooltips del plano no muestran precio: el precio
 * recién aparece en la ficha del lote y en la calculadora.
 */
export function MapaPublicoPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: mapa, isLoading, isError } = useMapaPublico(slug);
  const enLinea = useOnlineStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const [imagenFallida, setImagenFallida] = useState(false);
  const [loteFicha, setLoteFicha] = useState<PlanoLote | null>(null);
  const [loteCalculadora, setLoteCalculadora] = useState<PlanoLote | null>(null);
  /** Lote del que se muestra el modal de financiamiento (abierto desde la ficha). */
  const [loteSimulador, setLoteSimulador] = useState<PlanoLote | null>(null);
  /** Modo del visor: plano, satélite, vista 3D del plano o Cesium geográfico. */
  const [modoMapa, setModoMapa] = useState<ModoMapa>("plano");
  const registrarInteres = useRegistrarInteresPublico();

  /** Ubicación GPS del plano; `null` si el proyecto todavía no la cargó. */
  const ubicacion = useMemo(() => ubicacionDe(mapa), [mapa]);

  useEffect(() => {
    document.title = mapa ? `${mapa.proyecto} - Mapa de disponibilidad` : "Mapa de disponibilidad";
  }, [mapa]);

  const moneda = mapa?.moneda ?? "USD";
  const medios = mapa?.medios ?? [];

  /** Estadísticas del RPC; si la migración 011 no corre, se calculan en cliente. */
  const estadisticas = mapa?.estadisticas ?? (mapa ? contarEstados(mapa.lotes) : null);

  /** Pestaña activa: `?tab=` si es válida, si no Galería (con medios) o Mapa. */
  const tabParametro = searchParams.get("tab");
  const tabActivo: TabClave =
    mapa && CLAVES_TAB.includes(tabParametro as TabClave)
      ? (tabParametro as TabClave)
      : medios.length > 0
        ? "galeria"
        : "mapa";

  const cambiarTab = (clave: string) => {
    setSearchParams({ tab: clave }, { replace: true });
  };

  /**
   * Cambio de pestaña hecho por el visitante: además de cambiar la URL se
   * pliega la ficha de datos que quede abierta y se vuelve al modo Plano al
   * dejar la pestaña Mapa, de modo que regresar nunca vuelva a montar la
   * escena 3D automáticamente ni dispare peticiones de tiles (spec «El mapa
   * público no inicia la escena 3D automáticamente»; decisión conservadora
   * por la cuota ion del mapa público anónimo).
   *
   * Vive en el handler y no en un `useEffect`: todos los cambios de pestaña
   * pasan por acá (`?tab=` se escribe con `replace: true`, así que no hay
   * ruta por el historial) y `react-hooks` v7 prohíbe `setState` en effects.
   */
  const alCambiarTab = (clave: string) => {
    setLoteFicha(null);
    if (clave !== "mapa") setModoMapa((modo) => (modo === "cesium" ? "plano" : modo));
    cambiarTab(clave);
  };

  /** Lotes con contorno: son los que se dibujan y por los que se navega. */
  const lotesDibujados = (mapa?.lotes ?? []).filter((l) => l.poligono);

  const abrirFicha = (lote: PlanoLote) => {
    setLoteFicha(lote);
    // Abrir la ficha también prellena la calculadora con el precio del lote.
    setLoteCalculadora(lote);
  };

  const navegarFicha = (delta: number) => {
    if (!loteFicha || !lotesDibujados.length) return;
    const i = lotesDibujados.findIndex((l) => l.id_lote === loteFicha.id_lote);
    const base = i === -1 ? 0 : i;
    const total = lotesDibujados.length;
    setLoteFicha(lotesDibujados[(((base + delta) % total) + total) % total]);
  };

  const simularFinanciamiento = (lote: PlanoLote) => {
    // En vez de saltar a la pestaña Financiamiento, se abre un modal que muestra
    // el financiamiento únicamente de ese lote (spec public-map-gallery-financing).
    setLoteFicha(null);
    setLoteSimulador(lote);
  };

  const verEnMapa = (lote: PlanoLote) => {
    setLoteFicha(lote);
    cambiarTab("mapa");
  };

  /**
   * El visitante se registra desde el modal de la calculadora: la RPC crea (o
   * reusa por email) el prospecto y la oportunidad de ese lote, sin sesión.
   */
  const registrarInteresEnLote = async (datos: RegistroInteresLote) => {
    await registrarInteres.mutateAsync({ slug, ...datos });
  };

  let contenido: React.ReactNode;
  if (isLoading) {
    contenido = (
      <div style={{ display: "flex", justifyContent: "center", padding: 120 }}>
        <Spin size="large" />
      </div>
    );
  } else if (isError && !mapa) {
    contenido = (
      <Result
        status="warning"
        title="No se pudo cargar el mapa"
        subTitle="Intente de nuevo en unos minutos."
      />
    );
  } else if (!mapa) {
    contenido = (
      <Result
        status="404"
        title="Mapa no encontrado"
        subTitle="El enlace no existe o ya no está publicado."
      />
    );
  } else {
    contenido = (
      <>
        {!enLinea && (
          <Alert
            type="warning"
            showIcon
            message="Sin conexión: se muestra el último mapa sincronizado."
            style={{ maxWidth: 1248, margin: "16px auto 0" }}
          />
        )}
        {estadisticas && (
          <div
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "14px 16px 0",
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {RESUMEN_ESTADOS.map((d) => (
              <div
                key={d.clave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#fff",
                  border: "1px solid #f0f0f0",
                  borderRadius: 10,
                  padding: "8px 14px",
                }}
              >
                <span
                  style={{ width: 9, height: 9, borderRadius: "50%", background: d.color }}
                  aria-hidden
                />
                <Text style={{ fontSize: 13, color: "#595959" }}>{d.etiqueta}</Text>
                <Text strong style={{ fontSize: 15 }}>
                  {estadisticas[d.clave]}
                </Text>
              </div>
            ))}
          </div>
        )}

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "8px 16px 0", width: "100%" }}>
          <Tabs
            activeKey={tabActivo}
            onChange={alCambiarTab}
            centered
            items={[
              {
                key: "galeria",
                label: "Galería",
                icon: MAPA_TAB_ICONS.galeria,
                destroyOnHidden: true,
                children: (
                  <div style={{ padding: "16px 0" }}>
                    <CarruselMedios medios={medios} alt={`Recurso de ${mapa.proyecto}`} />
                  </div>
                ),
              },
              {
                key: "mapa",
                label: "Mapa",
                icon: MAPA_TAB_ICONS.mapa,
                destroyOnHidden: true,
                children: (
                  <div>
                    {!mapa.url_publica || imagenFallida ? (
                      <Empty
                        style={{ padding: "80px 0" }}
                        description="Este proyecto todavía no tiene plano"
                      />
                    ) : (
                      <>
                        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 16px" }}>
                          <LeyendaPlano lotes={lotesDibujados} />
                        </div>
                        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 20px" }}>
                          <VisorMapaModos
                            imagenUrl={mapa.url_publica}
                            ubicacion={ubicacion}
                            renderUrl={mapa.render_3d_url}
                            lotes={mapa.lotes}
                            onLoteClick={abrirFicha}
                            loteSeleccionadoId={loteFicha?.id_lote}
                            onImagenError={() => setImagenFallida(true)}
                            alturaMaxima={Math.max(360, window.innerHeight - 300)}
                            modo={modoMapa}
                            onModoChange={setModoMapa}
                          />
                        </div>
                        <FichaLotePublico
                          lote={loteFicha}
                          moneda={moneda}
                          onCerrar={() => setLoteFicha(null)}
                          onAnterior={() => navegarFicha(-1)}
                          onSiguiente={() => navegarFicha(1)}
                          onSimular={simularFinanciamiento}
                        />
                      </>
                    )}
                  </div>
                ),
              },
              {
                key: "financiamiento",
                label: "Financiamiento",
                icon: MAPA_TAB_ICONS.financiamiento,
                destroyOnHidden: true,
                children: (
                  <div style={{ padding: "24px 16px 40px" }}>
                    <CalculadoraFinanciamiento
                      lotes={mapa.lotes}
                      moneda={moneda}
                      lote={loteCalculadora}
                      onLoteChange={setLoteCalculadora}
                      onVerEnMapa={verEnMapa}
                    />
                  </div>
                ),
              },
            ]}
          />
        </div>

        <Modal
          open={!!loteSimulador}
          onCancel={() => setLoteSimulador(null)}
          footer={null}
          width={940}
          title={
            loteSimulador
              ? `Financiamiento de ${etiquetaLote(loteSimulador)}`
              : "Financiamiento del lote"
          }
        >
          {loteSimulador && (
            <CalculadoraFinanciamiento
              lotes={mapa.lotes}
              moneda={moneda}
              lote={loteSimulador}
              soloLote
              onRegistrar={registrarInteresEnLote}
              onVerEnMapa={(l) => {
                setLoteSimulador(null);
                verEnMapa(l);
              }}
            />
          )}
        </Modal>
      </>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#fafafa",
      }}
    >
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#e6f4ff",
              color: "#1677ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            <EnvironmentOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <Title level={4} style={{ margin: 0 }} ellipsis>
              {mapa?.proyecto ?? "Mapa de disponibilidad"}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Galería, plano y simulador de financiamiento
            </Text>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>{contenido}</main>

      <footer
        style={{
          borderTop: "1px solid #f0f0f0",
          background: "#fff",
          padding: "10px 16px",
          textAlign: "center",
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          Powered by <strong>Lotes al Mando</strong> · Sistema de gestión de lotes
        </Text>
      </footer>
    </div>
  );
}

/** Conteo por estado en cliente, por si el RPC todavía no trae `estadisticas`. */
function contarEstados(lotes: PlanoLote[]) {
  return {
    total: lotes.length,
    disponibles: lotes.filter((l) => l.estado === "disponible").length,
    reservados: lotes.filter((l) => l.estado === "reservado").length,
    vendidos: lotes.filter((l) => l.estado === "vendido").length,
  };
}
