# Tienda Nube / Nuvemshop — Referencia de API para el Proyecto

**Versión de API:** 2025-03
**Base URL:** `https://api.tiendanube.com/2025-03/{store_id}/`
**Documentación oficial:** https://tiendanube.github.io/api-documentation/resources
**Autenticación:** OAuth 2 — Bearer token en header `Authentication: bearer ACCESS_TOKEN`
**Formato:** JSON (enviar y recibir)
**Rate limit:** 2 requests/segundo, ráfagas de hasta 40 requests (Leaky Bucket)
**Paginación:** `?page=1&per_page=200` (máx 200 por página). Header `x-total-count` para total.

---

## RECURSOS DISPONIBLES

La API expone las siguientes entidades con operaciones CRUD (salvo excepciones):

| Recurso | Relevancia para el proyecto |
|---------|---------------------------|
| Order | ⭐ CRÍTICO — pedidos |
| Product | ⭐ CRÍTICO — catálogo |
| Product Variant | ⭐ CRÍTICO — variantes y stock |
| Product Image | ALTA — imágenes de productos |
| Customer | ⭐ CRÍTICO — clientes |
| Category | ALTA — categorías de productos |
| Webhook | ⭐ CRÍTICO — eventos en tiempo real |
| Fulfillment Order | ⭐ CRÍTICO — envíos y tracking |
| Location | ALTA — ubicaciones de stock (multi-inventario) |
| Transaction | ALTA — transacciones de pago |
| Draft Order | MEDIA — pedidos manuales/borradores |
| Coupon | MEDIA — cupones de descuento |
| Discount | MEDIA — reglas de descuento |
| Cart | BAJA — carritos de compra |
| Abandoned Checkout | MEDIA — checkouts abandonados |
| Store | MEDIA — info de la tienda |
| Metafields | MEDIA — datos custom key-value por app |
| Custom Fields (Order/Product/Customer/Category) | MEDIA — campos personalizados |
| Shipping Carrier | BAJA — transportistas |
| Payment Provider / Payment Option | BAJA — medios de pago |
| Script | BAJA — scripts en el storefront |
| Blog / Pages | BAJA — contenido |
| Email Templates | BAJA — plantillas de email |
| Billing | BAJA — facturación de la app |
| Business Rules | BAJA — reglas de negocio shipping/payments |

---

