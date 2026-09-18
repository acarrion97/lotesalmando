## 1. Domain Layer

- [x] 1.1 Add `getById(id: number): Promise<Inventario | null>` to InventarioRepository interface
- [x] 1.2 Add `update(id: number, data: Partial<Inventario>): Promise<Inventario>` to InventarioRepository interface
- [x] 1.3 Add `delete(id: number): Promise<void>` to InventarioRepository interface

## 2. Infrastructure Layer - Supabase Repository

- [x] 2.1 Implement `getById` method in SupabaseInventarioRepository
- [x] 2.2 Implement `update` method in SupabaseInventarioRepository
- [x] 2.3 Implement `delete` method in SupabaseInventarioRepository

## 3. Infrastructure Layer - Mock Repository

- [x] 3.1 Implement `getById` method in MockInventarioRepository
- [x] 3.2 Implement `update` method in MockInventarioRepository
- [x] 3.3 Implement `delete` method in MockInventarioRepository

## 4. Application Layer - Use Cases

- [x] 4.1 Create `GetInventarioUseCase` with `execute(): Promise<Inventario[]>`
- [x] 4.2 Create `CreateInventarioUseCase` with `execute(data): Promise<Inventario>`
- [x] 4.3 Create `UpdateInventarioUseCase` with `execute(id, data): Promise<Inventario>`
- [x] 4.4 Create `DeleteInventarioUseCase` with `execute(id): Promise<void>`

## 5. Container Registration

- [x] 5.1 Add use cases to `UseCases` interface in create-use-cases.ts
- [x] 5.2 Instantiate use cases in `createUseCases` function

## 6. Presentation Layer - Hook

- [x] 6.1 Create `useInventario` hook with useQuery
- [x] 6.2 Add `inventario` query key to inventoryKeys
- [x] 6.3 Export `useInventario` from hooks index

## 7. Presentation Layer - Page

- [x] 7.1 Replace mockData with useInventario hook
- [x] 7.2 Add modal state management (create, edit, view, delete)
- [x] 7.3 Implement handleCreate function
- [x] 7.4 Implement handleEdit function
- [x] 7.5 Implement handleDelete function
- [x] 7.6 Create modal component with conditional fields
- [x] 7.7 Connect action buttons to modals
- [x] 7.8 Add loading states and error handling
