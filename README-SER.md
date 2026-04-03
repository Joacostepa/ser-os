# SISTEMA DE GESTIÓN INTEGRAL — SER MAYORISTA

## Documento de Diseño Funcional y Técnico

**Versión:** 1.0  
**Fecha:** Abril 2026  
**Tipo:** Backoffice operativo + ERP liviano conectado a Tienda Nube

---

## 1. VISIÓN GENERAL DEL SISTEMA

### Qué tipo de aplicación conviene construir

La aplicación ideal es un **backoffice operativo con capacidades de ERP liviano**, conectado bidireccionalmente con Tienda Nube. No es un ERP completo (eso sería matar moscas con un cañón para una pyme), ni un simple panel de administración. Es un sistema operativo interno que centraliza todo lo que hoy está disperso entre Notion, planillas, WhatsApp y la cabeza de Sheila.

### Por qué no un ERP tradicional

Los ERP tradicionales (Odoo, SAP Business One, incluso Colppy) tienen tres problemas para este caso: son genéricos y no modelan la operatoria específica de pedidos personalizados con proveedores externos, son caros o complejos de configurar, y obligan a adaptar el negocio al software en vez de al revés.

### Lógica general del sistema

El sistema funciona como un hub operativo donde:

- Tienda Nube es la puerta de entrada de pedidos y la cara visible al cliente
- La app interna es el cerebro operativo: recibe pedidos, clasifica, genera tareas, controla stock, rastrea pagos, coordina proveedores y cierra el circuito
- El cliente ve un portal simplificado con el estado de su pedido
- La dueña ve dashboards de rentabilidad, KPIs y estado general

Todo pedido que entra genera automáticamente un flujo de tareas según su tipo (estándar o personalizado), y el sistema va guiando a cada operador sobre qué hacer, en qué orden, y qué está bloqueando el avance.

---

## 2. MÓDULOS DE LA APLICACIÓN

### 2.1 Dashboard General

Panel de control principal con vista rápida del estado del negocio.

**Contenido:**
- Pedidos del día/semana: ingresados, en proceso, bloqueados, listos, despachados
- Alertas activas: pagos pendientes, stock crítico, tareas vencidas, insumos esperados
- Facturación del mes vs. mes anterior
- Pedidos por estado (gráfico de embudo)
- Tareas asignadas al usuario logueado
- Accesos rápidos a las acciones más frecuentes

**Nota de diseño:** El dashboard debe ser configurable por rol. La dueña ve rentabilidad y KPIs, el equipo de operaciones ve sus tareas pendientes y alertas.

### 2.2 Pedidos

Módulo central del sistema. Cada pedido es la unidad de trabajo principal.

**Funcionalidades:**
- Ingreso automático desde Tienda Nube vía API/webhook
- Clasificación automática o manual: marca blanca/logo SER vs. personalizado
- Asignación de prioridad (urgente, normal, baja)
- Fecha comprometida de entrega
- Estados internos del pedido (visibles solo para el equipo)
- Estados públicos del pedido (visibles para el cliente)
- Checklist de tareas asociadas (generadas automáticamente según tipo)
- Historial completo de acciones y cambios de estado
- Comentarios internos del equipo
- Archivos adjuntos (diseños, comprobantes, fotos)
- Vinculación con pagos, remitos, envíos
- Vista detalle con toda la trazabilidad
- Vista listado con filtros avanzados
- Vista Kanban por estado

**Estados internos del pedido:**
1. Nuevo (ingresado desde TN)
2. Pendiente de seña
3. Seña recibida / Habilitado
4. En pre-armado
5. Esperando insumos externos
6. Esperando diseño
7. Insumos recibidos
8. Listo para armar
9. En armado
10. Armado completo
11. Pendiente de saldo
12. Listo para despacho
13. En preparación de envío/retiro
14. Despachado / Entregado
15. Cerrado
16. Cancelado

**Estados públicos (lo que ve el cliente):**
1. Recibido
2. En producción
3. En diseño (solo personalizados)
4. En preparación
5. Listo — pendiente de pago
6. Listo para envío
7. Enviado / Listo para retiro
8. Entregado

### 2.3 Operaciones

Módulo de ejecución diaria del equipo. Se desarrolla en profundidad en la sección 4.

### 2.4 Stock

**Funcionalidades:**
- Catálogo de productos con variantes (talle, color, material)
- Stock actual por producto/variante
- Stock reservado (comprometido en pedidos no despachados)
- Stock disponible = actual - reservado
- Alertas de stock mínimo configurable por producto
- Movimientos de stock: entrada (compra), salida (pedido), ajuste manual, devolución
- Historial de movimientos por producto
- Trazabilidad: qué pedido consumió qué stock
- Sincronización bidireccional con Tienda Nube

**Supuesto importante:** Los productos personalizados no manejan stock tradicional — se compran/producen contra pedido. El stock aplica principalmente a textiles, packaging y materiales estándar.

### 2.5 Compras

**Funcionalidades:**
- Órdenes de compra a proveedores
- Vinculación con pedidos que originan la necesidad de compra
- Estados: borrador, enviada al proveedor, confirmada, recibida parcial, recibida total, cancelada
- Seguimiento de entregas esperadas
- Alerta cuando un pedido depende de una compra pendiente
- Registro de precios por proveedor/producto para comparar
- Recepción de mercadería con control de cantidades
- Impacto automático en stock al recibir

### 2.6 Costos

Se desarrolla en profundidad en la sección 9.

**Funcionalidades clave:**
- Costo por producto (materia prima + insumos + tercerización + packaging)
- Costo por pedido (sumatoria de items + envío + extras)
- Margen bruto por pedido
- Margen por cliente (histórico)
- Margen por línea de producto
- Fichas de costo por producto actualizables

### 2.7 Contabilidad / Finanzas

Se desarrolla en profundidad en la sección 10.

**Funcionalidades clave:**
- Cuentas a cobrar y estado de pagos
- Registro de anticipos/señas y saldos
- Cuentas a pagar (proveedores)
- Gastos operativos categorizados
- Flujo de caja simplificado
- Conciliación básica de pagos
- Estado de resultados gerencial mensual

### 2.8 Tareas

**Funcionalidades:**
- Tareas generadas automáticamente por tipo de pedido
- Tareas manuales creadas por cualquier usuario
- Asignación a usuario responsable
- Estados: pendiente, en proceso, terminada, bloqueada
- Dependencias entre tareas (tarea B no arranca hasta que termine tarea A)
- Fechas límite
- Alertas de vencimiento
- Vinculación con pedido, compra, proveedor
- Subtareas para descomponer tareas complejas
- Comentarios y adjuntos por tarea

### 2.9 Manuales de Procedimiento

Se desarrolla en sección 12.

### 2.10 Clientes

**Funcionalidades:**
- Ficha del cliente con datos de contacto, CUIT, dirección
- Historial de pedidos
- Estado de cuenta (deuda, crédito, pagos)
- Categorización: cliente nuevo, recurrente, VIP
- Notas internas sobre el cliente
- Datos importados desde Tienda Nube
- Logos y archivos de marca del cliente (para pedidos personalizados)
- Canal de comunicación preferido

### 2.11 Proveedores

**Funcionalidades:**
- Ficha del proveedor: datos, contacto, condiciones de pago
- Productos/servicios que provee
- Historial de compras y cumplimiento
- Tiempos de entrega habituales
- Calificación interna (cumple plazos, calidad)
- Proveedores clave: Gerardo (eco cuero, maderas), Masterprint (stickers), Olga (modista)

### 2.12 Logística / Envíos

**Funcionalidades:**
- Tipo de despacho: envío por correo, retiro en oficina, envío por flete
- Generación de etiqueta de envío (integración con correos si aplica)
- Datos de seguimiento (tracking)
- Remitos digitales
- Estado: preparando, listo para retiro, despachado, en tránsito, entregado
- Vista separada para "pedidos listos para despachar hoy"

### 2.13 Reportes

Se desarrolla en sección 11.

### 2.14 Configuración

**Funcionalidades:**
- Gestión de usuarios y roles
- Configuración de estados de pedido
- Plantillas de tareas por tipo de pedido
- Textos de notificaciones predeterminadas
- Conexión con Tienda Nube (API keys)
- Configuración de alertas
- Datos de la empresa
- Parámetros de costos generales

