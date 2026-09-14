export interface CreateSaleCommand {
  id_cliente: number;
  id_lote: number;
  id_cotizacion: number;
  precio_ofertado: number;
  id_usuario: number;
}

export interface SaleResult {
  id_venta: number;
  id_contrato: number;
  cuotas_generadas: number;
}

export interface CreateSaleTransaction {
  execute(command: CreateSaleCommand): Promise<SaleResult>;
}
