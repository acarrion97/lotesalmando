import type {
  DocumentoProspecto,
  DocumentoProspectoTipo,
} from "@/domain/portalProspecto/entities";

interface DocMem {
  estado: "pendiente" | "aprobado" | "rechazado";
  archivo_nombre: string | null;
  nota_revision: string | null;
  creado_en: string;
  revisado_en: string | null;
  id_revisado_por: number | null;
}

interface ProspectoMem {
  id_prospecto: number;
  nombres: string;
  email: string;
  telefono: string;
  estado: string;
  documentos: Map<DocumentoProspectoTipo, DocMem>;
}

/**
 * Memoria del modo demo (`VITE_DATA_PROVIDER=mock`): alta, envío desde
 * el portal y revisión del backoffice comparten el mismo estado en
 * proceso, así que se puede recorrer el flujo completo sin backend.
 * Se pierde al recargar.
 */
const prospectosMem: ProspectoMem[] = [];
let proximoIdProspecto = 1;

export function buscarProspectoPorEmailMock(email: string): ProspectoMem | undefined {
  const limpio = email.trim().toLowerCase();
  return prospectosMem.find((p) => p.email.trim().toLowerCase() === limpio);
}

export function crearProspectoMock(datos: {
  nombres: string;
  email: string;
  telefono: string;
}): ProspectoMem {
  const nuevo: ProspectoMem = {
    id_prospecto: proximoIdProspecto++,
    nombres: datos.nombres,
    email: datos.email,
    telefono: datos.telefono,
    estado: "nuevo",
    documentos: new Map(),
  };
  prospectosMem.push(nuevo);
  return nuevo;
}

export function prospectoPorIdYEmailMock(
  idProspecto: number,
  email: string,
): ProspectoMem | undefined {
  const limpio = email.trim().toLowerCase();
  return prospectosMem.find(
    (p) => p.id_prospecto === idProspecto && p.email.trim().toLowerCase() === limpio,
  );
}

/** Un documento por tipo: el reenvío pisa el anterior (mismo criterio que la RPC). */
export function guardarDocumentoMock(
  prospecto: ProspectoMem,
  tipo: DocumentoProspectoTipo,
  archivoNombre: string | null,
): void {
  const anterior = prospecto.documentos.get(tipo);
  prospecto.documentos.set(tipo, {
    estado: "pendiente",
    archivo_nombre: archivoNombre,
    nota_revision: null,
    creado_en: new Date().toISOString(),
    revisado_en: null,
    id_revisado_por: null,
  });
  // Conserva la fecha del primer envío si ya existía.
  if (anterior) {
    const actual = prospecto.documentos.get(tipo)!;
    actual.creado_en = anterior.creado_en;
  }
}

function aDocumentoProspecto(
  prospecto: ProspectoMem,
  tipo: DocumentoProspectoTipo,
  doc: DocMem,
): DocumentoProspecto {
  return {
    // Id determinista por (prospecto, tipo) para poder revisar en mock.
    id_documento: prospecto.id_prospecto * 100 + DOCUMENTOS_TIPO_ORDEN[tipo],
    id_prospecto: prospecto.id_prospecto,
    id_empresa: 1,
    tipo,
    archivo_path: `prospecto-${prospecto.id_prospecto}/${doc.archivo_nombre ?? tipo}`,
    archivo_nombre: doc.archivo_nombre,
    estado: doc.estado,
    creado_en: doc.creado_en,
    revisado_en: doc.revisado_en,
    id_revisado_por: doc.id_revisado_por,
    nota_revision: doc.nota_revision,
    prospecto: {
      nombres: prospecto.nombres,
      email: prospecto.email,
      telefono: prospecto.telefono,
    },
  };
}

const DOCUMENTOS_TIPO_ORDEN: Record<DocumentoProspectoTipo, number> = {
  cedula: 1,
  comprobante_domicilio: 2,
  constitucion: 3,
  comprobante_ingresos: 4,
};

export function listarDocumentosMock(): DocumentoProspecto[] {
  const lista: DocumentoProspecto[] = [];
  for (const prospecto of prospectosMem) {
    for (const [tipo, doc] of prospecto.documentos.entries()) {
      lista.push(aDocumentoProspecto(prospecto, tipo, doc));
    }
  }
  return lista.sort((a, b) => (b.creado_en ?? "").localeCompare(a.creado_en ?? ""));
}

export function documentoPorIdMock(idDocumento: number): DocumentoProspecto | null {
  return listarDocumentosMock().find((d) => d.id_documento === idDocumento) ?? null;
}

export function revisarDocumentoMock(
  idDocumento: number,
  revision: { estado: "aprobado" | "rechazado"; nota_revision?: string | null },
  idUsuario: number,
): DocumentoProspecto | null {
  for (const prospecto of prospectosMem) {
    for (const [tipo, doc] of prospecto.documentos.entries()) {
      const actual = aDocumentoProspecto(prospecto, tipo, doc);
      if (actual.id_documento === idDocumento) {
        doc.estado = revision.estado;
        doc.nota_revision = revision.estado === "rechazado" ? (revision.nota_revision ?? null) : null;
        doc.revisado_en = new Date().toISOString();
        doc.id_revisado_por = idUsuario;
        return aDocumentoProspecto(prospecto, tipo, doc);
      }
    }
  }
  return null;
}