### 2.15 Portal de Seguimiento para Clientes

Se desarrolla en sección 8.

### 2.16 Módulos adicionales propuestos

**Calendario operativo:** Vista de calendario con fechas comprometidas de entrega, recepciones esperadas de proveedores y tareas con deadline. Permite planificar la semana y detectar cuellos de botella antes de que ocurran.

**Centro de notificaciones:** Historial de todas las notificaciones enviadas (internas y al cliente), con plantillas editables y la posibilidad de disparar notificaciones manuales o automáticas por cambio de estado.

**Módulo de calidad / incidencias:** Registro de errores, reprocesos, reclamos de clientes. Permite medir tasa de error, identificar problemas recurrentes y mejorar procesos.

**Módulo de devoluciones:** Gestión de devoluciones parciales o totales con impacto en stock, costos y cuenta del cliente.

---

## 3. FLUJO OPERATIVO IDEAL

### 3.1 Flujo general rediseñado

El flujo actual tiene lógica pero le falta estructura formal y automatización. A continuación se presenta el flujo rediseñado:

### FASE 1: INGRESO

1. Webhook de Tienda Nube detecta nueva compra
2. El sistema crea el pedido con datos básicos (número TN, cliente, items, monto, forma de pago)
3. El sistema clasifica automáticamente el pedido:
   - Si todos los productos son marca blanca/logo SER → tipo ESTÁNDAR
   - Si algún producto requiere personalización → tipo PERSONALIZADO
   - (Opción de reclasificación manual si la lógica automática falla)
4. Estado inicial: NUEVO

### FASE 2: HABILITACIÓN

5. Regla automática de pago:
   - Si el pedido está pago al 100% → estado HABILITADO, pasa directo a pre-armado
   - Si requiere seña → estado PENDIENTE DE SEÑA
   - Si paga seña → estado SEÑA RECIBIDA / HABILITADO
6. Al habilitarse, se generan automáticamente las tareas según tipo de pedido

### FASE 3: PRE-ARMADO (difiere según tipo)

**Para pedidos ESTÁNDAR:**
- Tarea 1: Imprimir detalle del pedido
- Tarea 2: Separar textiles del stock
- Tarea 3: Resaltar items con color
- Tarea 4: Guardar en zona de pre-armado
- Tarea 5: Pegar cartel identificatorio

**Para pedidos PERSONALIZADOS (incluye todo lo anterior más):**
- Tarea D1: Diseño de stickers (asignada a Yare)
- Tarea D2: Diseño de etiquetas eco cuero (asignada a Yare)
- Tarea D3: Enviar diseño eco cuero y maderas a Gerardo (depende de D2)
- Tarea D4: Enviar stickers a Masterprint (depende de D1)
- Tarea P1: Recibir stickers de Masterprint (bloquea armado)
- Tarea P2: Enviar textiles a Olga para etiqueta eco cuero (depende de tarea 2 + recepción eco cuero de Gerardo)
- Tarea P3: Recibir textiles de Olga (bloquea armado)

**Lógica de bloqueo:** El pedido no puede pasar a LISTO PARA ARMAR hasta que todas las tareas de pre-armado y todas las tareas de proveedores estén completadas.

### FASE 4: ARMADO

Cuando todas las tareas previas están completas → estado LISTO PARA ARMAR

- Tarea A1: Pegar stickers donde corresponda
- Tarea A2: Poner cartón a textiles
- Tarea A3: Embalar en caja con pluribol
- Tarea A4: Poner tarjetón de agradecimiento
- Tarea A5: Cerrar caja
- Tarea A6: Marcar como empaquetado en Tienda Nube (automático vía API)

Estado → ARMADO COMPLETO

### FASE 5: DESPACHO

**Bifurcación por estado de pago:**

Si el pedido está pago al 100%:
- Tarea E1: Generar etiqueta de envío o preparar para retiro
- Tarea E2: Si retira por oficina → preparar para retiro en zona de despacho
- Tarea E3: Completar remito
- Estado → LISTO PARA DESPACHO

Si el pedido NO está saldado:
- Tarea N1: Enviar segunda notificación de pago al cliente
- Estado → PENDIENTE DE SALDO
- El pedido queda separado en zona de espera
- Se genera alerta periódica (cada 48hs) si sigue sin pagar
- Cuando paga → vuelve al flujo normal de despacho

### FASE 6: CIERRE

- Al despachar: marcar como enviado en Tienda Nube (vía API)
- Estado interno → DESPACHADO
- Si tiene tracking, registrar número de seguimiento
- Estado público → ENVIADO / LISTO PARA RETIRO
- Cuando el cliente confirma recepción o pasan X días → ENTREGADO
- Estado → CERRADO

### 3.2 Reglas automáticas del sistema

| Evento | Acción automática |
|--------|-------------------|
| Nuevo pedido ingresa desde TN | Crear pedido, clasificar tipo, notificar al equipo |
| Se registra pago de seña | Cambiar estado a HABILITADO, generar tareas |
| Pago total registrado | Marcar como pago completo, habilitar despacho |
| Todas las tareas de pre-armado completas | Cambiar estado a LISTO PARA ARMAR |
| Tarea de armado final completa | Marcar como ARMADO COMPLETO |
| Pedido armado + pago completo | Cambiar a LISTO PARA DESPACHO |
| Se marca como despachado | Actualizar estado en TN, notificar cliente |
| Pago pendiente > 48hs | Generar alerta y notificación automática |
| Stock de producto baja del mínimo | Generar alerta de stock crítico |
| Insumo externo recibido | Desbloquear tareas dependientes |

### 3.3 Qué pasa cuando faltan insumos de terceros

El sistema tiene un estado específico: ESPERANDO INSUMOS EXTERNOS. Las tareas de recepción (P1: stickers de Masterprint, P3: textiles de Olga, recepción de Gerardo) están vinculadas a órdenes de compra. Cuando el operador marca la recepción, el sistema:

1. Actualiza stock si corresponde
2. Marca la tarea de recepción como completa
3. Desbloquea las tareas que dependían de ese insumo
4. Si era el último insumo faltante, cambia el estado del pedido
5. Notifica al responsable del siguiente paso

### 3.4 Retiro por oficina vs. envío

**Envío:** Se genera etiqueta, se registra correo/flete, se carga tracking. El sistema muestra el tracking al cliente en su portal.

**Retiro en oficina:** Se marca la zona de retiro, se notifica al cliente que está listo, se registra fecha/hora de retiro efectivo. El remito se firma digitalmente o se registra manualmente.

---

## 4. DISEÑO DEL MÓDULO DE OPERACIONES

### 4.1 Tablero operativo

El tablero operativo es la vista principal del equipo de trabajo. Muestra el estado real de la operación en tiempo real.

**Componentes:**
- Contador de pedidos por estado (con código de color)
- Lista de alertas activas ordenadas por criticidad
- Próximos vencimientos (pedidos con fecha comprometida cercana)
- Tareas asignadas al usuario actual
- Pedidos bloqueados (por pago, por insumos, por diseño)

### 4.2 Vista Kanban por estado

Columnas del Kanban:
- Nuevo
- Pendiente de seña
- Habilitado / Pre-armado
- Esperando insumos
- Listo para armar
- En armado
- Pendiente de saldo
- Listo para despacho
- Despachado

Cada tarjeta muestra: número de pedido, cliente, prioridad (color), fecha comprometida, tipo (icono: estándar/personalizado), progreso de tareas (barra).

Funcionalidad de drag & drop para cambiar estado manualmente si hace falta.

### 4.3 Vista por prioridad

Tres carriles: Urgente (rojo), Normal (azul), Baja (gris). Dentro de cada carril, ordenados por fecha comprometida.

### 4.4 Vista por fecha comprometida

Timeline o lista ordenada por fecha de entrega prometida. Código de color: verde (en tiempo), amarillo (ajustado), rojo (vencido o en riesgo).

### 4.5 Vista por área

Filtro por sector: Diseño gráfico, Operaciones, Armado, Logística. Cada vista muestra solo las tareas y pedidos relevantes para esa área.

