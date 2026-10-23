import type { DocumentoProspectoTipo } from "@/domain/portalProspecto/entities";
import type { PortalProspectoRepository } from "@/domain/portalProspecto/repositories";
import {
  validarArchivoDocumento,
  type PortalProspectoStorage,
} from "../ports/PortalProspectoStorage";

export interface ResultadoEnvioDocumento {
  ok: boolean;
  /** Mensaje listo para mostrar al visitante. */
  mensaje: string;
}

/**
 * Flujo del portal público: el prospecto elige un tipo de la checklist,
 * sube la imagen o el PDF y el documento queda `pendiente` para que el
 * asesor lo revise. Un reenvío del mismo tipo sobrescribe el anterior
 * (la RPC hace upsert).
 *
 * Si algo falla después de subir el archivo (la RPC rechaza la
 * pertenencia, por ejemplo), se borra el objeto recién subido para no
 * dejar huérfanos en el bucket.
 */
export class RegistrarDocumentoPortalUseCase {
  private storage: PortalProspectoStorage;
  private portal: PortalProspectoRepository;

  constructor(storage: PortalProspectoStorage, portal: PortalProspectoRepository) {
    this.storage = storage;
    this.portal = portal;
  }

  async execute(input: {
    email: string;
    idProspecto: number;
    tipo: DocumentoProspectoTipo;
    file: File;
  }): Promise<ResultadoEnvioDocumento> {
    const email = input.email.trim();
    if (!email) return { ok: false, mensaje: "Escribí tu email" };
    if (!input.idProspecto) {
      return { ok: false, mensaje: "Primero completá tus datos de contacto" };
    }

    const error = validarArchivoDocumento(input.file);
    if (error) return { ok: false, mensaje: error };

    const { path } = await this.storage.upload({
      carpeta: `prospecto-${input.idProspecto}`,
      file: input.file,
    });

    const resultado = await this.portal.registrarDocumento({
      email,
      idProspecto: input.idProspecto,
      tipo: input.tipo,
      path,
      nombre: input.file.name || null,
    });

    if (!resultado.ok) {
      await this.storage.removeByPath(path).catch(() => undefined);
      return { ok: false, mensaje: resultado.error ?? "No se pudo enviar el documento" };
    }

    return {
      ok: true,
      mensaje: "Documento enviado. Lo revisamos y te avisamos.",
    };
  }
}
