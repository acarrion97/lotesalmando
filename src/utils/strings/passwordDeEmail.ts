/**
 * Contrasena temporal por defecto al crear un usuario desde el panel:
 * el usuario del correo (parte antes de la @) + "*" al final.
 * Ej.: juan.perez@empresa.com -> "juan.perez*"
 */
export function passwordDeEmail(email: string): string {
  const usuario = email.split("@")[0]?.trim() ?? "";
  return `${usuario}*`;
}
