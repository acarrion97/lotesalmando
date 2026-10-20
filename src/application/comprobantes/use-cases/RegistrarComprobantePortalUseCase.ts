import type { PortalClienteRepository } from "@/domain/portal/repositories";
import {
  tipoDeArchivoComprobante,
  validarArchivoComprobante,
  type ComprobanteStorage,
} from "../ports/ComprobanteStorage";

export interface ResultadoEnvioComprobante {
  ok: boolean;
  /** Mensaje listo para mostrar al visitante. */
  mensaje: string;
}

/**
 * Flujo del portal público: el visitante identifica su cuota con la
 * cédula, sube la imagen o el PDF y declara cuánto pagó. El comprobante
 * queda `pendiente` para que el asesor lo revise; la cuota NO cambia de
 * estado sola.
 *
 * Si algo falla después de subir el archivo (la RPC rechaza la cuota,
 * por ejemplo), se borra el objeto recién subido para no dejar huérfanos
 * en el bucket.
 */
export class RegistrarComprobantePortalUseCase {
  private storage: ComprobanteStorage;
  private portal: PortalClienteRepository;

  constructor(storage: ComprobanteStorage, portal: PortalClienteRepository) {
    this.storage = storage;
    this.portal = portal;
  }

  async execute(input: {
    cedula: string;
    idCobranza: number;
    montoPagado: number;
    file: File;
  }): Promise<ResultadoEnvioComprobante> {
    const cedula = input.cedula.trim();
    if (!cedula) return { ok: false, mensaje: "Escribí tu número de cédula" };
    if (!input.idCobranza) return { ok: false, mensaje: "Elegí la cuota que estás pagando" };
    if (!(input.montoPagado > 0)) return { ok: false, mensaje: "Decinos cuánto pagaste" };

    const error = validarArchivoComprobante(input.file);
    if (error) return { ok: false, mensaje: error };

    const { path } = await this.storage.upload({
      carpeta: `cobranza-${input.idCobranza}`,
      file: input.file,
    });

    const resultado = await this.portal.registrarComprobante({
      cedula,
      idCobranza: input.idCobranza,
      montoPagado: input.montoPagado,
      archivoUrl: path,
      archivoTipo: tipoDeArchivoComprobante(input.file),
      archivoNombre: input.file.name || null,
    });

    if (!resultado.ok) {
      await this.storage.removeByPath(path).catch(() => undefined);
      return { ok: false, mensaje: resultado.error ?? "No se pudo enviar el comprobante" };
    }

    return {
      ok: true,
      mensaje: "Comprobante enviado. Lo revisamos y te confirmamos el pago.",
    };
  }
}
