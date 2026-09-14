import type { Cliente } from "@/domain/cliente/entities";
import type { ClienteRepository } from "@/domain/cliente/repositories";
import { clientes } from "@/mocks/clientes.mock";

export class MockClienteRepository implements ClienteRepository {
  private data: Cliente[] = [...clientes];

  async getAll(): Promise<Cliente[]> {
    return [...this.data];
  }

  async getByEmpresaId(_empresaId: number): Promise<Cliente[]> {
    return [...this.data];
  }

  async getById(id: number): Promise<Cliente | null> {
    return this.data.find((c) => c.id_cliente === id) ?? null;
  }

  async create(data: Omit<Cliente, "id_cliente">): Promise<Cliente> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((c) => c.id_cliente)) + 1 : 1;
    const cliente: Cliente = { ...data, id_cliente: newId };
    this.data.push(cliente);
    return cliente;
  }

  async update(id: number, data: Partial<Cliente>): Promise<Cliente> {
    const index = this.data.findIndex((c) => c.id_cliente === id);
    if (index === -1) throw new Error(`Cliente ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_cliente: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((c) => c.id_cliente !== id);
  }
}
