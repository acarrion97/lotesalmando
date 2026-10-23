import type { DocumentoProspecto } from "@/domain/portalProspecto/entities";
import type {
  DocumentoProspectoRepository,
  RevisionDocumentoProspecto,
} from "@/domain/portalProspecto/repositories";
import {
  documentoPorIdMock,
  listarDocumentosMock,
  revisarDocumentoMock,
} from "@/mocks/prospectoDocumentos.mock";

/** Solo para `VITE_DATA_PROVIDER=mock`: revisa sobre el mismo estado en memoria que el portal. */
export class MockDocumentoProspectoRepository implements DocumentoProspectoRepository {
  async getByEmpresaId(_empresaId: number): Promise<DocumentoProspecto[]> {
    return listarDocumentosMock();
  }

  async getById(id: number): Promise<DocumentoProspecto | null> {
    return documentoPorIdMock(id);
  }

  async revisar(
    id: number,
    revision: RevisionDocumentoProspecto,
    idUsuario: number,
  ): Promise<DocumentoProspecto> {
    const revisado = revisarDocumentoMock(id, revision, idUsuario);
    if (!revisado) throw new Error("No existe ese documento");
    return revisado;
  }
}