## 1. ORDERS (Pedidos)

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/orders` | Listar todos los pedidos (con filtros) |
| GET | `/orders/{id}` | Obtener un pedido específico |
| POST | `/orders` | Crear un pedido vía API |
| PUT | `/orders/{id}` | Actualizar un pedido |
| GET | `/orders/{id}/history/values` | Historial de valores del pedido |
| GET | `/orders/{id}/history/editions` | Historial de ediciones del pedido |
| POST | `/orders/{id}/close` | Cerrar (archivar) un pedido |
| POST | `/orders/{id}/open` | Reabrir un pedido |
| POST | `/orders/{id}/cancel` | Cancelar un pedido |
| POST | `/orders/{id}/invoices` | Crear factura |
| GET | `/orders/{id}/invoices` | Leer factura |

### Filtros disponibles en GET /orders

| Parámetro | Descripción |
|-----------|-------------|
| since_id | Pedidos con ID mayor al indicado |
| status | "any" (default), "open", "closed", "cancelled" |
| channels | "store", "api", "form" (draft), "meli", "pos" |
| payment_status | "any", "pending", "authorized", "paid", "abandoned", "refunded", "voided" |
| shipping_status | "any", "unpacked", "unfulfilled", "fulfilled" |
| created_at_min / created_at_max | Rango de fecha de creación (ISO 8601) |
| updated_at_min / updated_at_max | Rango de fecha de actualización (ISO 8601) |
| total_min / total_max | Rango de monto total |
| customer_ids | IDs de clientes separados por coma |
| q | Búsqueda por número de pedido, nombre o email del cliente |
| app_id | Pedidos creados por una app específica |
| payment_methods | Filtrar por método de pago |
| aggregates | "fulfillment_orders" y/o "custom_fields" |
| page / per_page | Paginación |
| fields | Campos específicos a incluir en la respuesta |

### Propiedades principales del pedido

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| id | int | ID único del pedido (diferente de `number`) |
| number | int | Número secuencial visible al cliente (empieza en 100) |
| token | string | Token único del pedido |
| store_id | string | ID de la tienda |
| status | string | "open", "closed", "cancelled" |
| payment_status | string | "pending", "authorized", "paid", "partially_paid", "abandoned", "refunded", "partially_refunded", "voided" |
| shipping_status | string | "unpacked", "shipped"(=fulfilled), "unshipped"(=unfulfilled), "delivered", "partially_packed", "partially_fulfilled" |
| contact_email | string | Email del comprador |
| contact_name | string | Nombre del comprador |
| contact_phone | string | Teléfono |
| contact_identification | string | DNI/CUIT |
| subtotal | decimal | Subtotal sin envío |
| discount | decimal | Descuento aplicado |
| total | decimal | Total con envío y descuentos |
| total_usd | decimal | Total en USD |
| currency | string | Moneda (ISO 4217: "ARS", "USD", etc.) |
| gateway | string | ID del medio de pago |
| gateway_name | string | Nombre del medio de pago |
| shipping_address | object | Dirección de envío completa |
| billing_* | varios | Datos de facturación |
| note | string | Nota del cliente |
| owner_note | string | Nota del dueño de la tienda |
| coupon | array | Cupones aplicados |
| products | array | Productos del pedido (ver abajo) |
| customer | object | Datos del cliente (requiere scope read_customers) |
| storefront | string | Origen: "store", "api", "form", "meli", "pos" |
| paid_at | datetime | Fecha de pago |
| cancelled_at | datetime | Fecha de cancelación |
| closed_at | datetime | Fecha de cierre |
| created_at | datetime | Fecha de creación |
| updated_at | datetime | Última actualización |
| fulfillments | array | Fulfillment orders asociadas |
| extra | object | JSON con datos custom del checkout |
| total_paid_by_customer | decimal | Monto real pagado por el cliente |
| payment_details | object | Método, tarjeta, cuotas |

### Productos dentro del pedido (products[])

| Propiedad | Descripción |
|-----------|-------------|
| id | ID del line item (único dentro del pedido) |
| product_id | ID del producto |
| variant_id | ID de la variante |
| name | Nombre del producto al momento de la compra |
| price | Precio al momento de la compra |
| quantity | Cantidad comprada |
| weight / width / height / depth | Dimensiones |
| free_shipping | Si tiene envío gratis |
| properties | Campos personalizados |

### Pagar un pedido

No existe un endpoint directo para marcar como pagado. El pago se registra creando una Transaction con status "success" asociada al pedido.

### Límite de resultados

Las consultas están limitadas a 10.000 resultados. Si se excede, usar filtros de fecha para dividir.

---

## 2. PRODUCTS (Productos)

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/products` | Listar todos los productos |
| GET | `/products/{id}` | Obtener un producto |
| POST | `/products` | Crear un producto |
| PUT | `/products/{id}` | Actualizar un producto |
| DELETE | `/products/{id}` | Eliminar un producto |

### Filtros disponibles en GET /products

| Parámetro | Descripción |
|-----------|-------------|
| since_id | Productos después del ID indicado |
| language | Idioma de los campos multilingüe |
| q | Búsqueda por nombre |
| handle | Buscar por handle (slug URL) |
| category_id | Filtrar por categoría |
| published | true/false — publicados o no |
| free_shipping | true/false |
| created_at_min / created_at_max | Rango de fecha de creación |
| updated_at_min / updated_at_max | Rango de última actualización |
| sort_by | Ordenamiento: "user" (default), "price-ascending", "price-descending", "alpha-ascending", "alpha-descending", "created-at-ascending", "created-at-descending", "best-selling" |
| page / per_page | Paginación |
| fields | Campos a incluir |

### Propiedades principales del producto

