import type { PortalProspectoDatos } from "@/domain/portalProspecto/entities";
import type {
  IniciarProspectoInput,
  PortalProspectoRepository,
  RegistrarDocumentoInput,
  ResultadoPortal,
} from "@/domain/portalProspecto/repositories";
import {
  buscarProspectoPorEmailMock,
  crearProspectoMock,
  guardarDocumentoMock,
  prospectoPorIdYEmailMock,
} from "@/mocks/prospectoDocumentos.mock";

/** Solo para `VITE_DATA_PROVIDER=mock`: el portal responde con los mocks. */
export class MockPortalProspectoRepository implements PortalProspectoRepository {
  async getByEmail(_slug: string, email: string): Promise<PortalProspectoDatos> {
    const encontrado = buscarProspectoPorEmailMock(email);
    if (!encontrado) return { ok: true, prospecto: null, documentos: [] };

    return {
      ok: true,
      prospecto: {
        id_prospecto: encontrado.id_prospecto,
        nombres: encontrado.nombres,
        email: encontrado.email,
        telefono: encontrado.telefono,
        estado: encontrado.estado,
      },
      documentos: [...encontrado.documentos.entries()]
        .map(([tipo, doc]) => ({
          tipo,
          estado: doc.estado,
          archivo_nombre: doc.archivo_nombre,
          nota_revision: doc.nota_revision,
          creado_en: doc.creado_en,
          revisado_en: doc.revisado_en,
        }))
        .sort((a, b) => a.tipo.localeCompare(b.tipo)),
    };
  }

  async iniciarProspecto(input: IniciarProspectoInput): Promise<ResultadoPortal> {
    const existente = buscarProspectoPorEmailMock(input.email);
    if (existente) return { ok: true, id_prospecto: existente.id_prospecto, existe: true };

    const nuevo = crearProspectoMock({
      nombres: input.nombres.trim(),
      email: input.email.trim(),
      telefono: input.telefono.trim(),
    });
    return { ok: true, id_prospecto: nuevo.id_prospecto, existe: false };
  }

  async registrarDocumento(input: RegistrarDocumentoInput): Promise<ResultadoPortal> {
    const prospecto = prospectoPorIdYEmailMock(input.idProspecto, input.email);
    if (!prospecto) {
      return { ok: false, error: "Ese prospecto no pertenece a tu cuenta" };
    }

    guardarDocumentoMock(prospecto, input.tipo, input.nombre);
    return { ok: true };
  }
}