### 4.6 Vista por usuario responsable

Carga de trabajo por persona. Muestra cuántas tareas tiene cada operador asignadas, cuántas vencidas, cuántas en proceso.

### 4.7 Checklist por pedido

Cada pedido tiene una checklist visible en su vista detalle. Las tareas se muestran en orden cronológico con:
- Checkbox de completado
- Estado (pendiente / en proceso / terminada / bloqueada)
- Responsable asignado
- Fecha límite si tiene
- Ícono de bloqueo si depende de otra tarea no completada
- Botón para marcar como completa

### 4.8 Subtareas

Cualquier tarea puede tener subtareas. Por ejemplo, "Embalar en caja" podría tener subtareas como "verificar que todos los items estén", "agregar pluribol", "agregar tarjetón". Útil para operadores nuevos que necesitan más detalle.

### 4.9 Alertas

**Tipos de alerta:**
- Alerta de bloqueo: pedido trabado porque falta completar una tarea o un insumo
- Alerta de pago pendiente: seña o saldo no recibido
- Alerta de faltante de insumos: compra pendiente de recepción que bloquea un pedido
- Alerta de vencimiento: tarea o pedido que superó su fecha límite
- Alerta de stock crítico: producto por debajo del mínimo

**Visualización:** Las alertas aparecen como badges en el dashboard, como banners en el pedido afectado, y como notificaciones en el centro de notificaciones.

### 4.10 Trazabilidad completa

Cada pedido tiene un log cronológico que registra automáticamente:
- Cambios de estado (quién, cuándo)
- Tareas completadas (quién, cuándo)
- Pagos registrados
- Notificaciones enviadas al cliente
- Cambios en datos del pedido
- Comentarios del equipo
- Archivos adjuntados

Este historial es inmutable y no se puede borrar. Es clave para resolver disputas con clientes y para mejorar procesos.

### 4.11 Comentarios internos

Cada pedido y cada tarea tiene un hilo de comentarios internos. Permite mencionar a otros usuarios (@yare, @sheila) para llamar su atención. Los comentarios no son visibles para el cliente.

### 4.12 Archivos adjuntos

Se pueden adjuntar archivos a pedidos y tareas: diseños de stickers, logos del cliente, fotos del producto terminado, comprobantes de pago, etc. Almacenamiento en un bucket (S3, Supabase Storage o similar).

### 4.13 Etiquetas visuales

Tags de color asignables a pedidos para categorización rápida: "URGENTE", "CLIENTE VIP", "PRIMERA COMPRA", "PROBLEMA DE PAGO", "DISEÑO COMPLEJO", etc. Configurables por el administrador.

---

## 5. MODELO DE DATOS

### 5.1 Entidades principales

#### clientes
Representa a cada cliente mayorista.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| tienda_nube_id | string | ID en Tienda Nube |
| nombre | string | Razón social o nombre |
| email | string | Email principal |
| telefono | string | Teléfono / WhatsApp |
| cuit | string | CUIT/CUIL |
| direccion | jsonb | Dirección completa |
| categoria | enum | nuevo, recurrente, vip |
| notas | text | Notas internas |
| created_at | timestamp | Fecha de alta |

Relaciones: tiene muchos pedidos, tiene muchos pagos, tiene muchos archivos_marca.

#### pedidos
Unidad central del sistema. Cada compra mayorista es un pedido.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| numero_tn | string | Número de pedido en Tienda Nube |
| tienda_nube_id | string | ID del pedido en TN |
| cliente_id | UUID | FK a clientes |
| tipo | enum | estandar, personalizado |
| estado_interno | enum | Ver lista de estados |
| estado_publico | enum | Ver estados públicos |
| prioridad | enum | urgente, normal, baja |
| fecha_ingreso | timestamp | Fecha de creación |
| fecha_comprometida | date | Fecha de entrega estimada |
| monto_total | decimal | Monto total del pedido |
| monto_pagado | decimal | Total pagado hasta ahora |
| saldo_pendiente | decimal | Calculado |
| tipo_despacho | enum | envio, retiro_oficina |
| observaciones | text | Notas del pedido |
| datos_envio | jsonb | Dirección, correo, tracking |
| created_at | timestamp | Creación |
| updated_at | timestamp | Última modificación |

Relaciones: pertenece a cliente, tiene muchos items_pedido, tiene muchas tareas, tiene muchos pagos, tiene muchos comentarios, tiene muchos archivos, tiene muchos eventos_historial, tiene un remito.

#### items_pedido
Cada línea de producto dentro de un pedido.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| pedido_id | UUID | FK a pedidos |
| producto_id | UUID | FK a productos |
| variante_id | UUID | FK a variantes (nullable) |
| cantidad | integer | Cantidad solicitada |
| precio_unitario | decimal | Precio de venta unitario |
| costo_unitario | decimal | Costo unitario |
| subtotal | decimal | cantidad × precio_unitario |
| personalizacion | jsonb | Detalles de personalización si aplica |

Relaciones: pertenece a pedido, pertenece a producto, pertenece a variante.

#### productos
Catálogo de productos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| tienda_nube_id | string | ID en Tienda Nube |
| nombre | string | Nombre del producto |
| sku | string | Código interno |
| categoria | string | Categoría del producto |
| tipo | enum | estandar, personalizable |
| costo_base | decimal | Costo base de producción |
| precio_mayorista | decimal | Precio de venta mayorista |
| stock_minimo | integer | Umbral de alerta |
| activo | boolean | Si está activo en el catálogo |

Relaciones: tiene muchas variantes, tiene muchos items_pedido, tiene muchos movimientos_stock.

#### variantes
Variantes de un producto (talle, color, material).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| producto_id | UUID | FK a productos |
| tienda_nube_id | string | ID de variante en TN |
| nombre | string | Ej: "Talle M - Negro" |
| sku | string | SKU de la variante |
| stock_actual | integer | Unidades en depósito |
| stock_reservado | integer | Comprometido en pedidos |
| stock_disponible | integer | Calculado: actual - reservado |
| costo | decimal | Costo de esta variante |
| precio | decimal | Precio de esta variante |

Relaciones: pertenece a producto, tiene muchos movimientos_stock.

#### movimientos_stock
Registro de todo movimiento de inventario.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| producto_id | UUID | FK a productos |
| variante_id | UUID | FK a variantes (nullable) |
| tipo | enum | entrada, salida, ajuste, devolucion |
| cantidad | integer | Unidades (positivo o negativo) |
| motivo | string | Descripción del motivo |
| referencia_tipo | string | pedido, compra, ajuste_manual |
| referencia_id | UUID | ID del pedido/compra que origina |
| usuario_id | UUID | Quién hizo el movimiento |
| created_at | timestamp | Fecha del movimiento |

Relaciones: pertenece a producto, pertenece a variante, pertenece a usuario.

#### tareas
Cada paso operativo dentro de un pedido o independiente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| pedido_id | UUID | FK a pedidos (nullable) |
| plantilla_tarea_id | UUID | FK a plantillas (nullable) |
| titulo | string | Nombre de la tarea |
| descripcion | text | Detalle |
| estado | enum | pendiente, en_proceso, terminada, bloqueada |
| responsable_id | UUID | FK a usuarios |
| area | enum | diseño, operaciones, armado, logistica, admin |
| orden | integer | Orden dentro del flujo del pedido |
| fecha_limite | timestamp | Deadline |
| depende_de | UUID[] | IDs de tareas que deben completarse antes |
| completada_por | UUID | Quién la completó |
| completada_en | timestamp | Cuándo se completó |
| created_at | timestamp | Creación |

Relaciones: pertenece a pedido, pertenece a usuario (responsable), tiene muchas subtareas, tiene muchos comentarios.
Observación funcional: las dependencias son clave. Si una tarea tiene depende_de, su estado no puede pasar a en_proceso hasta que todas las tareas referenciadas estén terminadas.

#### subtareas
Descomposición de tareas complejas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| tarea_id | UUID | FK a tareas |
| titulo | string | Nombre |
| completada | boolean | Si está hecha |
| orden | integer | Orden de ejecución |

