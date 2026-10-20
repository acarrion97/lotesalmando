export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      empresa: {
        Row: {
          id_empresa: number;
          razon_social: string;
          ruc: string | null;
          estado: string | null;
        };
        Insert: {
          id_empresa?: number;
          razon_social: string;
          ruc?: string | null;
          estado?: string | null;
        };
        Update: {
          id_empresa?: number;
          razon_social?: string;
          ruc?: string | null;
          estado?: string | null;
        };
      };
      configuracion: {
        Row: {
          id_configuracion: number;
          id_empresa: number;
          moneda: string | null;
          idioma: string | null;
        };
        Insert: {
          id_configuracion?: number;
          id_empresa: number;
          moneda?: string | null;
          idioma?: string | null;
        };
        Update: {
          id_configuracion?: number;
          id_empresa?: number;
          moneda?: string | null;
          idioma?: string | null;
        };
      };
      proyectos: {
        Row: {
          id_proyecto: number;
          id_empresa: number;
          nombre: string;
        };
        Insert: {
          id_proyecto?: number;
          id_empresa: number;
          nombre: string;
        };
        Update: {
          id_proyecto?: number;
          id_empresa?: number;
          nombre?: string;
        };
      };
      mapas: {
        Row: {
          id_mapa: number;
          id_proyecto: number;
          url_publica: string | null;
          centro_lat: number | null;
          centro_lng: number | null;
          ancho_m: number | null;
        };
        Insert: {
          id_mapa?: number;
          id_proyecto: number;
          url_publica?: string | null;
          centro_lat?: number | null;
          centro_lng?: number | null;
          ancho_m?: number | null;
        };
        Update: {
          id_mapa?: number;
          id_proyecto?: number;
          url_publica?: string | null;
          centro_lat?: number | null;
          centro_lng?: number | null;
          ancho_m?: number | null;
        };
      };
      etapas: {
        Row: {
          id_etapa: number;
          id_proyecto: number;
          nombre: string;
          orden: number | null;
        };
        Insert: {
          id_etapa?: number;
          id_proyecto: number;
          nombre: string;
          orden?: number | null;
        };
        Update: {
          id_etapa?: number;
          id_proyecto?: number;
          nombre?: string;
          orden?: number | null;
        };
      };
      manzana_bloque: {
        Row: {
          id_manzana: number;
          id_etapa: number;
          nombre_codigo: string | null;
        };
        Insert: {
          id_manzana?: number;
          id_etapa: number;
          nombre_codigo?: string | null;
        };
        Update: {
          id_manzana?: number;
          id_etapa?: number;
          nombre_codigo?: string | null;
        };
      };
      lotes: {
        Row: {
          id_lote: number;
          id_manzana: number;
          numero_lote: string;
          precio_lista: number | null;
          estado: string | null;
        };
        Insert: {
          id_lote?: number;
          id_manzana: number;
          numero_lote: string;
          precio_lista?: number | null;
          estado?: string | null;
        };
        Update: {
          id_lote?: number;
          id_manzana?: number;
          numero_lote?: string;
          precio_lista?: number | null;
          estado?: string | null;
        };
      };
      usuario: {
        Row: {
          id_usuario: number;
          id_empresa: number;
          nombres: string;
          email: string;
          estado: string | null;
        };
        Insert: {
          id_usuario?: number;
          id_empresa: number;
          nombres: string;
          email: string;
          estado?: string | null;
        };
        Update: {
          id_usuario?: number;
          id_empresa?: number;
          nombres?: string;
          email?: string;
          estado?: string | null;
        };
      };
      cliente: {
        Row: {
          id_cliente: number;
          nombres: string;
          cedula_ruc: string | null;
          email: string | null;
        };
        Insert: {
          id_cliente?: number;
          nombres: string;
          cedula_ruc?: string | null;
          email?: string | null;
        };
        Update: {
          id_cliente?: number;
          nombres?: string;
          cedula_ruc?: string | null;
          email?: string | null;
        };
      };
      inventario: {
        Row: {
          id_inventario: number;
          id_lote: number;
          id_usuario: number;
          estado_anterior: string | null;
          estado_nuevo: string | null;
        };
        Insert: {
          id_inventario?: number;
          id_lote: number;
          id_usuario: number;
          estado_anterior?: string | null;
          estado_nuevo?: string | null;
        };
        Update: {
          id_inventario?: number;
          id_lote?: number;
          id_usuario?: number;
          estado_anterior?: string | null;
          estado_nuevo?: string | null;
        };
      };
      cotizador: {
        Row: {
          id_cotizacion: number;
          id_cliente: number;
          id_lote: number;
          precio_ofertado: number;
          estado: string | null;
        };
        Insert: {
          id_cotizacion?: number;
          id_cliente: number;
          id_lote: number;
          precio_ofertado: number;
          estado?: string | null;
        };
        Update: {
          id_cotizacion?: number;
          id_cliente?: number;
          id_lote?: number;
          precio_ofertado?: number;
          estado?: string | null;
        };
      };
      ventas: {
        Row: {
          id_venta: number;
          id_cliente: number;
          id_lote: number;
          id_cotizacion: number | null;
          id_usuario: number;
          precio_final: number;
          estado: string | null;
        };
        Insert: {
          id_venta?: number;
          id_cliente: number;
          id_lote: number;
          id_cotizacion?: number | null;
          id_usuario: number;
          precio_final: number;
          estado?: string | null;
        };
        Update: {
          id_venta?: number;
          id_cliente?: number;
          id_lote?: number;
          id_cotizacion?: number | null;
          id_usuario?: number;
          precio_final?: number;
          estado?: string | null;
        };
      };
      contratos: {
        Row: {
          id_contrato: number;
          id_venta: number;
          numero_contrato: string;
          monto_total: number;
        };
        Insert: {
          id_contrato?: number;
          id_venta: number;
          numero_contrato: string;
          monto_total: number;
        };
        Update: {
          id_contrato?: number;
          id_venta?: number;
          numero_contrato?: string;
          monto_total?: number;
        };
      };
      cobranzas: {
        Row: {
          id_cobranza: number;
          id_contrato: number;
          numero_cuota: number;
          monto_cuota: number;
          estado: string | null;
          created_at: string | null;
          fecha_vencimiento: string;
        };
        Insert: {
          id_cobranza?: number;
          id_contrato: number;
          numero_cuota: number;
          monto_cuota: number;
          estado?: string | null;
          created_at?: string | null;
          fecha_vencimiento: string;
        };
        Update: {
          id_cobranza?: number;
          id_contrato?: number;
          numero_cuota?: number;
          monto_cuota?: number;
          estado?: string | null;
          created_at?: string | null;
          fecha_vencimiento?: string;
        };
      };
      pagos: {
        Row: {
          id_pago: number;
          id_cobranza: number;
          id_usuario: number;
          monto_pagado: number;
          fecha_pago: string;
        };
        Insert: {
          id_pago?: number;
          id_cobranza: number;
          id_usuario: number;
          monto_pagado: number;
          fecha_pago?: string;
        };
        Update: {
          id_pago?: number;
          id_cobranza?: number;
          id_usuario?: number;
          monto_pagado?: number;
          fecha_pago?: string;
        };
      };
      roles: {
        Row: {
          id_rol: number;
          nombre_rol: string;
        };
        Insert: {
          id_rol?: number;
          nombre_rol: string;
        };
        Update: {
          id_rol?: number;
          nombre_rol?: string;
        };
      };
      permiso: {
        Row: {
          id_permiso: number;
          nombre_permiso: string;
          modulo: string | null;
        };
        Insert: {
          id_permiso?: number;
          nombre_permiso: string;
          modulo?: string | null;
        };
        Update: {
          id_permiso?: number;
          nombre_permiso?: string;
          modulo?: string | null;
        };
      };
      usuario_rol: {
        Row: {
          id_usuario: number;
          id_rol: number;
          fecha_asignacion: string | null;
        };
        Insert: {
          id_usuario: number;
          id_rol: number;
          fecha_asignacion?: string | null;
        };
        Update: {
          id_usuario?: number;
          id_rol?: number;
          fecha_asignacion?: string | null;
        };
      };
      rol_permiso: {
        Row: {
          id_rol: number;
          id_permiso: number;
        };
        Insert: {
          id_rol: number;
          id_permiso: number;
        };
        Update: {
          id_rol?: number;
          id_permiso?: number;
        };
      };
      prospectos: {
        Row: {
          id_prospecto: number;
          id_empresa: number;
          id_asesor: number | null;
          nombres: string;
          email: string | null;
          telefono: string | null;
          origen: string | null;
          estado: string | null;
          notas: string | null;
          fecha_ultimo_seguimiento: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id_prospecto?: number;
          id_empresa: number;
          id_asesor?: number | null;
          nombres: string;
          email?: string | null;
          telefono?: string | null;
          origen?: string | null;
          estado?: string | null;
          notas?: string | null;
          fecha_ultimo_seguimiento?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id_prospecto?: number;
          id_empresa?: number;
          id_asesor?: number | null;
          nombres?: string;
          email?: string | null;
          telefono?: string | null;
          origen?: string | null;
          estado?: string | null;
          notas?: string | null;
          fecha_ultimo_seguimiento?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      oportunidades: {
        Row: {
          id_oportunidad: number;
          id_empresa: number;
          id_prospecto: number;
          id_lote: number | null;
          etapa: string | null;
          valor_estimado: number | null;
          notas: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id_oportunidad?: number;
          id_empresa: number;
          id_prospecto: number;
          id_lote?: number | null;
          etapa?: string | null;
          valor_estimado?: number | null;
          notas?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id_oportunidad?: number;
          id_empresa?: number;
          id_prospecto?: number;
          id_lote?: number | null;
          etapa?: string | null;
          valor_estimado?: number | null;
          notas?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      actividades: {
        Row: {
          id_actividad: number;
          id_prospecto: number;
          id_usuario: number | null;
          tipo: string;
          descripcion: string | null;
          fecha_actividad: string | null;
          created_at: string | null;
        };
        Insert: {
          id_actividad?: number;
          id_prospecto: number;
          id_usuario?: number | null;
          tipo: string;
          descripcion?: string | null;
          fecha_actividad?: string | null;
          created_at?: string | null;
        };
        Update: {
          id_actividad?: number;
          id_prospecto?: number;
          id_usuario?: number | null;
          tipo?: string;
          descripcion?: string | null;
          fecha_actividad?: string | null;
          created_at?: string | null;
        };
      };
      asesores: {
        Row: {
          id_asesor: number;
          id_empresa: number;
          id_usuario: number | null;
          codigo: string;
          nombre_comercial: string;
          meta_ventas_mensual: number | null;
          estado: string | null;
          created_at: string | null;
        };
        Insert: {
          id_asesor?: number;
          id_empresa: number;
          id_usuario?: number | null;
          codigo: string;
          nombre_comercial: string;
          meta_ventas_mensual?: number | null;
          estado?: string | null;
          created_at?: string | null;
        };
        Update: {
          id_asesor?: number;
          id_empresa?: number;
          id_usuario?: number | null;
          codigo?: string;
          nombre_comercial?: string;
          meta_ventas_mensual?: number | null;
          estado?: string | null;
          created_at?: string | null;
        };
      };
    };
  };
}
