import type { CreateSaleTransaction, CreateSaleCommand, SaleResult } from "../ports/CreateSaleTransaction";

export class CreateVentaUseCase {
  private createSaleTransaction: CreateSaleTransaction;
  constructor(createSaleTransaction: CreateSaleTransaction) {
    this.createSaleTransaction = createSaleTransaction;
  }

  async execute(command: CreateSaleCommand): Promise<SaleResult> {
    return this.createSaleTransaction.execute(command);
  }
}
