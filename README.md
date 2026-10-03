# kubo-web

Aplicación web instalable (PWA) de Kubo. Es la cara del sistema para el dueño del
negocio y sus vendedores.

| Campo | Valor |
| --- | --- |
| Stack | React 19 · Vite 8 · TypeScript 6 · Tailwind CSS 4 · TanStack Query 5 · Recharts |
| Servidor | nginx (sirve los activos y proxea `/api` al gateway) |
| Puerto | 80 (contenedor) · 3000 (host) |

## Por qué Vite y no otro framework

Kubo es una aplicación **instalable y offline-first**, no un sitio público: no
necesita renderizado en servidor ni SEO. Vite produce un paquete estático que
nginx sirve desde el propio local, sin dependencias de nube, y el service worker
de Workbox permite que la caja siga vendiendo sin internet.

## Pantallas

| Ruta | Pantalla | Qué hace |
| --- | --- | --- |
| `/ingresar` | Ingreso | Autenticación contra el gateway |
| `/recuperar` | Recuperación | Pide el enlace por correo y, con `?token=`, cambia la contraseña |
| `/tablero` | Tablero | KPIs, serie de 14 días, top productos, medios de pago, últimas ventas |
| `/pos` | Punto de venta | Carrito, cliente, medio de pago y cobro con soporte offline |
| `/productos` | Catálogo | CRUD de productos y ajustes de inventario |
| `/compras` | Compras y proveedores | Alta de proveedores, registro de compras con líneas y anulación (suma inventario y costo) |
| `/clientes` | Clientes | CRUD con documento y teléfono enmascarados en el listado; el detalle los revela |
| `/caja` | Caja | Apertura, venta en efectivo, cierre y arqueo del turno |
| `/compras` | Compras y proveedores | Alta de proveedores, registro de compras con líneas y anulación (suma inventario y costo) |
| `/bodegas` | Bodegas y transferencias | Bodegas del negocio, stock por bodega y transferencias |
| `/usuarios` | Usuarios y roles | El propietario crea, edita, habilita y deshabilita usuarios |
| `/notificaciones` | Notificaciones | Buzón del negocio (avisos de stock, compras y resumen) |
| `/documentos` | Documentos | Facturas XML, notas crédito, comprobantes PDF y soportes, con descarga autenticada |
| `/configuracion` | Configuración | Vertical, zona horaria, uso contra el plan, pagos y segundo factor |
| `/plataforma` | Panel del operador | Acceso propio con TOTP: negocios, suspensión, pagos, uso y auditoría |

## Arquitectura del cliente

```
src/
├── lib/
│   ├── api.ts        cliente HTTP; refresco en vuelo único con cookie httpOnly
│   ├── auth.tsx      sesión: restaura, refresca y cierra
│   ├── offline.ts    cola de ventas en IndexedDB
│   ├── queue.tsx     sincronización automática al recuperar la conexión
│   ├── query.ts      configuración de TanStack Query
│   ├── format.ts     moneda, fechas y etiquetas en es-CO
│   └── types.ts      contratos con los servicios
├── components/
│   ├── ui.tsx        sistema de diseño: botón, tarjeta, campo, modal, insignia
│   ├── Layout.tsx    navegación, estado de conexión y cola pendiente
│   └── Toaster.tsx   avisos al usuario
└── pages/            las páginas de la aplicación (14 rutas)
```

## Seguridad en el navegador

| Control | Implementación |
| --- | --- |
| Access token | Solo en memoria (15 minutos); no se escribe en el navegador |
| Refresh token | En **cookie `httpOnly` + `SameSite=Strict`** que emite el gateway; el navegador no puede leerla ni guardarla |
| Refresco | **Vuelo único**: varias peticiones con `401` disparan un solo refresco |
| Cierre de sesión | Revoca el token en el servidor, borra la cookie, **limpia las cachés del service worker** y **vacía la cola offline** (el vendedor siguiente no sincroniza ventas ajenas) |
| Datos en caché | El service worker cachea solo lecturas (`products`, `customers`, `dashboard`) por una hora |
| Mismo origen | nginx sirve la app y proxea `/api`: no hay CORS ni cookies entre dominios |

## Funcionamiento sin conexión

1. El POS detecta que no hay red (o que la petición no obtuvo respuesta) y guarda
   la venta en **IndexedDB**.
2. La barra superior muestra las ventas pendientes y un botón **Sincronizar**.
3. Al recuperar la conexión (evento `online`) o cada 30 segundos, se envían en
   orden. Los errores de negocio (stock insuficiente, producto inexistente) se
   descartan para no bloquear la cola; los de red se reintentan; un `401`/`403`
   **detiene** la cola y la venta se conserva hasta volver a ingresar (nunca se
   pierde una venta por una sesión vencida).
4. Al sincronizar se invalidan las consultas y el tablero se actualiza.

## PWA

`vite-plugin-pwa` genera el service worker y el manifest:

- **Instalable** en escritorio y móvil, en español (`es-CO`).
- **Precaché** del shell (HTML, CSS, JS, iconos).
- **Runtime caching** `NetworkFirst` para las lecturas del negocio, con respaldo
  en caché cuando no hay red.
- Iconos normales y *maskable* para Android.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173 con proxy a http://localhost:9080
npm run build    # compilación de producción + service worker
npm run typecheck
```

En desarrollo, `vite.config.ts` proxea `/api` al gateway local, de modo que el
código nunca necesita saber en qué puerto corre cada servicio.

## Accesibilidad y usabilidad

- Contraste verificado, foco visible y cierre de modales con botón accesible.
- Etiquetas `aria` en los controles con icono.
- Estados explícitos de carga, vacío y error en cada pantalla (nunca una pantalla
  en blanco).
- Mensajes en español pensados para alguien sin conocimientos técnicos.
- Objetivos táctiles amplios para trabajar en el mostrador.

## Calidad y accesibilidad (Fase 2)

- **E2E con Playwright** (`e2e/accessibility.spec.ts`): 5 pruebas que recorren el
  ingreso, el tablero, la recuperación, el panel de plataforma y diez pantallas
  del negocio. Usa el Chrome del sistema en local (`channel: 'chrome'`) y
  chromium en CI.
- **Auditoría axe** en cada pantalla: el gate falla ante violaciones graves o
  críticas de WCAG 2 A/AA. La Fase 2 corrigió tres defectos reales (contrastes y
  un `select` sin nombre accesible).
- **Pruebas unitarias (vitest)**: la cola offline (IndexedDB) y la política de
  errores de sincronización, con gate de cobertura v8: líneas/funciones/
  statements ≥ 85 y ramas ≥ 65 (hoy líneas 100 %).
- **Caché por sesión**: al entrar y salir se purgan las cachés del service worker
  y las consultas, para que un equipo compartido nunca sirva datos del usuario
  anterior.