#### usuarios
Personas que usan el sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| nombre | string | Nombre completo |
| email | string | Email (login) |
| rol | enum | admin, operaciones, diseño, armado, logistica, contabilidad |
| activo | boolean | Si puede loguearse |
| avatar_url | string | Foto de perfil |

#### proveedores
Proveedores externos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| nombre | string | Nombre o razón social |
| contacto | string | Persona de contacto |
| email | string | Email |
| telefono | string | Teléfono |
| tipo_servicio | string | Qué provee (stickers, eco cuero, costura, etc.) |
| condicion_pago | string | Cómo se le paga |
| tiempo_entrega_dias | integer | Tiempo habitual de entrega |
| calificacion | integer | 1-5, calidad/cumplimiento |
| notas | text | Observaciones |

Relaciones: tiene muchas compras, tiene muchas tareas asociadas.

#### compras
Órdenes de compra a proveedores.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| proveedor_id | UUID | FK a proveedores |
| pedido_id | UUID | FK a pedidos (nullable, si es compra contra pedido) |
| estado | enum | borrador, enviada, confirmada, recibida_parcial, recibida, cancelada |
| fecha_pedido | date | Cuándo se hizo el pedido |
| fecha_esperada | date | Cuándo se espera recibir |
| fecha_recibida | date | Cuándo se recibió efectivamente |
| monto_total | decimal | Monto de la compra |
| notas | text | Observaciones |

Relaciones: pertenece a proveedor, tiene muchos items_compra, puede pertenecer a un pedido.

#### items_compra
Detalle de cada compra.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| compra_id | UUID | FK a compras |
| descripcion | string | Qué se compra |
| producto_id | UUID | FK a productos (nullable) |
| cantidad | integer | Cantidad |
| precio_unitario | decimal | Precio por unidad |
| cantidad_recibida | integer | Cuánto llegó efectivamente |

#### pagos
Registro de cada pago recibido o realizado.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| tipo | enum | cobro, pago_proveedor, gasto |
| pedido_id | UUID | FK a pedidos (nullable) |
| compra_id | UUID | FK a compras (nullable) |
| cliente_id | UUID | FK a clientes (nullable) |
| proveedor_id | UUID | FK a proveedores (nullable) |
| monto | decimal | Monto del pago |
| metodo | string | Transferencia, efectivo, MercadoPago, etc. |
| concepto | enum | seña, saldo, pago_total, gasto_operativo |
| comprobante_url | string | Link al comprobante |
| fecha | date | Fecha del pago |
| notas | text | Observaciones |

#### remitos
Documento de entrega.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| pedido_id | UUID | FK a pedidos |
| numero | string | Número de remito |
| fecha | date | Fecha de emisión |
| tipo_entrega | enum | envio, retiro |
| datos_envio | jsonb | Correo, tracking, dirección |
| firmado | boolean | Si el cliente firmó recepción |
| pdf_url | string | Link al remito generado |

#### historial_pedido
Log inmutable de cada acción sobre un pedido.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| pedido_id | UUID | FK a pedidos |
| usuario_id | UUID | FK a usuarios (nullable si es automático) |
| accion | string | Descripción de la acción |
| estado_anterior | string | Estado previo |
| estado_nuevo | string | Estado posterior |
| datos | jsonb | Datos adicionales de contexto |
| created_at | timestamp | Cuándo ocurrió |

#### comentarios
Comentarios internos en pedidos y tareas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| entidad_tipo | string | pedido, tarea |
| entidad_id | UUID | ID del pedido o tarea |
| usuario_id | UUID | Quién comentó |
| contenido | text | Texto del comentario |
| created_at | timestamp | Cuándo se escribió |

#### archivos
Archivos adjuntos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| entidad_tipo | string | pedido, tarea, cliente |
| entidad_id | UUID | A qué se adjunta |
| nombre | string | Nombre del archivo |
| url | string | URL en storage |
| tipo_mime | string | Tipo de archivo |
| subido_por | UUID | FK a usuarios |
| created_at | timestamp | Cuándo se subió |

#### notificaciones
Registro de notificaciones enviadas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| tipo | enum | interna, email_cliente, whatsapp |
| destinatario | string | Email, teléfono o user_id |
| asunto | string | Título |
| contenido | text | Cuerpo del mensaje |
| plantilla_id | string | Plantilla usada |
| pedido_id | UUID | Pedido relacionado (nullable) |
| enviada | boolean | Si se envió correctamente |
| created_at | timestamp | Cuándo se envió |

#### manuales
Documentación interna de procedimientos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| titulo | string | Nombre del manual |
| contenido | text | Cuerpo en markdown o rich text |
| categoria | string | Sector o proceso |
| area | enum | general, diseño, operaciones, armado, logistica |
| version | integer | Número de versión |
| activo | boolean | Si es la versión vigente |
| updated_at | timestamp | Última actualización |

#### plantillas_tarea
Templates de tareas que se generan automáticamente según tipo de pedido.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| tipo_pedido | enum | estandar, personalizado |
| titulo | string | Nombre de la tarea |
| area | enum | diseño, operaciones, armado, logistica |
| responsable_rol | enum | Rol por defecto |
| orden | integer | Orden en el flujo |
| depende_de_orden | integer[] | Órdenes de tareas previas |
| es_obligatoria | boolean | Si se puede saltar o no |

Observación funcional: Cuando se crea un pedido y se habilita, el sistema lee las plantillas del tipo correspondiente y genera las tareas concretas con sus dependencias.

#### gastos
Registro de gastos operativos no vinculados a compras.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| categoria | string | Alquiler, servicios, insumos varios, etc. |
| descripcion | string | Detalle |
| monto | decimal | Monto |
| fecha | date | Fecha del gasto |
| comprobante_url | string | Archivo adjunto |
| recurrente | boolean | Si se repite mensualmente |

#### costos_pedido
Consolidación de costos por pedido para análisis de rentabilidad.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | PK |
| pedido_id | UUID | FK a pedidos |
| costo_productos | decimal | Costo de materia prima |
| costo_insumos | decimal | Packaging, etiquetas, etc. |
| costo_tercerizados | decimal | Olga, Gerardo, Masterprint |
| costo_envio | decimal | Envío (si lo absorbe la empresa) |
| costo_total | decimal | Suma de todos |
| precio_venta | decimal | Monto facturado |
| margen_bruto | decimal | precio_venta - costo_total |
| margen_porcentaje | decimal | (margen / precio_venta) × 100 |

---

## 6. ROLES Y PERMISOS

### 6.1 Definición de roles

**Administradora / Dueña (Sheila)**
- Acceso total a todos los módulos
- Dashboard gerencial con KPIs financieros
- Configuración del sistema
- Gestión de usuarios y roles
- Aprobación de gastos y compras
- Reportes de rentabilidad
- Estado de resultados

**Operaciones**
- Ver y gestionar pedidos asignados
- Completar tareas de pre-armado y armado
- Registrar recepción de insumos
- Comentar en pedidos
- Ver stock (no modificar manualmente)
- Ver sus propias tareas y las del equipo

**Diseño Gráfico (Yare)**
- Ver pedidos personalizados asignados
- Completar tareas de diseño
- Subir archivos de diseño a pedidos
- Marcar diseños como enviados a proveedores
- No ve información financiera

**Armado**
- Ver pedidos en estado "listo para armar" y "en armado"
- Completar checklist de armado
- Marcar pedidos como armados
- No ve información financiera ni de costos

**Logística**
- Ver pedidos listos para despacho
- Generar remitos
- Registrar envíos y tracking
- Marcar como despachado
- Gestionar retiros en oficina

**Contabilidad / Administración**
- Ver y registrar pagos
- Ver cuentas a cobrar y a pagar
- Registrar gastos
- Ver reportes financieros
- Estado de resultados
- No modifica pedidos ni tareas operativas

**Cliente (portal externo)**
- Ver estado de sus propios pedidos (solo estado público)
- Ver si tiene saldo pendiente
- Ver datos de envío/tracking
- No ve información interna, costos, ni comentarios del equipo

**Proveedor externo (futuro, opcional)**
- Ver órdenes de compra que le corresponden
- Confirmar recepción de pedido
- Informar fecha de entrega estimada