| Propiedad | Descripción |
|-----------|-------------|
| id | ID único |
| name | Nombre (objeto multilingüe) |
| description | Descripción HTML (multilingüe) |
| handle | Slug de URL (multilingüe) |
| attributes | Hasta 3 atributos (ej: Color, Talle) |
| variants | Array de variantes |
| images | Array de imágenes |
| categories | Array de IDs de categorías |
| published | Si está publicado |
| free_shipping | Si tiene envío gratis |
| requires_shipping | Si requiere envío físico |
| tags | Etiquetas |
| brand | Marca |
| seo_title / seo_description | SEO |
| created_at / updated_at | Fechas |

### Notas importantes

- Máximo 100.000 productos por tienda
- Máximo 3 atributos por producto
- Máximo 1.000 variantes por producto
- Máximo 250 imágenes por producto
- Si se crea un producto sin variantes, existe una variante "virtual" para manejar precio y stock

---

## 3. PRODUCT VARIANTS (Variantes)

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/products/{product_id}/variants` | Listar variantes de un producto |
| GET | `/products/{product_id}/variants/{id}` | Obtener una variante |
| POST | `/products/{product_id}/variants` | Crear variante |
| PUT | `/products/{product_id}/variants/{id}` | Actualizar variante (precio, stock, etc.) |
| DELETE | `/products/{product_id}/variants/{id}` | Eliminar variante |

### Propiedades de la variante

| Propiedad | Descripción |
|-----------|-------------|
| id | ID único |
| product_id | ID del producto padre |
| image_id | ID de la imagen asociada |
| price | Precio (null = iniciar contacto en vez de checkout) |
| promotional_price | Precio de oferta |
| stock_management | true/false — si se trackea stock |
| stock | Cantidad en stock (null si stock_management=false) |
| sku | SKU único |
| barcode | GTIN / EAN / ISBN |
| mpn | Manufacturer Part Number |
| weight | Peso en kg |
| width / height / depth | Dimensiones en cm |
| values | Valores de los atributos (ej: ["Grande", "Rojo"]) |
| cost | Costo del producto (opcional) |
| age_group | Grupo etario (newborn, infant, toddler, kids, adult) |
| gender | Género (female, male, unisex) |
| created_at / updated_at | Fechas |

### Manejo de stock

- Para actualizar stock: `PUT /products/{product_id}/variants/{id}` con `{"stock": 25}`
- Para stock ilimitado: `{"stock": ""}` (string vacío)
- `stock_management` lo controla Tienda Nube automáticamente, no se puede cambiar vía API

---

## 4. PRODUCT IMAGES (Imágenes)

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/products/{product_id}/images` | Listar imágenes |
| GET | `/products/{product_id}/images/{id}` | Obtener imagen |
| POST | `/products/{product_id}/images` | Subir imagen |
| PUT | `/products/{product_id}/images/{id}` | Actualizar imagen |
| DELETE | `/products/{product_id}/images/{id}` | Eliminar imagen |

Se recomienda crear productos con máximo 9 imágenes en el endpoint de producto. Para más, usar el endpoint de imágenes separado.

---

## 5. CUSTOMERS (Clientes)

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/customers` | Listar clientes |
| GET | `/customers/{id}` | Obtener un cliente |
| POST | `/customers` | Crear cliente |
| PUT | `/customers/{id}` | Actualizar cliente |
| DELETE | `/customers/{id}` | Eliminar cliente |

### Propiedades principales

| Propiedad | Descripción |
|-----------|-------------|
| id | ID único |
| name | Nombre |
| email | Email |
| phone | Teléfono |
| identification | DNI/CUIT |
| billing_address / billing_city / billing_province / billing_country / billing_zipcode | Dirección de facturación |
| default_address | Dirección por defecto |
| total_spent / total_spent_currency | Gasto total acumulado |
| orders_count | Cantidad de pedidos |
| last_order_id | ID del último pedido |
| active | Si la cuenta está activa |
| created_at / updated_at | Fechas |

---

## 6. CATEGORIES (Categorías)

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/categories` | Listar categorías |
| GET | `/categories/{id}` | Obtener categoría |
| POST | `/categories` | Crear categoría |
| PUT | `/categories/{id}` | Actualizar categoría |
| DELETE | `/categories/{id}` | Eliminar categoría |

---

