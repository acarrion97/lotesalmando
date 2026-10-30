import { useEffect, useRef, useState } from "react";
import type { Object3D, Material, Texture } from "three";
import { Button, Result, Spin } from "antd";
import { extensionModelo } from "./modelo3d";

/** Libera texturas sueltas de un material (three no lo hace en `dispose`). */
function liberarMaterial(material: Material) {
  for (const valor of Object.values(material)) {
    if (valor && typeof valor === "object" && "isTexture" in valor) {
      (valor as Texture).dispose();
    }
  }
  material.dispose();
}

/** Libera geometrías, materiales y texturas de un subárbol (evita fugas de GPU). */
function liberarSubarbol(objeto: Object3D) {
  objeto.traverse((nodo) => {
    const malla = nodo as { geometry?: { dispose(): void }; material?: Material | Material[] };
    malla.geometry?.dispose();
    if (Array.isArray(malla.material)) malla.material.forEach(liberarMaterial);
    else if (malla.material) liberarMaterial(malla.material);
  });
}

/** Trae el loader que corresponde a la extensión (import dinámico = chunk aparte). */
async function importarLoader(extension: string) {
  switch (extension) {
    case "glb":
    case "gltf": {
      const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
      return {
        cargar: (url: string, ok: (obj: Object3D) => void, mal: (e: unknown) => void) =>
          new GLTFLoader().load(url, (gltf) => ok(gltf.scene), undefined, mal),
      };
    }
    case "obj": {
      const { OBJLoader } = await import("three/addons/loaders/OBJLoader.js");
      return {
        cargar: (url: string, ok: (obj: Object3D) => void, mal: (e: unknown) => void) =>
          new OBJLoader().load(url, ok, undefined, mal),
      };
    }
    case "stl": {
      const { STLLoader } = await import("three/addons/loaders/STLLoader.js");
      return {
        // STL es solo una malla (sin material): se envuelve en una malla con
        // material por defecto para que el loader devuelva un Object3D igual
        // que los demás y el encuadre sea común.
        cargar: (url: string, ok: (obj: Object3D) => void, mal: (e: unknown) => void) => {
          void (async () => {
            const THREE = await import("three");
            new STLLoader().load(
              url,
              (geometria) => {
                ok(new THREE.Mesh(geometria, new THREE.MeshStandardMaterial()));
              },
              undefined,
              mal,
            );
          })();
        },
      };
    }
    case "fbx": {
      const { FBXLoader } = await import("three/addons/loaders/FBXLoader.js");
      return {
        cargar: (url: string, ok: (obj: Object3D) => void, mal: (e: unknown) => void) =>
          new FBXLoader().load(url, ok, undefined, mal),
      };
    }
    case "dae": {
      const { ColladaLoader } = await import("three/addons/loaders/ColladaLoader.js");
      return {
        cargar: (url: string, ok: (obj: Object3D) => void, mal: (e: unknown) => void) =>
          new ColladaLoader().load(
            url,
            (collada) => {
              if (!collada) {
                mal(new Error("El archivo Collada no contiene una escena"));
                return;
              }
              ok(collada.scene);
            },
            undefined,
            mal,
          ),
      };
    }
    default:
      throw new Error(`Formato de modelo no reconocido: .${extension || "?"}`);
  }
}

/** Carga el modelo con su loader y lo devuelve como promesa. */
async function cargarModelo(url: string): Promise<Object3D> {
  const loader = await importarLoader(extensionModelo(url));
  return new Promise<Object3D>((resolve, reject) => loader.cargar(url, resolve, reject));
}

interface VisorModelo3DProps {
  /** URL pública del modelo 3D (.glb, .obj, .stl, .fbx, .dae, .gltf). */
  modeloUrl: string;
  /** Alto máximo del visor (px). */
  alturaMaxima?: number;
}

/**
 * Visor de modelos 3D navegable (three.js): el visitante gira, acerca y
 * aleja el modelo con el mouse, como un Google Earth en miniatura. Es el
 * destino del campo `mapas.render_3d_url` cuando el archivo subido es un
 * modelo y no una imagen (para imagen se usa Visor3D con la capa Render).
 *
 * three.js es la SEGUNDA excepción a la regla de "sin dependencias nuevas"
 * del subsistema de mapas (la primera fue Cesium): no hay parser de mallas
 * razonable de escribir a mano. El chunk se carga bajo demanda y queda fuera
 * del precache PWA (vite.config.ts, igual que Cesium).
 */