### 6.2 Matriz de permisos resumida

| Módulo | Admin | Operaciones | Diseño | Armado | Logística | Contabilidad | Cliente |
|--------|-------|-------------|--------|--------|-----------|-------------|---------|
| Dashboard | Completo | Operativo | Propio | Propio | Propio | Financiero | — |
| Pedidos | CRUD | Ver + tareas | Ver asignados | Ver asignados | Ver despacho | Ver | Propios |
| Stock | CRUD | Ver | — | — | — | Ver | — |
| Compras | CRUD | Ver | — | — | — | Ver + pagos | — |
| Costos | CRUD | — | — | — | — | Ver | — |
| Finanzas | CRUD | — | — | — | — | CRUD | — |
| Tareas | CRUD | Propias | Propias | Propias | Propias | — | — |
| Clientes | CRUD | Ver | — | — | Ver | Ver | — |
| Proveedores | CRUD | Ver | — | — | — | Ver | — |
| Reportes | Todos | Operativos | — | — | Logística | Financieros | — |
| Config | Total | — | — | — | — | — | — |
| Manuales | CRUD | Ver | Ver | Ver | Ver | — | — |

---

## 7. INTEGRACIÓN CON TIENDA NUBE

### 7.1 Datos que deben bajar automáticamente desde Tienda Nube

- Pedidos nuevos: número, fecha, cliente, items, cantidades, precios, monto total, datos de envío, medio de pago, estado de pago
- Clientes: nombre, email, teléfono, dirección
- Productos y variantes: nombre, SKU, precio, stock (sincronización inicial)
- Cambios de estado de pago: cuando TN informa un pago aprobado

### 7.2 Datos que deben actualizarse hacia Tienda Nube

- Estado del pedido: empaquetado, enviado
- Número de tracking de envío
- Stock actualizado cuando hay movimientos internos
- Estado de fulfillment

### 7.3 Eventos que disparan automatizaciones

| Evento en TN | Acción en la app |
|--------------|-----------------|
| Nuevo pedido creado | Crear pedido interno, clasificar, notificar equipo |
| Pago aprobado | Actualizar estado de pago, habilitar pedido si corresponde |
| Pedido cancelado por cliente | Marcar como cancelado, liberar stock reservado |

| Evento en la app | Acción en TN |
|-------------------|-------------|
| Pedido marcado como empaquetado | Actualizar fulfillment en TN |
| Pedido marcado como enviado + tracking | Actualizar envío y tracking en TN |
| Ajuste de stock | Sincronizar stock en TN |

### 7.4 Implementación técnica

**Webhooks de Tienda Nube → App:** TN soporta webhooks para eventos de pedidos y pagos. La app debe exponer endpoints HTTPS que reciban estos webhooks, validen la firma y procesen el evento.

**App → API de Tienda Nube:** Usar la API REST de Tienda Nube para actualizar pedidos, stock y fulfillment. Requiere autenticación OAuth2.

**Sincronización de stock:** Mantener stock como fuente de verdad en la app interna. Sincronizar hacia TN periódicamente o en cada movimiento. Si TN también modifica stock (por ventas directas B2C si hubiera), usar reconciliación periódica.

### 7.5 Qué mantener solo en la app interna

- Estados internos detallados del pedido (TN solo ve estados simples)
- Tareas operativas y checklist
- Comentarios internos
- Costos y márgenes
- Información de proveedores y compras
- Manuales de procedimiento
- KPIs y reportes gerenciales

### 7.6 Advertencia práctica

La API de Tienda Nube tiene rate limits y algunas limitaciones en qué campos se pueden actualizar. Antes de desarrollar, hay que verificar la documentación actualizada de la API para confirmar que los endpoints necesarios existen y funcionan como se espera. No asumir capacidades mágicas.

---

## 8. EXPERIENCIA DEL CLIENTE (Portal de seguimiento)

### 8.1 Acceso

El cliente accede con un link único por pedido (sin necesidad de crear cuenta). El link se envía por email o WhatsApp cuando el pedido es confirmado. Formato: `tuserpedidos.com/seguimiento/CODIGO_UNICO`

Alternativa más avanzada: login con email + código de verificación para ver todos sus pedidos.

### 8.2 Información visible

**Encabezado:**
- Logo de la empresa
- Número de pedido
- Fecha del pedido
- Nombre del cliente

**Estado actual del pedido (barra de progreso visual):**
1. Recibido ✓
2. En producción ○ (activo)
3. En preparación ○
4. Listo para envío ○
5. Enviado ○

**Detalle del estado:**
- Si está en diseño: "Tu pedido personalizado está siendo diseñado por nuestro equipo"
- Si falta pago: "Para continuar con tu pedido, necesitamos que completes el pago del saldo. Contactanos al [WhatsApp]"
- Si está listo: "¡Tu pedido está listo! Te avisamos apenas lo despachemos"
- Si fue enviado: "Tu pedido fue despachado el [fecha]. Número de seguimiento: [tracking]. Podés rastrearlo en [link]"
- Si es retiro: "Tu pedido está listo para retirar en nuestra oficina. Dirección: [dirección]. Horario: [horario]"

**Datos de envío** (cuando aplica):
- Método de envío
- Número de tracking con link al correo
- Estado del envío

### 8.3 Diseño

Página simple, mobile-first, sin necesidad de login complejo. Colores de la marca. Carga rápida. Sin información innecesaria. Profesional pero cálido.

---

## 9. MÓDULO DE COSTOS Y RENTABILIDAD

### 9.1 Estructura de costos por producto

Cada producto tiene una ficha de costo con:
- Costo de materia prima (textil, material base)
- Costo de insumos (etiquetas, stickers, eco cuero, madera)
- Costo de tercerización (costura de Olga, impresión de Masterprint, trabajo de Gerardo)
- Costo de packaging (caja, pluribol, tarjetón, cartel)
- Costo de mano de obra interna (opcional, si se quiere imputar horas)

El costo total del producto = suma de todos los componentes.

### 9.2 Costo por pedido

El sistema calcula automáticamente:
- Costo de productos: sumatoria de (costo unitario × cantidad) para cada item
- Costo de insumos adicionales: si hay packaging especial, etc.
- Costo de tercerización: cargado desde las compras vinculadas al pedido
- Costo de envío: si la empresa absorbe el flete

**Costo total del pedido** = productos + insumos + tercerización + envío

### 9.3 Margen por pedido

- Margen bruto = Precio de venta - Costo total
- Margen % = (Margen bruto / Precio de venta) × 100

El sistema marca visualmente los pedidos con margen bajo (ej: menos del 30%) y los pedidos con margen negativo (pérdida).

### 9.4 Análisis de rentabilidad

**Por cliente:** Promedio de margen de todos los pedidos de un cliente. Permite identificar clientes rentables y no rentables.

**Por línea de producto:** Margen promedio agrupado por categoría de producto. Permite decidir qué productos empujar y cuáles rediseñar o discontinuar.

**Por período:** Evolución mensual de márgenes. Permite detectar si la rentabilidad mejora o empeora.

### 9.5 Vinculación con estado de resultados

Los costos de cada pedido alimentan el rubro "Costo de mercadería vendida" del estado de resultados. Los gastos operativos se cargan aparte. La diferencia da el resultado operativo del período.

---

## 10. MÓDULO CONTABLE Y FINANCIERO

### 10.1 Aclaración importante

Este módulo NO reemplaza a un contador ni a un sistema contable formal. Es un módulo de gestión financiera gerencial para que la dueña tenga visibilidad del flujo de dinero y las cuentas del negocio sin depender de un Excel.

### 10.2 Cuentas a cobrar

- Lista de pedidos con saldo pendiente
- Antigüedad de la deuda (0-7 días, 7-15, 15-30, +30)
- Estado de cada cuenta: al día, en mora, en gestión
- Acciones rápidas: enviar recordatorio, registrar pago

### 10.3 Registro de pagos

- Anticipos / señas
- Pagos parciales
- Pago de saldo
- Cada pago se vincula a un pedido y un cliente
- Método de pago: transferencia, MercadoPago, efectivo
- Comprobante adjunto

### 10.4 Cuentas a pagar