## 7. COUPONS (Cupones)

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/coupons` | Listar cupones |
| GET | `/coupons/{id}` | Obtener cupón |
| POST | `/coupons` | Crear cupón |
| PUT | `/coupons/{id}` | Actualizar cupón |
| DELETE | `/coupons/{id}` | Eliminar cupón |

Tipos de cupón: descuento porcentual, descuento fijo, envío gratis.

---

## 8. FULFILLMENT ORDERS (Envíos)

Un pedido puede tener múltiples envíos. Cada envío se modela como un Fulfillment Order.

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/orders/{order_id}/fulfillment-orders` | Listar fulfillments de un pedido |
| GET | `/orders/{order_id}/fulfillment-orders/{id}` | Obtener fulfillment |
| PATCH | `/orders/{order_id}/fulfillment-orders/{id}` | Actualizar estado |
| POST | `/orders/{order_id}/fulfillment-orders/{id}/tracking-events` | Crear evento de tracking |
| PUT | `/orders/{order_id}/fulfillment-orders/{id}/tracking-events/{event_id}` | Actualizar evento de tracking |
| DELETE | `/orders/{order_id}/fulfillment-orders/{id}/tracking-events/{event_id}` | Eliminar evento de tracking |

### Tipos de envío (shipping_type)

| Valor | Descripción |
|-------|-------------|
| ship | Envío a domicilio |
| pickup | Retiro en punto de retiro |
| non-shippable | Producto digital / sin envío físico |

### Estados del fulfillment

| Estado | Descripción |
|--------|-------------|
| UNPACKED | Sin empaquetar |
| PACKED | Empaquetado |
| SHIPPED | Enviado |
| DELIVERED | Entregado |

Para marcar como entregado, se recomienda crear un tracking event con status "delivered" en vez de cambiar el status directamente vía PATCH.

---

## 9. LOCATIONS (Ubicaciones / Multi-inventario)

Permite gestionar stock en múltiples ubicaciones (depósitos, tiendas físicas).

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/locations` | Listar ubicaciones |
| POST | `/locations` | Crear ubicación |
| PUT | `/locations/{id}` | Actualizar ubicación |
| DELETE | `/locations/{id}` | Eliminar ubicación |

Nota: API nueva de multi-inventario en rollout progresivo. Consultar a Tienda Nube para activarla.

---

## 10. TRANSACTIONS (Transacciones de pago)

Cada movimiento de dinero se modela como una Transaction.

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/orders/{order_id}/transactions` | Listar transacciones de un pedido |
| POST | `/orders/{order_id}/transactions` | Crear transacción |

Crear una transacción con status "success" marca el pedido como pagado automáticamente.

---

## 11. DRAFT ORDERS (Pedidos borrador)

Permite crear pedidos fuera del checkout (ventas por teléfono, WhatsApp, etc.).

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/draft_orders` | Listar borradores |
| GET | `/draft_orders/{id}` | Obtener borrador |
| POST | `/draft_orders` | Crear borrador |
| PUT | `/draft_orders/{id}` | Actualizar borrador |
| DELETE | `/draft_orders/{id}` | Eliminar borrador |
| POST | `/draft_orders/{id}/confirm` | Confirmar (convierte en pedido real) |

---

## 12. STORE (Tienda)

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/store` | Obtener info de la tienda |

Retorna: nombre, URL, email, idiomas, moneda, plan, logos, dominios, redes sociales, etc.

---

## 13. METAFIELDS (Datos custom por app)

Almacenamiento key-value por app. Útil para guardar configuraciones o datos custom vinculados a entidades.

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/{owner_resource}/{owner_id}/metafields` | Listar metafields |
| GET | `/{owner_resource}/{owner_id}/metafields/{id}` | Obtener metafield |
| POST | `/{owner_resource}/{owner_id}/metafields` | Crear metafield |
| PUT | `/{owner_resource}/{owner_id}/metafields/{id}` | Actualizar |
| DELETE | `/{owner_resource}/{owner_id}/metafields/{id}` | Eliminar |

`owner_resource` puede ser: store, products, orders, customers, etc.

---

## 14. ABANDONED CHECKOUTS (Checkouts abandonados)

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/checkouts` | Listar checkouts abandonados |
| GET | `/checkouts/{id}` | Obtener checkout abandonado |

