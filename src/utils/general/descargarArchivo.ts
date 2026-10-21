/**
 * Baja un archivo desde una URL con el nombre indicado. El atributo
 * `download` no aplica entre orígenes, pero las URLs firmadas de Supabase
 * responden con `Content-Disposition: attachment`, que es lo que hace que el
 * navegador guarde el archivo en vez de abrirlo.
 */
export function descargarArchivo(url: string, nombre: string): void {
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.rel = "noopener";
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
}