- Compras a proveedores pendientes de pago
- Gastos operativos pendientes
- Vencimientos próximos

### 10.5 Gastos operativos

Registro categorizado de gastos:
- Alquiler
- Servicios (luz, internet, teléfono)
- Sueldos / retiros
- Insumos de oficina
- Gastos de envío
- Gastos de marketing
- Impuestos y tasas
- Otros

### 10.6 Flujo de caja simplificado

Vista mensual de:
- Ingresos del mes (cobros recibidos)
- Egresos del mes (pagos a proveedores + gastos)
- Saldo del período
- Saldo acumulado

### 10.7 Estado de resultados gerencial

| Concepto | Monto |
|----------|-------|
| Ventas del período | $ |
| (-) Costo de mercadería vendida | $ |
| = Margen bruto | $ |
| (-) Gastos operativos | $ |
| (-) Gastos de envío | $ |
| (-) Tercerización | $ |
| = Resultado operativo | $ |
| (-) Impuestos estimados | $ |
| = Resultado neto estimado | $ |

Generado automáticamente a partir de los datos cargados en el sistema. No reemplaza un balance contable formal pero da visibilidad real al negocio.

---

## 11. REPORTES Y KPIs

### 11.1 KPIs operativos

- Pedidos ingresados (por día/semana/mes)
- Pedidos pendientes por estado
- Pedidos trabados por pago
- Pedidos en diseño (solo personalizados)
- Pedidos en armado
- Tiempo promedio por etapa (de ingreso a habilitación, de habilitación a armado, de armado a despacho)
- Tiempo total promedio de un pedido (ingreso a entrega)
- Cumplimiento de fechas comprometidas (% de pedidos entregados en fecha)
- Tasa de reproceso o error

### 11.2 KPIs comerciales

- Ventas por cliente (monto y cantidad de pedidos)
- Ticket promedio por pedido
- Frecuencia de compra por cliente
- Distribución estándar vs. personalizado
- Clientes nuevos vs. recurrentes

### 11.3 KPIs financieros

- Facturación del mes
- Cobros efectivos vs. facturado
- Cuentas a cobrar total
- Margen bruto promedio
- Margen por línea de producto
- Gastos operativos sobre ventas
- Resultado operativo mensual

### 11.4 KPIs de stock y compras

- Productos con stock crítico
- Compras pendientes de recepción
- Compras vencidas (proveedor no entregó a tiempo)
- Rotación de stock por producto

### 11.5 KPIs de logística

- Pedidos entregados en el mes
- Pedidos retirados vs. enviados
- Tiempo promedio desde "listo para despacho" hasta "despachado"
- Incidencias de envío

---

## 12. MANUALES DE PROCEDIMIENTO

### 12.1 Estructura del módulo

Los manuales se organizan por área y proceso. Cada manual tiene:
- Título
- Área (operaciones, diseño, armado, logística, administración)
- Versión (con historial de cambios)
- Contenido en formato rich text o markdown
- Estado: vigente, en revisión, deprecado

### 12.2 Organización

Estructura sugerida:
- **General:** Cómo funciona el sistema, glosario de términos, política de la empresa
- **Operaciones:** Proceso de pre-armado paso a paso, cómo separar textiles, cómo resaltar items
- **Diseño:** Cómo diseñar stickers, cómo preparar archivos para Masterprint, cómo diseñar eco cuero
- **Armado:** Checklist de armado, cómo embalar, cómo pegar stickers, estándares de calidad
- **Logística:** Cómo generar etiqueta, cómo preparar retiro, cómo completar remito
- **Administración:** Cómo registrar un pago, cómo cargar un gasto, cómo generar un reporte

### 12.3 Vinculación con tareas

Cada tarea del sistema puede tener un link al manual correspondiente. Cuando un operador abre una tarea que no sabe cómo hacer, puede tocar "Ver procedimiento" y le abre el manual.

### 12.4 Capacitación de gente nueva

Cuando se suma alguien al equipo, se le asigna un rol y automáticamente tiene acceso a los manuales de su área. Se puede crear un "recorrido de onboarding" que es una secuencia de manuales que la persona debe leer y marcar como leídos.

### 12.5 Utilidad real

Para que los manuales sirvan de verdad, hay que mantenerlos actualizados. El sistema debería tener una fecha de revisión sugerida (ej: cada 3 meses) y alertar cuando un manual no se revisa hace tiempo.

---

## 13. PROPUESTA DE MVP

### Etapa 1 — MVP (Semanas 1-8)

**Objetivo:** Reemplazar Notion y las planillas. Tener el flujo de pedidos funcionando end-to-end.

**Módulos incluidos:**
- Pedidos (ingreso manual + integración básica con TN vía webhook)
- Tareas operativas (generación automática por tipo, checklist, estados, dependencias)
- Vista Kanban de pedidos por estado
- Clientes (ficha básica, importada de TN)
- Pagos (registro básico de señas y saldos)
- Dashboard operativo (pedidos por estado, alertas de pago)
- Usuarios y roles básicos (admin, operaciones, diseño)
- Portal de seguimiento del cliente (versión simple con link único)

**No incluye todavía:** Stock detallado, compras, costos, contabilidad, reportes avanzados, manuales, módulo de calidad.

### Etapa 2 — Consolidación (Semanas 9-16)

**Módulos que se agregan:**
- Stock (productos, variantes, movimientos, alertas)
- Compras (órdenes a proveedores, recepción, vinculación con pedidos)
- Proveedores (fichas, historial)
- Logística (remitos, tracking, gestión de envíos)
- Sincronización bidireccional con Tienda Nube (stock, estados, tracking)
- Reportes operativos básicos
- Notificaciones automáticas al cliente (email/WhatsApp)

### Etapa 3 — Inteligencia del negocio (Semanas 17-24)

**Módulos que se agregan:**
- Costos y rentabilidad (fichas de costo, margen por pedido/cliente/producto)
- Contabilidad gerencial (cuentas a cobrar/pagar, flujo de caja, estado de resultados)
- Reportes avanzados y KPIs
- Manuales de procedimiento
- Calendario operativo
- Módulo de calidad / incidencias
- Dashboard gerencial para la dueña

### Funcionalidades imprescindibles vs. deseables

| Imprescindible (MVP) | Deseable (futuro) |
|----------------------|-------------------|
| Ingreso de pedidos desde TN | Sincronización bidireccional de stock |
| Clasificación estándar/personalizado | Generación automática de remitos PDF |
| Generación automática de tareas | Módulo de costos con fichas de producto |
| Checklist con estados y dependencias | Estado de resultados gerencial |
| Registro de pagos/señas | Manuales de procedimiento |
| Alertas de pago pendiente | Módulo de calidad/incidencias |
| Vista Kanban | Calendario operativo |
| Portal del cliente (link de seguimiento) | Login del cliente con todos sus pedidos |
| Historial de acciones por pedido | Reportes de rentabilidad |
| Roles básicos | Integración con WhatsApp Business |

---

## 14. PROPUESTA DE STACK TECNOLÓGICO

### 14.1 Recomendación principal

La propuesta de React + Next.js + Supabase + Vercel que mencionás tiene mucho sentido para este caso. Es moderna, escalable, tiene costo bajo de arranque y buen ecosistema.

**Frontend: Next.js (App Router) con React**
- Por qué: SSR para el portal del cliente (SEO y performance), rutas API integradas para webhooks de TN, despliegue simple en Vercel
- UI: Tailwind CSS + shadcn/ui (componentes profesionales, bien diseñados, personalizables)
- Estado: Zustand o React Query para estado del cliente
- Alternativa viable: Vite + React si no necesitás SSR. Pero Next.js es más completo para este caso porque el portal del cliente se beneficia del SSR

**Backend: Next.js API Routes + Supabase**
- Por qué Supabase: base de datos PostgreSQL real (no NoSQL como Firebase), autenticación integrada, storage para archivos, Row Level Security para permisos, funciones Edge para lógica de negocio, webhooks, realtime para actualizaciones en vivo
- Por qué no Firebase: Firestore es NoSQL y este sistema tiene relaciones complejas entre entidades (pedidos → tareas → dependencias, compras → proveedores → pedidos). PostgreSQL es mucho más natural para este modelo de datos

