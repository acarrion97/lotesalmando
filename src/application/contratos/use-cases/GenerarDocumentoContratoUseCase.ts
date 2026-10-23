import type { ClienteRepository } from "@/domain/cliente/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { ConfiguracionRepository, ConfiguracionContratoRepository } from "@/domain/configuracion/repositories";
import type { Contrato } from "@/domain/contrato/entities";
import type { ContractRepository } from "@/domain/contrato/repositories";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";
import type { EmpresaRepository } from "@/domain/empresa/repositories";
import type { EtapaRepository } from "@/domain/etapa/repositories";
import type { LotRepository } from "@/domain/lote/repositories";
import type { ManzanaRepository } from "@/domain/manzana/repositories";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";
import type { SaleRepository } from "@/domain/venta/repositories";
import type { DocumentoContratoStorage } from "../ports/DocumentoContratoStorage";
import {
  nombreArchivoContrato,
  type ContenidoContrato,
  type FormatoDocumentoContrato,
  type GeneradorDocumentoContrato,
} from "../ports/GeneradorDocumentoContrato";

/** Todo lo que se necesita para armar el documento; se pasa de una sola vez. */
export interface DepsContrato {
  contratos: ContractRepository;
  ventas: SaleRepository;
  cotizaciones: CotizacionRepository;
  clientes: ClienteRepository;
  lotes: LotRepository;
  manzanas: ManzanaRepository;
  etapas: EtapaRepository;
  proyectos: ProyectoRepository;
  empresas: EmpresaRepository;
  configuraciones: ConfiguracionRepository;
  /** Datos legales del contrato del proyecto de la venta (moneda de `configuraciones`). */
  configuracionContrato: ConfiguracionContratoRepository;
  cobranzas: CobranzaRepository;
  storage: DocumentoContratoStorage;
  generador: GeneradorDocumentoContrato;
}

const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * Genera el documento del contrato (Word o PDF) con los datos que ya
 * existen en la base y lo anexa al contrato. Es lo que se ofrece cuando
 * un contrato "no tiene documento todavía".
 *
 * Cadena de datos: contrato → venta → cotización (entrada/cuotas),
 * cliente → empresa (moneda), lote → manzana → etapa → proyecto.
 */
export class GenerarDocumentoContratoUseCase {
  private deps: DepsContrato;

  constructor(deps: DepsContrato) {
    this.deps = deps;
  }

  async execute(contratoId: number, formato: FormatoDocumentoContrato): Promise<Contrato> {
    const d = this.deps;

    const contrato = await d.contratos.getById(contratoId);
    if (!contrato) throw new Error("No existe ese contrato");

    const venta = await d.ventas.getById(contrato.id_venta);
    if (!venta) throw new Error("Ese contrato no tiene una venta asociada");

    const cotizacion = venta.id_cotizacion ? await d.cotizaciones.getById(venta.id_cotizacion) : null;
    const cliente = await d.clientes.getById(venta.id_cliente);
    if (!cliente) throw new Error("No encontramos los datos del comprador");

    const empresa = cliente.id_empresa ? await d.empresas.getById(cliente.id_empresa) : null;
    const configuracion = cliente.id_empresa
      ? await d.configuraciones.getByEmpresaId(cliente.id_empresa)
      : null;
    const moneda = configuracion?.moneda || "USD";

    const lote = await d.lotes.getById(venta.id_lote);
    const manzana = lote ? await d.manzanas.getById(lote.id_manzana) : null;

    // nombre del proyecto: lote -> manzana -> etapa -> proyecto
    let nombreProyecto: string | null = null;
    let idProyecto: number | null = null;
    if (manzana?.id_etapa) {
      const etapa = await d.etapas.getById(manzana.id_etapa);
      if (etapa) {
        idProyecto = etapa.id_proyecto;
        const proyecto = await d.proyectos.getById(etapa.id_proyecto);
        nombreProyecto = proyecto?.nombre ?? null;
      }
    }

    // Datos legales del proyecto de la venta (Contratos → Configuración).
    // Es la única fuente: los datos legales ya no existen a nivel empresa
    // (migración 045). Sólo el RUC vacío se toma de `empresa.ruc`.
    const configProyecto = idProyecto
      ? await d.configuracionContrato.getByProyectoId(idProyecto)
      : null;

    // El plan que se muestra es el realmente persistido (puede haber cuotas
    // ya pagadas o corridas a mano), no uno recalculado.
    const cuotasDb = await d.cobranzas.getByContratoId(contratoId);

    const entrada = cotizacion?.monto_entrada ?? null;
    const contenido: ContenidoContrato = {
      numero_contrato: contrato.numero_contrato,
      fecha: (contrato.created_at ?? venta.created_at ?? new Date().toISOString()).slice(0, 10),
      empresa: {
        nombre: empresa?.razon_social || "La empresa",
        ruc: configProyecto?.ruc?.trim() || empresa?.ruc || null,
        // Datos legales del proyecto; vacío = no se imprime en el contrato.
        representante: configProyecto?.representante || null,
        representante_cedula: configProyecto?.representante_cedula || null,
        representante_email: configProyecto?.representante_email || null,
        ciudad: configProyecto?.ciudad || null,
        cuentas_bancarias: configProyecto?.cuentas_bancarias || null,
        direccion_canje: configProyecto?.direccion_canje || null,
      },
      cliente: {
        nombres: cliente.nombres,
        cedula: cliente.cedula_ruc,
        email: cliente.email,
        telefono: cliente.telefono,
      },
      proyecto: nombreProyecto,
      manzana: manzana?.nombre_codigo ?? null,
      lote: lote?.numero_lote ?? null,
      medidas: lote?.medidas ?? null,
      superficie_m2: lote?.superficie_m2 ?? null,
      precio_total: Number(contrato.monto_total),
      entrada,
      financiado: entrada !== null ? Number(contrato.monto_total) - entrada : null,
      num_cuotas: cotizacion?.num_cuotas ?? (cuotasDb.length || null),
      cuotas: cuotasDb
        .slice()
        .sort((a, b) => a.numero_cuota - b.numero_cuota)
        .map((c) => ({
          numero: c.numero_cuota,
          fecha_vencimiento: c.fecha_vencimiento,
          monto: Number(c.monto_cuota),
        })),
      moneda,
    };

    const blob = await d.generador.generar(formato, contenido);
    const nombre = nombreArchivoContrato(contenido, formato);
    const file = new File([blob], nombre, {
      type: formato === "docx" ? MIME_DOCX : "application/pdf",
    });

    // Anexar el nuevo antes de borrar el viejo: si la subida falla, el
    // contrato conserva su documento anterior.
    const { path } = await d.storage.upload({ contratoId, file });
    const actualizado = await d.contratos.setDocumento(contratoId, {
      url: path,
      tipo: formato,
      nombre,
      origen: "generado",
    });

    if (contrato.documento_url) {
      await d.storage.removeByPath(contrato.documento_url).catch(() => undefined);
    }

    return actualizado;
  }
}
