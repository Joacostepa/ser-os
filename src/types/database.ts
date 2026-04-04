export type EstadoInterno =
  | "nuevo"
  | "pendiente_sena"
  | "sena_recibida"
  | "en_prearmado"
  | "esperando_insumos"
  | "esperando_diseno"
  | "insumos_recibidos"
  | "listo_para_armar"
  | "en_armado"
  | "armado_completo"
  | "pendiente_saldo"
  | "listo_para_despacho"
  | "en_preparacion_envio"
  | "despachado"
  | "cerrado"
  | "cancelado"

export type EstadoPublico =
  | "recibido"
  | "en_produccion"
  | "en_diseno"
  | "en_preparacion"
  | "listo_pendiente_pago"
  | "listo_para_envio"
  | "enviado"
  | "entregado"

export type TipoPedido = "estandar" | "personalizado"
export type Prioridad = "urgente" | "normal" | "baja"
export type TipoDespacho = "envio" | "retiro_oficina"
export type CategoriaCliente = "nuevo" | "recurrente" | "vip"
export type RolUsuario = "admin" | "operaciones" | "diseno" | "armado" | "logistica" | "contabilidad"
export type EstadoTarea = "pendiente" | "en_proceso" | "terminada" | "bloqueada"
export type AreaTarea = "diseno" | "operaciones" | "armado" | "logistica" | "admin"
export type TipoPago = "cobro" | "pago_proveedor" | "gasto"
export type ConceptoPago = "sena" | "saldo" | "pago_total" | "gasto_operativo"
export type TipoMovimientoStock = "entrada" | "salida" | "ajuste" | "devolucion"
export type EstadoCompra = "borrador" | "enviada" | "confirmada" | "recibida_parcial" | "recibida" | "cancelada"
export type TipoNotificacion = "interna" | "email_cliente" | "whatsapp"
export type CalificacionProveedor = "excelente" | "bueno" | "regular" | "malo"
export type RubroProveedor = "textil" | "imprenta" | "confeccion" | "madera" | "cuero" | "packaging" | "otro"
export type TipoInsumo = "material" | "servicio"
export type UnidadInsumo = "unidades" | "metros" | "kg" | "rollos" | "horas" | "ml" | "litros"
export type ReferenciaMovimiento = "compra" | "pedido" | "ajuste_manual"

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          nombre: string
          email: string
          rol: RolUsuario
          activo: boolean
          avatar_url: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["usuarios"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["usuarios"]["Insert"]>
      }
      clientes: {
        Row: {
          id: string
          tienda_nube_id: string | null
          nombre: string
          email: string | null
          telefono: string | null
          cuit: string | null
          direccion: Record<string, unknown> | null
          categoria: CategoriaCliente
          notas: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["clientes"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>
      }
      productos: {
        Row: {
          id: string
          tienda_nube_id: string | null
          nombre: string
          sku: string | null
          categoria: string | null
          tipo: "estandar" | "personalizable"
          costo_base: number | null
          precio_mayorista: number | null
          stock_minimo: number
          activo: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["productos"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["productos"]["Insert"]>
      }
      variantes: {
        Row: {
          id: string
          producto_id: string
          tienda_nube_id: string | null
          nombre: string
          sku: string | null
          stock_actual: number
          stock_reservado: number
          costo: number | null
          precio: number | null
        }
        Insert: Omit<Database["public"]["Tables"]["variantes"]["Row"], "id">
        Update: Partial<Database["public"]["Tables"]["variantes"]["Insert"]>
      }
      pedidos: {
        Row: {
          id: string
          numero_tn: string | null
          tienda_nube_id: string | null
          cliente_id: string
          tipo: TipoPedido
          estado_interno: EstadoInterno
          estado_publico: EstadoPublico
          prioridad: Prioridad
          fecha_ingreso: string
          fecha_comprometida: string | null
          monto_total: number
          monto_pagado: number
          saldo_pendiente: number
          tipo_despacho: TipoDespacho | null
          observaciones: string | null
          datos_envio: Record<string, unknown> | null
          codigo_seguimiento: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["pedidos"]["Row"], "id" | "created_at" | "updated_at" | "codigo_seguimiento" | "saldo_pendiente">
        Update: Partial<Database["public"]["Tables"]["pedidos"]["Insert"]>
      }
      items_pedido: {
        Row: {
          id: string
          pedido_id: string
          producto_id: string | null
          variante_id: string | null
          descripcion: string
          cantidad: number
          precio_unitario: number
          costo_unitario: number | null
          subtotal: number
          personalizacion: Record<string, unknown> | null
        }
        Insert: Omit<Database["public"]["Tables"]["items_pedido"]["Row"], "id" | "subtotal">
        Update: Partial<Database["public"]["Tables"]["items_pedido"]["Insert"]>
      }
      tareas: {
        Row: {
          id: string
          pedido_id: string | null
          plantilla_tarea_id: string | null
          titulo: string
          descripcion: string | null
          estado: EstadoTarea
          responsable_id: string | null
          area: AreaTarea
          orden: number
          fecha_limite: string | null
          depende_de: string[]
          completada_por: string | null
          completada_en: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["tareas"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["tareas"]["Insert"]>
      }
      subtareas: {
        Row: {
          id: string
          tarea_id: string
          titulo: string
          completada: boolean
          orden: number
        }
        Insert: Omit<Database["public"]["Tables"]["subtareas"]["Row"], "id">
        Update: Partial<Database["public"]["Tables"]["subtareas"]["Insert"]>
      }
      pagos: {
        Row: {
          id: string
          tipo: TipoPago
          pedido_id: string | null
          cliente_id: string | null
          monto: number
          metodo: string
          concepto: ConceptoPago
          comprobante_url: string | null
          fecha: string
          notas: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["pagos"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["pagos"]["Insert"]>
      }
      historial_pedido: {
        Row: {
          id: string
          pedido_id: string
          usuario_id: string | null
          accion: string
          estado_anterior: string | null
          estado_nuevo: string | null
          datos: Record<string, unknown> | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["historial_pedido"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["historial_pedido"]["Insert"]>
      }
      comentarios: {
        Row: {
          id: string
          entidad_tipo: string
          entidad_id: string
          usuario_id: string
          contenido: string
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["comentarios"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["comentarios"]["Insert"]>
      }
      archivos: {
        Row: {
          id: string
          entidad_tipo: string
          entidad_id: string
          nombre: string
          url: string
          tipo_mime: string | null
          subido_por: string
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["archivos"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["archivos"]["Insert"]>
      }
      plantillas_tarea: {
        Row: {
          id: string
          tipo_pedido: TipoPedido
          titulo: string
          area: AreaTarea
          responsable_rol: RolUsuario
          orden: number
          depende_de_orden: number[]
          es_obligatoria: boolean
        }
        Insert: Omit<Database["public"]["Tables"]["plantillas_tarea"]["Row"], "id">
        Update: Partial<Database["public"]["Tables"]["plantillas_tarea"]["Insert"]>
      }
      notificaciones: {
        Row: {
          id: string
          tipo: TipoNotificacion
          destinatario: string
          asunto: string
          contenido: string
          plantilla_id: string | null
          pedido_id: string | null
          enviada: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["notificaciones"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["notificaciones"]["Insert"]>
      }
      proveedores: {
        Row: {
          id: string
          nombre: string
          contacto_principal: string | null
          email: string | null
          telefono: string | null
          direccion: string | null
          rubro: RubroProveedor
          condiciones_pago: string | null
          tiempo_entrega_dias: number | null
          calificacion: CalificacionProveedor
          notas: string | null
          activo: boolean
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["proveedores"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["proveedores"]["Insert"]>
      }
      proveedores_productos: {
        Row: {
          id: string
          proveedor_id: string
          producto_id: string | null
          descripcion: string
          precio_referencia: number | null
          moneda: string
          ultima_compra: string | null
          notas: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["proveedores_productos"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["proveedores_productos"]["Insert"]>
      }
      compras: {
        Row: {
          id: string
          proveedor_id: string
          pedido_id: string | null
          estado: EstadoCompra
          fecha_pedido: string
          fecha_esperada: string | null
          fecha_recibida: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["compras"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["compras"]["Insert"]>
      }
      items_compra: {
        Row: {
          id: string
          compra_id: string
          producto_id: string | null
          insumo_id: string | null
          descripcion: string
          cantidad: number
          precio_unitario: number
          cantidad_recibida: number
          subtotal: number
          notas: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["items_compra"]["Row"], "id" | "created_at" | "subtotal">
        Update: Partial<Database["public"]["Tables"]["items_compra"]["Insert"]>
      }
      insumos: {
        Row: {
          id: string
          nombre: string
          tipo: TipoInsumo
          unidad: UnidadInsumo
          stock_actual: number
          stock_minimo: number
          costo_unitario: number
          unidad_compra: string | null
          rendimiento: number
          proveedor_id: string | null
          producto_id: string | null
          activo: boolean
          notas: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["insumos"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["insumos"]["Insert"]>
      }
      recetas: {
        Row: {
          id: string
          producto_id: string
          nombre: string
          activa: boolean
          notas: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["recetas"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["recetas"]["Insert"]>
      }
      receta_insumos: {
        Row: {
          id: string
          receta_id: string
          insumo_id: string
          cantidad: number
          notas: string | null
        }
        Insert: Omit<Database["public"]["Tables"]["receta_insumos"]["Row"], "id">
        Update: Partial<Database["public"]["Tables"]["receta_insumos"]["Insert"]>
      }
      movimientos_stock: {
        Row: {
          id: string
          insumo_id: string
          tipo: TipoMovimientoStock
          cantidad: number
          costo_unitario: number | null
          stock_anterior: number
          stock_posterior: number
          referencia_tipo: ReferenciaMovimiento | null
          referencia_id: string | null
          notas: string | null
          usuario_id: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["movimientos_stock"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["movimientos_stock"]["Insert"]>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      estado_interno: EstadoInterno
      estado_publico: EstadoPublico
      tipo_pedido: TipoPedido
      prioridad: Prioridad
      tipo_despacho: TipoDespacho
      categoria_cliente: CategoriaCliente
      rol_usuario: RolUsuario
      estado_tarea: EstadoTarea
      area_tarea: AreaTarea
      tipo_pago: TipoPago
      concepto_pago: ConceptoPago
      tipo_notificacion: TipoNotificacion
      calificacion_proveedor: CalificacionProveedor
      rubro_proveedor: RubroProveedor
      estado_compra: EstadoCompra
      tipo_insumo: TipoInsumo
      unidad_insumo: UnidadInsumo
      tipo_movimiento_stock: TipoMovimientoStock
      referencia_movimiento: ReferenciaMovimiento
    }
  }
}
