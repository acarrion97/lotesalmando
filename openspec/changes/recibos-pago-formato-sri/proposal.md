## Why

Cuando un asesor aprueba un pago (ya sea la prueba de pago que sube el cliente desde el portal o un pago registrado a mano), el sistema no entrega ningún respaldo al cliente: solo cambia la cuota a `pagada`. En Ecuador el receptor necesita un documento que soporte el pago recibido, y ese documento debe seguir el formato de comprobante que define el SRI (ficha técnica de comprobantes electrónicos, versión 2.33): datos del emisor con RUC, identificación del receptor, detalle, subtotal, impuestos y total, más un número secuencial tipo `estab-ptoEmi-secuencial`.

## What Changes

- Nueva entidad `Recibo` con número secuencial persistido (`001-001-000000001`), generado de forma atómica al aprobar o registrar un pago.
- Nueva tabla `recibos` en Supabase con su secuencial, datos fiscales del emisor y una referencia al pago/cuota.
- Recibo en PDF con el formato de representación impresa (RIDE) de factura del SRI: encabezado con razón social, RUC, dirección matriz/establecimiento, número de comprobante, fecha; bloque de cliente con tipo de identificación (RUC/cédula/consumidor final) e identificación; tabla de detalle; subtotal, IVA 15% (calculado hacia adentro desde el total cobrado) y total; forma de pago; y pie con nota aclaratoria de que es un respaldo interno y no un comprobante electrónico autorizado por el SRI.
- El IVA se obtiene dividiendo el monto pagado entre 1,15 (el importe cobrado incluye el impuesto), de modo que `subtotal + IVA = monto_pagado`.
- El recibo se emite en los dos caminos que marcan una cuota como pagada: `AprobarComprobanteUseCase` y `RegisterPagoUseCase`.
- La forma de pago se selecciona explícitamente al registrar el pago o aprobar el comprobante y queda guardada junto al pago y al recibo.
- Nueva acción para reimprimir o descargar un recibo desde el historial de pagos/cuotas, siempre con el mismo número.

## Capabilities

### New Capabilities
- `ventas/recibos-pago`: emisión, numeración, cálculo de impuestos y representación impresa de los recibos de pago emitidos al confirmarse el pago de una cuota.

### Modified Capabilities
<!-- ninguno: `ventas/estado-cuotas` no cambia de requisitos; el recibo es un documento adicional que no altera los estados -->

## Impact

- **Base de datos**: nueva migración `supabase/migrations/043_recibos_pago.sql` (la migración 042 ya se utiliza para el logo empresarial; esta añade datos fiscales por proyecto, forma de pago, tabla `recibos`, secuencial atómico y acceso seguro por RPC).
- **Dominio**: `src/domain/recibo/` (entidad, repositorio) y su adaptador Supabase/Mock.
- **Aplicación**: `src/application/recibos/use-cases/` (`EmitirReciboUseCase`, `GetRecibosUseCase`) y cambios en `AprobarComprobanteUseCase` y `RegisterPagoUseCase`.
- **Infraestructura**: nuevo generador de PDF de recibo en `src/infrastructure/documents/`, siguiendo el patrón de `GeneradorDocumentoPdf.ts` (jsPDF, en el navegador, sin servidor).
- **Presentación**: botón de recibo en `PagosPage`, `VentasPage`/`CuotasPendientesVenta` y en el modal de revisión de comprobantes.
- **Dependencias**: se reutiliza `jspdf` (ya instalado); no se agregan dependencias nuevas.
- **Fuera de alcance**: XML, firma digital con `.p12` y autorización ante los web services del SRI. El documento generado es un respaldo interno con el formato del RIDE, no una factura electrónica.
