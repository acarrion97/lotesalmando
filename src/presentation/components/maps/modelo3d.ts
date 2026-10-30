const EXTENSIONES_MODELO = ["obj", "glb", "gltf", "stl", "fbx", "dae"] as const;

/** Extensión (en minúsculas, sin punto) de una URL, ignorando query y hash. */
export function extensionModelo(url: string): string {
  const limpio = url.split(/[?#]/)[0];
  const punto = limpio.lastIndexOf(".");
  return punto === -1 ? "" : limpio.slice(punto + 1).toLowerCase();
}

/** ¿La URL apunta a un modelo 3D navegable? */
export function esModelo3D(url: string | null | undefined): url is string {
  return !!url && (EXTENSIONES_MODELO as readonly string[]).includes(extensionModelo(url));
}