**Base de datos: PostgreSQL (vía Supabase)**
- Modelo relacional es el correcto para este dominio
- Supabase da PostgreSQL completo con extensiones, funciones, triggers
- Row Level Security para que cada rol solo vea lo que le corresponde

**Autenticación: Supabase Auth**
- Email + password para usuarios internos
- Link mágico (magic link) para el portal del cliente
- Roles gestionados con metadata del usuario

**Hosting: Vercel**
- Deploy automático desde GitHub
- Funciones serverless para API routes
- CDN global para performance
- Plan gratuito generoso para arrancar
- Costo razonable al escalar

**Almacenamiento de archivos: Supabase Storage**
- Diseños, comprobantes, logos, adjuntos
- Buckets separados por tipo: diseños, comprobantes, logos

**Notificaciones:**
- Email: Resend (API simple, buen plan gratuito, templates con React Email)
- WhatsApp: API oficial de WhatsApp Business o proveedor como Twilio (para notificaciones al cliente)
- Push internas: Supabase Realtime para notificaciones in-app

**Integraciones:**
- Tienda Nube API: REST, OAuth2, webhooks
- Correo argentino / OCA / Andreani: APIs de tracking si están disponibles

### 14.2 Costos estimados de infraestructura (arranque)

| Servicio | Plan | Costo mensual |
|----------|------|---------------|
| Supabase | Free / Pro | USD 0-25 |
| Vercel | Free / Pro | USD 0-20 |
| Resend | Free tier | USD 0 |
| Dominio | .com.ar | USD 5/año |
| **Total arranque** | | **USD 0-50/mes** |

Esto es viable para una pyme argentina. El costo crece solo si crece el volumen de datos y usuarios.

### 14.3 Alternativa si prefieren algo más "llave en mano"

Si la complejidad de desarrollo propio resulta excesiva, una alternativa intermedia sería armar el sistema sobre Airtable o Notion con automatizaciones de Make/Zapier conectadas a Tienda Nube. Pierde flexibilidad y escala pero puede funcionar como paso intermedio antes de invertir en desarrollo custom. Sin embargo, para la complejidad de este negocio (dependencias de tareas, estados complejos, portal del cliente), la app custom es la mejor opción a mediano plazo.

---

## 15. DISEÑO DE INTERFAZ Y UX

### 15.1 Navegación

**Sidebar izquierdo fijo** con:
- Logo de la empresa arriba
- Ícono + texto de cada módulo
- Collapse a solo íconos en pantallas chicas
- Badge con contadores en módulos con pendientes (ej: Pedidos 12, Tareas 5)
- Acceso rápido al perfil y configuración abajo

### 15.2 Layout general

- Header con: barra de búsqueda global, botón de notificaciones (campana con badge), botón de usuario
- Contenido principal al centro con breadcrumbs
- Sin sidebar derecho para maximizar espacio
- Responsive para tablet (el equipo de armado podría usar una tablet en el depósito)

### 15.3 Código de colores por estado

| Estado | Color | Ejemplo |
|--------|-------|---------|
| Nuevo | Azul claro | #3B82F6 |
| Pendiente de seña | Amarillo | #F59E0B |
| Habilitado / En proceso | Azul | #2563EB |
| Esperando (insumos/diseño) | Naranja | #F97316 |
| Listo para armar | Verde claro | #22C55E |
| En armado | Verde | #16A34A |
| Pendiente de saldo | Rojo claro | #EF4444 |
| Listo para despacho | Violeta | #8B5CF6 |
| Despachado | Gris | #6B7280 |
| Cerrado | Gris oscuro | #374151 |
| Cancelado | Rojo oscuro | #991B1B |

### 15.4 Principios de UX

- **Mobile-friendly pero desktop-first:** El equipo opera principalmente desde computadoras, pero el portal del cliente debe ser mobile-first
- **Acciones frecuentes accesibles:** Los botones de "marcar tarea como completa", "registrar pago", "cambiar estado" deben estar a un clic, no enterrados en menús
- **Feedback inmediato:** Cuando alguien completa una tarea, el checklist se actualiza visualmente al instante
- **Filtros y búsqueda rápida:** En la vista de pedidos, poder filtrar por estado, tipo, cliente, prioridad, fecha. Búsqueda por número de pedido o nombre de cliente
- **Carga rápida:** Skeleton loaders mientras cargan datos. Paginación para listas largas. No cargar todo de golpe
- **Personas no técnicas:** Labels claros en español, sin jerga técnica. Tooltips explicativos. Confirmación antes de acciones destructivas. Navegación intuitiva

### 15.5 Vistas clave a diseñar

1. Dashboard operativo (la home del sistema)
2. Lista de pedidos con filtros
3. Kanban de pedidos
4. Detalle de pedido (la vista más compleja: info, items, tareas, pagos, historial, archivos, comentarios)
5. Lista de tareas del usuario
6. Portal del cliente
7. Registro de pago
8. Estado de resultados

---

## 16. RIESGOS, ERRORES Y PUNTOS CIEGOS

### 16.1 Riesgos operativos

**Dependencia de una sola persona para la clasificación de pedidos.** Hoy parece que Sheila decide qué es estándar y qué es personalizado. Si ella no está, el equipo se frena. Solución: el sistema debe clasificar automáticamente por reglas y solo pedir intervención humana en casos ambiguos.

**Proveedores externos sin visibilidad.** Gerardo, Masterprint y Olga son puntos ciegos. No sabés si van a cumplir hasta que cumplen (o no). Solución: el sistema debe rastrear los tiempos históricos de cada proveedor y alertar cuando un proveedor supera su tiempo habitual de entrega.

**Concentración de conocimiento tácito.** Mucho del "cómo se hace" está en la cabeza de las personas. Si alguien se va, se pierde información operativa. Solución: los manuales de procedimiento no son opcionales, son infraestructura crítica.

### 16.2 Errores comunes al desarrollar

**Querer hacer todo de una.** El mayor riesgo es intentar desarrollar los 17 módulos juntos. Va a tardar meses, va a frustrar, y cuando termine ya cambió la operatoria. El MVP es sagrado: pedidos + tareas + pagos básicos + portal del cliente. Lo demás se suma después.

**Diseñar la app sin usarla.** Hay que poner la app en producción lo antes posible, aunque tenga solo 3 módulos. Los bugs y las mejoras solo aparecen con uso real.

**No definir bien las reglas de negocio antes de programar.** Preguntas que hay que responder antes de escribir código: ¿qué porcentaje de seña habilita un pedido? ¿Quién decide la prioridad? ¿Cuántos días se espera un pago antes de cancelar? ¿Qué pasa si un proveedor no entrega? ¿Se puede armar parcialmente un pedido?

**Complejizar la UX.** Para personas que hoy usan Notion y WhatsApp, una app con 15 menús y 8 tipos de filtros es un shock. Hay que introducir complejidad gradualmente.

### 16.3 Procesos flojos o ambiguos

- No está claro quién asigna prioridades ni con qué criterio
- No hay definición formal de "fecha comprometida" — ¿se la pone el sistema, el cliente, o la dueña?
- El proceso de "notificar al cliente" es vago — ¿email automático? ¿WhatsApp manual? ¿Quién lo hace?
- No hay proceso de devoluciones ni de reclamos
- No está definido qué pasa si un pedido lleva más de 30 días sin pagarse
- El proceso de diseño gráfico no tiene deadline ni proceso de aprobación formal del cliente

### 16.4 Cosas que conviene resolver con proceso antes que con software

- Definir tiempos estándar por tipo de pedido (SLA interno)
- Establecer política formal de pagos: qué % de seña, plazo para saldo, consecuencias del impago
- Definir criterios de prioridad (no puede ser discrecional siempre)
- Acordar con proveedores plazos formales y consecuencias de incumplimiento
- Definir quién es responsable de cada etapa (matriz RACI)
- Establecer un proceso de aprobación de diseño con el cliente (cuántas revisiones, en qué plazo)

---

## 17. PROPUESTA FINAL

### Arquitectura recomendada

La aplicación es un backoffice operativo web con portal de seguimiento para clientes, conectado bidireccionalmente con Tienda Nube.

