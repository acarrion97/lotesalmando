import type {
  AceptarCotizacionCommand,
  AceptarCotizacionPort,
  ResultadoAceptacion,
} from "../ports/AceptarCotizacionPort";

export class AceptarCotizacionUseCase {
  private aceptarCotizacion: AceptarCotizacionPort;

  constructor(aceptarCotizacion: AceptarCotizacionPort) {
    this.aceptarCotizacion = aceptarCotizacion;
  }

  async execute(command: AceptarCotizacionCommand): Promise<ResultadoAceptacion> {
    return this.aceptarCotizacion.execute(command);
  }
}