export function VisorModelo3D({ modeloUrl, alturaMaxima }: VisorModelo3DProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  /**
   * Estado del modelo, con su URL para descartar callbacks de cargas viejas
   * cuando cambia el modelo. Arranca `cargando` (el effect no puede hacer
   * `setState` síncrono: regla de react-hooks).
   */
  const [estado, setEstado] = useState<{
    url: string;
    fase: "cargando" | "ok" | "error";
    mensaje?: string;
  }>({ url: modeloUrl, fase: "cargando" });
  /** Reintentos: el botón de error lo incrementa y reinicia el effect. */
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    let vivo = true;
    let limpiar: (() => void) | null = null;

    (async () => {
      try {
        const objeto = await cargarModelo(modeloUrl);
        if (!vivo) {
          liberarSubarbol(objeto);
          return;
        }

        // Los modelos de SketchUp/Revit (.obj, .stl) vienen con Z hacia
        // arriba; three es Y-up. Se rotan para que queden de pie.
        const extension = extensionModelo(modeloUrl);
        if (extension === "obj" || extension === "stl") objeto.rotation.x = -Math.PI / 2;

        // Encuadre: se centra el modelo en el origen y se pone la cámara a
        // la distancia que cabe el volumen completo.
        const THREE = await import("three");
        if (!vivo) {
          liberarSubarbol(objeto);
          return;
        }
        const caja = new THREE.Box3().setFromObject(objeto);
        const centro = caja.getCenter(new THREE.Vector3());
        const tam = caja.getSize(new THREE.Vector3());
        const radio = Math.max(tam.x, tam.y, tam.z) / 2 || 1;
        objeto.position.sub(centro);

        const escena = new THREE.Scene();
        escena.add(objeto);
        // Luz cenital suave + contraluz direccional: suficiente para
        // materiales sin textura (.obj sin .mtl) y para glTF con texturas.
        escena.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.4));
        const sol = new THREE.DirectionalLight(0xffffff, 1.6);
        sol.position.set(radio, radio * 2, radio);
        escena.add(sol);

        const camara = new THREE.PerspectiveCamera(50, 1, radio / 100, radio * 200);
        camara.position.set(radio * 1.6, radio * 1.2, radio * 1.6);
        camara.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.domElement.style.display = "block";
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        nodo.appendChild(renderer.domElement);

        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
        const controles = new OrbitControls(camara, renderer.domElement);
        controles.enableDamping = true;
        controles.target.set(0, 0, 0);
        controles.minDistance = radio / 2;
        controles.maxDistance = radio * 8;

        // El render sigue el tamaño real del contenedor (responsive).
        const medir = () => {
          const { clientWidth: ancho, clientHeight: alto } = nodo;
          if (!ancho || !alto) return;
          camara.aspect = ancho / alto;
          camara.updateProjectionMatrix();
          renderer.setSize(ancho, alto);
        };
        medir();
        const observador = new ResizeObserver(medir);
        observador.observe(nodo);

        let cuadro = 0;
        const pintar = () => {
          cuadro = requestAnimationFrame(pintar);
          controles.update();
          renderer.render(escena, camara);
        };
        pintar();

        limpiar = () => {
          cancelAnimationFrame(cuadro);
          observador.disconnect();
          controles.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          escena.clear();
          liberarSubarbol(objeto);
        };
        setEstado({ url: modeloUrl, fase: "ok" });
      } catch (error) {
        if (!vivo) return;
        setEstado({
          url: modeloUrl,
          fase: "error",
          mensaje: error instanceof Error ? error.message : "No se pudo abrir el modelo.",
        });
      }
    })();

    return () => {
      vivo = false;
      limpiar?.();
    };
  }, [modeloUrl, intento]);

  const alto = alturaMaxima ?? Math.max(360, window.innerHeight - 300);
  /** El estado corresponde al modelo actual (no a una carga vieja). */
  const faseActual = estado.url === modeloUrl ? estado.fase : "cargando";

  return (
    <div style={{ position: "relative", height: alto, background: "#f4f6f8" }}>
      <div ref={contenedor} style={{ position: "absolute", inset: 0 }} />
      {faseActual === "cargando" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin tip="Cargando modelo 3D…" />
        </div>
      )}
      {faseActual === "error" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Result
            status="warning"
            title="No se pudo abrir el modelo 3D"
            subTitle={estado.mensaje}
            extra={
              <Button type="primary" onClick={() => setIntento((n) => n + 1)}>
                Reintentar
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
}
