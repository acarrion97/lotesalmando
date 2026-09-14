import type { UseCases } from "./create-use-cases";
import { createRepositories } from "./create-repositories";
import { createUseCases } from "./create-use-cases";

let container: UseCases | null = null;

export function getContainer(): UseCases {
  if (!container) {
    const repos = createRepositories();
    container = createUseCases(repos);
  }
  return container;
}
