import type { Contrato } from "../entities";

export interface ContractRepository {
  getAll(): Promise<Contrato[]>;
  getByEmpresaId(empresaId: number): Promise<Contrato[]>;
  getById(id: number): Promise<Contrato | null>;
  getByVentaId(ventaId: number): Promise<Contrato | null>;
  /** Contratos de un conjunto de ventas (consulta única, al eliminar un cliente). */
  getByVentaIds(ventaIds: number[]): Promise<Contrato[]>;
  create(data: Omit<Contrato, "id_contrato">): Promise<Contrato>;
  /** Guarda (o borra, con `null`) el documento del contrato. */
  setDocumento(
    contratoId: number,
    documento: {
      url: string | null;
      tipo: "docx" | "pdf" | null;
      nombre: string | null;
      origen: "subido" | "generado" | null;
    },
  ): Promise<Contrato>;
  /** Borra el contrato. Debe hacerse sin cuotas: `cobranzas` es CASCADE. */
  delete(id: number): Promise<void>;
}