Se crea automáticamente cuando un cliente llega al paso 2 del checkout pero no completa la compra.

---

## 15. WEBHOOKS

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/webhooks` | Listar webhooks registrados |
| GET | `/webhooks/{id}` | Obtener webhook |
| POST | `/webhooks` | Crear webhook |
| PUT | `/webhooks/{id}` | Actualizar webhook |
| DELETE | `/webhooks/{id}` | Eliminar webhook |

### Eventos disponibles

| Categoría | Eventos |
|-----------|---------|
| **Order** | `order/created`, `order/updated`, `order/paid`, `order/packed`, `order/fulfilled`, `order/cancelled`, `order/edited`, `order/pending`, `order/voided`, `order/unpacked`, `order/custom_fields_updated` |
| **Product** | `product/created`, `product/updated`, `product/deleted` |
| **Customer** | `customer/created`, `customer/updated`, `customer/deleted` |
| **Category** | `category/created`, `category/updated`, `category/deleted` |
| **App** | `app/uninstalled`, `app/suspended`, `app/resumed` |
| **Domain** | `domain/updated` |
| **Fulfillment Order** | `fulfillment_order/status_updated`, `fulfillment_order/tracking_event_created`, `fulfillment_order/tracking_event_updated`, `fulfillment_order/tracking_event_deleted` |
| **Location** | `location/created`, `location/updated`, `location/deleted` |
| **Subscription** | `subscription/updated` |
| **Product Variant** | `product_variant/custom_fields_updated` |
| **Order Custom Field** | `order_custom_field/created`, `order_custom_field/updated`, `order_custom_field/deleted` |

### Payload del webhook (POST a tu URL)

Todos los webhooks envían:
```json
{
  "store_id": 123456,
  "event": "order/created",
  "id": 789012
}
```

### Verificación de webhooks

Se puede verificar el origen con el header `x-linkedstore-hmac-sha256` usando HMAC-SHA256 con el secret de la app.

### Comportamiento

- URL debe ser HTTPS
- Timeout: 3 segundos para responder con HTTP 2xx
- Los mensajes pueden llegar desordenados (sistema distribuido)
- Los mensajes pueden duplicarse — implementar idempotencia
- No se puede usar localhost/tiendanube/nuvemshop como URL

---

## 16. CUSTOM FIELDS (Campos personalizados)

Disponibles para: Orders, Products, Product Variants, Customers, Categories.

### Endpoints (ejemplo para Orders)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/orders/{id}/custom-fields` | Listar campos custom de un pedido |
| POST | `/orders/{id}/custom-fields` | Crear campo custom |
| PUT | `/orders/{id}/custom-fields/{field_id}` | Actualizar |
| DELETE | `/orders/{id}/custom-fields/{field_id}` | Eliminar |

Misma estructura para los demás recursos.

---

## NOTAS TÉCNICAS GENERALES

### Autenticación

```
Authentication: bearer {access_token}
User-Agent: SERMayorista (contacto@sermayorista.com)
Content-Type: application/json; charset=utf-8
```

El User-Agent es obligatorio. Sin él, devuelve 400.

### Rate Limiting

- Bucket size: 40 requests
- Leak rate: 2 requests/segundo
- Si se excede: HTTP 429 Too Many Requests
- Headers informativos: `x-rate-limit-limit`, `x-rate-limit-remaining`, `x-rate-limit-reset`

### Paginación

```
GET /orders?page=2&per_page=100
```

- Default: 30 resultados por página
- Máximo: 200 por página
- Header `x-total-count` indica el total
- Header `Link` con URLs de `next` y `last`

### Campos multilingüe

Algunas propiedades (name, description de Product y Category) son objetos con claves por idioma:
```json
{
  "name": {
    "es": "Remera básica",
    "en": "Basic t-shirt"
  }
}
```

Se puede enviar como string simple y se aplica a todos los idiomas:
```json
{
  "name": "Remera básica"
}
```

### Errores comunes

