export interface EntradaReservaDto {
  id_entrada: number;
  id_lote: number;
  id_prospecto: number | null;
  id_empresa: number | null;
  id_usuario: number;
  monto: number;
  fecha_pago: string;
}
