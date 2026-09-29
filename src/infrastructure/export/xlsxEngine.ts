/** Tipos de SheetJS sin traer el módulo al bundle (se importa sólo cuando hace falta). */
export type MotorXlsx = typeof import("@e965/xlsx");

let motor: Promise<MotorXlsx> | null = null;

/** SheetJS pesa ~500 kB: se carga de forma perezosa, al primer uso. */
export function cargarMotor(): Promise<MotorXlsx> {
  motor ??= import("@e965/xlsx");
  return motor;
}
