import type {
  PlanImagenStorage,
  SubirImagenPlanInput,
  SubirImagenPlanResult,
} from "@/application/plan/ports/PlanImagenStorage";

/** Modo mock: no hay storage real; se devuelve una URL ficticia. */
export class MockPlanImagenStorage implements PlanImagenStorage {
  async upload(_input: SubirImagenPlanInput): Promise<SubirImagenPlanResult> {
    return { url: `https://mock.local/planes/${Date.now()}.png` };
  }

  async removeByUrl(_url: string): Promise<void> {
    // no-op
  }
}