| Código | Significado |
|--------|-------------|
| 400 | JSON mal formado |
| 401 | Token inválido o expirado |
| 403 | Sin permisos (scope faltante) |
| 404 | Recurso no encontrado |
| 415 | Falta Content-Type header |
| 422 | Campos inválidos (validación) |
| 429 | Rate limit excedido |
| 5xx | Error del servidor de Tienda Nube |

---

## SCOPES (Permisos de la app)

Cada app debe declarar qué scopes necesita. Para nuestro proyecto, necesitamos:

| Scope | Acceso |
|-------|--------|
| read_products / write_products | Productos, variantes, imágenes, categorías |
| read_orders / write_orders | Pedidos, fulfillments |
| read_customers / write_customers | Clientes |
| read_coupons / write_coupons | Cupones |
| write_scripts | Scripts en el storefront |
| read_shipping / write_shipping | Shipping carriers |

Si se modifica el scope después de crear la app, hay que reinstalar y re-autenticar.

---

## ENDPOINTS RELEVANTES PARA EL PROYECTO SER MAYORISTA

### Importación inicial (una sola vez)

1. `GET /products?per_page=200` — traer todo el catálogo
2. `GET /products/{id}/variants` — traer variantes por producto
3. `GET /customers?per_page=200` — traer todos los clientes
4. `GET /orders?per_page=200&created_at_min=YYYY-MM-DD` — traer pedidos por tramos de fecha

### Webhooks a registrar

```json
[
  {"event": "order/created", "url": "https://app.sermayorista.com/api/webhooks/tiendanube"},
  {"event": "order/updated", "url": "https://app.sermayorista.com/api/webhooks/tiendanube"},
  {"event": "order/paid", "url": "https://app.sermayorista.com/api/webhooks/tiendanube"},
  {"event": "order/packed", "url": "https://app.sermayorista.com/api/webhooks/tiendanube"},
  {"event": "order/fulfilled", "url": "https://app.sermayorista.com/api/webhooks/tiendanube"},
  {"event": "order/cancelled", "url": "https://app.sermayorista.com/api/webhooks/tiendanube"},
  {"event": "product/created", "url": "https://app.sermayorista.com/api/webhooks/tiendanube"},
  {"event": "product/updated", "url": "https://app.sermayorista.com/api/webhooks/tiendanube"},
  {"event": "product/deleted", "url": "https://app.sermayorista.com/api/webhooks/tiendanube"}
]
```

### Sincronización de stock (App → Tienda Nube)

```
PUT /products/{product_id}/variants/{variant_id}
Body: {"stock": 25}
```

### Marcar pedido como empaquetado

Usar el Fulfillment Order API:
```
PATCH /orders/{order_id}/fulfillment-orders/{fulfillment_id}
Body: {"status": "PACKED"}
```

### Marcar pedido como enviado con tracking

```
POST /orders/{order_id}/fulfillment-orders/{fulfillment_id}/tracking-events
Body: {
  "status": "shipped",
  "happened_at": "2026-04-03T10:00:00-03:00",
  "description": "Enviado por Correo Argentino",
  "tracking_number": "ABC123456",
  "tracking_url": "https://tracking.correoargentino.com.ar/..."
}
```

### Marcar como entregado

```
POST /orders/{order_id}/fulfillment-orders/{fulfillment_id}/tracking-events
Body: {
  "status": "delivered",
  "happened_at": "2026-04-05T14:00:00-03:00"
}
```

---

## CONEXIÓN CON MÚLTIPLES TIENDAS

Para conectar la tienda mayorista Y la minorista, se usan credenciales separadas:

```
TIENDA_MAYORISTA_STORE_ID=123456
TIENDA_MAYORISTA_ACCESS_TOKEN=abc...

TIENDA_MINORISTA_STORE_ID=789012
TIENDA_MINORISTA_ACCESS_TOKEN=xyz...
```

Cada par de credenciales apunta a una tienda distinta. Los webhooks se registran por separado para cada tienda. La lógica de la app distingue por `store_id` en el payload del webhook.

---

*Fuente: Documentación oficial de Tienda Nube API v2025-03*
*Última actualización de este documento: Abril 2026*
