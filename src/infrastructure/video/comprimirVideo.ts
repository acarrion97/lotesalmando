import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { FFFSType } from "@ffmpeg/ffmpeg";

/** Núcleo single-thread de ffmpeg.wasm: no exige cabeceras COOP/COEP. */
const CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
const AUDIO_BPS = 96_000;
/** Deja margen bajo el objetivo: el bitrate pedido es una aproximación. */
const MARGEN = 0.9;
const ALTO_MAXIMO = 720;

export interface ComprimirVideoOpciones {
  /** Tamaño máximo del resultado, en bytes. */
  objetivoBytes: number;
  /** `fase` es "cargando" mientras baja el motor y "comprimiendo" con `0..1`. */
  onProgreso?: (fase: "cargando" | "comprimiendo", fraccion: number) => void;
}

let instancia: Promise<FFmpeg> | null = null;

async function cargarMotor(): Promise<FFmpeg> {
  // Import dinámico: el motor (~30 MB) solo se baja cuando hay un video grande.
  const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
    import("@ffmpeg/ffmpeg"),
    import("@ffmpeg/util"),
  ]);
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
  });
  return ffmpeg;
}

function motor(): Promise<FFmpeg> {
  instancia ??= cargarMotor().catch((err) => {
    instancia = null; // permite reintentar si falló la descarga
    throw err;
  });
  return instancia;
}

/** Duración en segundos leyendo solo los metadatos del archivo. */
function duracionDe(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const limpiar = () => URL.revokeObjectURL(url);
    video.onloadedmetadata = () => {
      limpiar();
      if (Number.isFinite(video.duration) && video.duration > 0) resolve(video.duration);
      else reject(new Error("No se pudo leer la duración del video"));
    };
    video.onerror = () => {
      limpiar();
      reject(new Error("El navegador no pudo leer el video"));
    };
    video.src = url;
  });
}

/**
 * Recomprime el video en el navegador (H.264 + AAC, hasta 720p) apuntando a un
 * peso menor que `objetivoBytes`. Lanza error si no lo logra.
 */
export async function comprimirVideo(
  file: File,
  { objetivoBytes, onProgreso }: ComprimirVideoOpciones,
): Promise<File> {
  const duracion = await duracionDe(file);
  const bpsTotal = (objetivoBytes * MARGEN * 8) / duracion;
  const bpsVideo = Math.floor(bpsTotal - AUDIO_BPS);
  if (bpsVideo < 100_000) {
    throw new Error(
      "El video es demasiado largo para dejarlo bajo el límite con calidad aceptable",
    );
  }

  onProgreso?.("cargando", 0);
  const ffmpeg = await motor();

  const alProgreso = ({ progress }: { progress: number }) =>
    onProgreso?.("comprimiendo", Math.min(Math.max(progress, 0), 1));
  ffmpeg.on("progress", alProgreso);

  const entrada = "/entrada";
  const salida = "salida.mp4";
  try {
    // WORKERFS lee el archivo por tramos, sin copiarlo entero a la memoria de wasm.
    await ffmpeg.createDir(entrada).catch(() => undefined); // ya existe si es la 2ª vez
    await ffmpeg.mount(FFFSType.WORKERFS, { files: [file] }, entrada);
    onProgreso?.("comprimiendo", 0);

    const codigo = await ffmpeg.exec([
      "-i",
      `${entrada}/${file.name}`,
      "-vf",
      `scale=-2:'min(${ALTO_MAXIMO},ih)'`,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-b:v",
      String(bpsVideo),
      "-maxrate",
      String(Math.floor(bpsVideo * 1.3)),
      "-bufsize",
      String(bpsVideo * 2),
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      String(AUDIO_BPS),
      "-movflags",
      "+faststart",
      salida,
    ]);
    if (codigo !== 0) throw new Error("No se pudo comprimir el video");

    const datos = await ffmpeg.readFile(salida);
    if (typeof datos === "string") throw new Error("No se pudo comprimir el video");
    const resultado = new File(
      [new Uint8Array(datos)],
      file.name.replace(/\.[^.]+$/, "") + "-720p.mp4",
      { type: "video/mp4" },
    );
    if (resultado.size > objetivoBytes) {
      throw new Error("Aun comprimido, el video sigue superando el límite. Probá recortarlo.");
    }
    return resultado;
  } finally {
    ffmpeg.off("progress", alProgreso);
    await ffmpeg.deleteFile(salida).catch(() => undefined);
    await ffmpeg.unmount(entrada).catch(() => undefined);
  }
}
