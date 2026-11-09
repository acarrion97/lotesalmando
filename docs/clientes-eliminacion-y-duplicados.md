# Eliminación y unicidad de clientes

Ejecuta `supabase/migrations/049_eliminar_clientes_en_cascada_y_unicidad.sql`
en el SQL Editor de Supabase después de las migraciones anteriores.

La eliminación requiere el permiso `eliminar_clientes` y un motivo de al menos
5 caracteres. En una transacción se guarda el snapshot del cliente y el motivo
en `clientes_eliminaciones`, y se eliminan sus cotizaciones, ventas, contratos,
cuotas, pagos, recibos y comprobantes relacionados. Los pagos también quedan
registrados en `pagos_eliminaciones` con ese motivo. Los archivos adjuntos se
eliminan del almacenamiento después de confirmar la transacción; si falla esa
limpieza, la aplicación lo informa y las rutas quedan en la auditoría.

La cédula/RUC queda única dentro de cada empresa, ignorando espacios, puntos,
guiones y mayúsculas. La migración no fusiona registros existentes: si detecta
duplicados, se detiene e indica los IDs de cliente para que se revisen antes de
volver a ejecutarla.