**Stack:** Next.js + Supabase + Vercel + Resend
**Base de datos:** PostgreSQL (Supabase)
**Autenticación:** Supabase Auth
**Almacenamiento:** Supabase Storage

### Módulos definitivos (en orden de prioridad)

**Core (MVP):**
1. Pedidos (con clasificación, estados, historial)
2. Tareas operativas (generación automática, dependencias, checklist)
3. Pagos básicos (señas, saldos, alertas)
4. Dashboard operativo
5. Usuarios y roles
6. Portal de seguimiento del cliente

**Nivel 2:**
7. Stock y movimientos
8. Compras y proveedores
9. Logística y envíos
10. Integración bidireccional TN completa
11. Notificaciones automáticas

**Nivel 3:**
12. Costos y rentabilidad
13. Contabilidad gerencial
14. Reportes y KPIs avanzados
15. Manuales de procedimiento
16. Calidad e incidencias
17. Calendario operativo

### Próximos pasos concretos

1. **Definir reglas de negocio** antes de programar: política de pagos, SLAs, criterios de prioridad, proceso de aprobación de diseño, roles y responsables exactos
2. **Diseñar wireframes** de las 5 vistas clave: dashboard, lista de pedidos, detalle de pedido (con tareas), registro de pago, portal del cliente
3. **Configurar el proyecto:** crear repo en GitHub, setup de Next.js + Supabase, estructura de carpetas, sistema de diseño con shadcn/ui
4. **Crear las tablas** de la base de datos (modelo de datos de la sección 5, empezando por las del MVP)
5. **Integrar webhook de TN** para ingreso automático de pedidos
6. **Desarrollar el flujo completo de un pedido** end-to-end: desde que entra hasta que se despacha
7. **Poner en producción** con el equipo real usando la app para 5-10 pedidos
8. **Iterar** basándose en feedback real

---

## APÉNDICE A: MAPA GENERAL DEL SISTEMA

```
┌─────────────────────────────────────────────────────┐
│                   TIENDA NUBE                        │
│              (E-commerce mayorista)                   │
└──────────────────────┬──────────────────────────────┘
                       │ Webhooks + API REST
                       ▼
┌─────────────────────────────────────────────────────┐
│              SISTEMA SER MAYORISTA                   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ PEDIDOS  │──│  TAREAS  │──│  OPERACIONES     │   │
│  │          │  │          │  │  (Kanban/Lista)   │   │
│  └────┬─────┘  └──────────┘  └──────────────────┘   │
│       │                                              │
│  ┌────┴─────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ CLIENTES │  │  STOCK   │──│  COMPRAS         │   │
│  │          │  │          │  │  + PROVEEDORES    │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  PAGOS   │  │ COSTOS / │  │  REPORTES        │   │
│  │          │  │ FINANZAS │  │  + KPIs           │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │LOGÍSTICA │  │ MANUALES │  │  CONFIGURACIÓN   │   │
│  │ ENVÍOS   │  │          │  │  + USUARIOS       │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
│                                                      │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│           PORTAL DE SEGUIMIENTO CLIENTE              │
│          (Vista pública simplificada)                 │
└─────────────────────────────────────────────────────┘
```

---

## APÉNDICE B: FLUJO RESUMIDO — PEDIDO PERSONALIZADO

```
INGRESO (webhook TN)
    │
    ▼
CLASIFICACIÓN → tipo: PERSONALIZADO
    │
    ▼
¿SEÑA RECIBIDA?
    │
    ├─ NO → PENDIENTE DE SEÑA → notificar → esperar
    │
    ├─ SÍ ▼
    │
HABILITADO → Generar tareas automáticas
    │
    ├── DISEÑO ──────────────────┐
    │   ├─ Diseñar stickers      │
    │   ├─ Diseñar eco cuero     │
    │   ├─ Enviar a Masterprint  │
    │   └─ Enviar a Gerardo      │
    │                            │
    ├── PRE-ARMADO ──────────────┤
    │   ├─ Imprimir detalle      │
    │   ├─ Separar textiles      │
    │   ├─ Resaltar con color    │
    │   ├─ Guardar               │
    │   └─ Pegar cartel          │
    │                            │
    ├── PROVEEDORES ─────────────┤
    │   ├─ Recibir stickers      │
    │   ├─ Enviar a Olga         │
    │   └─ Recibir de Olga       │
    │                            │
    └── (todo completo) ─────────┘
              │
              ▼
    LISTO PARA ARMAR
              │
              ▼
    ARMADO (pegar, embalar, cerrar)
              │
              ▼
    ¿PAGO COMPLETO?
    ├─ NO → PENDIENTE SALDO → notificar → esperar
    ├─ SÍ ▼
    │
    LISTO PARA DESPACHO
              │
    ┌─────────┴─────────┐
    │                   │
  ENVÍO            RETIRO
    │                   │
    ▼                   ▼
  DESPACHADO       ENTREGADO
    │                   │
    └─────────┬─────────┘
              │
              ▼
           CERRADO
```

---

## APÉNDICE C: FLUJO RESUMIDO — PEDIDO ESTÁNDAR

```
INGRESO (webhook TN)
    │
    ▼
CLASIFICACIÓN → tipo: ESTÁNDAR
    │
    ▼
¿SEÑA RECIBIDA?
    │
    ├─ NO → PENDIENTE DE SEÑA → notificar
    │
    ├─ SÍ ▼
    │
HABILITADO → Generar tareas (solo pre-armado)
    │
    ├── PRE-ARMADO
    │   ├─ Imprimir detalle
    │   ├─ Separar textiles
    │   ├─ Resaltar con color
    │   ├─ Guardar
    │   └─ Pegar cartel
    │
    └── (todo completo)
              │
              ▼
    LISTO PARA ARMAR
              │
              ▼
    ARMADO (stickers SER, embalar, cerrar)
              │
              ▼
    ¿PAGO COMPLETO?
    ├─ NO → PENDIENTE SALDO
    ├─ SÍ → LISTO PARA DESPACHO
              │
              ▼
         DESPACHADO → CERRADO
```

---

## APÉNDICE D: FUNCIONALIDADES IMPRESCINDIBLES (MVP)

1. Ingreso de pedidos desde Tienda Nube (webhook)
2. Clasificación de pedidos: estándar vs. personalizado
3. Estados internos del pedido con transiciones controladas
4. Generación automática de tareas según tipo de pedido
5. Dependencias entre tareas (tarea B espera a tarea A)
6. Checklist visual por pedido con estados
7. Registro de pagos (señas y saldos)
8. Alerta de pago pendiente
9. Vista Kanban de pedidos por estado
10. Vista detalle del pedido con trazabilidad
11. Portal del cliente (link de seguimiento por pedido)
12. Roles básicos: admin, operaciones, diseño
13. Historial de acciones por pedido
14. Comentarios internos en pedidos
15. Archivos adjuntos (diseños, comprobantes)

---

## APÉNDICE E: FUNCIONALIDADES AVANZADAS (ETAPAS FUTURAS)

1. Sincronización bidireccional de stock con TN
2. Módulo de compras completo con órdenes y recepción
3. Fichas de costo por producto con margen automático
4. Estado de resultados gerencial mensual
5. Reportes de rentabilidad por cliente y línea de producto
6. Integración con WhatsApp Business para notificaciones
7. Generación automática de remitos en PDF
8. Calendario operativo con vista semanal
9. Módulo de calidad: registro de incidencias y reprocesos
10. Dashboard de KPIs financieros para la dueña
11. Login del cliente para ver todos sus pedidos históricos
12. Alertas por SLA vencido (tiempo prometido superado)
13. Comparación de precios por proveedor
14. Presupuesto mensual vs. ejecución real
15. App móvil simplificada para el equipo de armado (PWA)
16. Módulo de devoluciones con impacto en stock y costos
17. Automatización de emails por cambio de estado
18. Integración con MercadoPago para conciliación de cobros
19. Sistema de evaluación de proveedores
20. Manuales de procedimiento con sistema de onboarding

---

*Documento diseñado para SER Mayorista — Abril 2026*
*Este documento es un punto de partida vivo. Debe iterarse con el equipo antes y durante el desarrollo.*
