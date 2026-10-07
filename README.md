# kubo-web
[!\[CI](https://github.com/NFGS/kubo-web/actions/workflows/ci.yml/badge.svg)\]([https://github.com/NFGS/kubo-web/actions/workflows/ci.yml](https://github.com/NFGS/kubo-web/actions/workflows/ci.yml))
> Parte del proyecto **Kubo** — [kubo-workspace](https://github.com/NFGS/kubo-workspace) (ERP + CRM autoalojable para PYMES).
Aplicación web instalable (PWA) de Kubo. Es la cara del sistema para el dueño del
negocio y sus vendedores.
<table header-row="true">
<tr>
<td>Campo</td>
<td>Valor</td>
</tr>
<tr>
<td>Stack</td>
<td>React 19 · Vite 8 · TypeScript 6 · Tailwind CSS 4 · TanStack Query 5 · Recharts</td>
</tr>
<tr>
<td>Servidor</td>
<td>nginx (sirve los activos y proxea `/api` al gateway)</td>
</tr>
<tr>
<td>Puerto</td>
<td>80 (contenedor) · 3000 (host)</td>
</tr>
</table>
## Por qué Vite y no otro framework
Kubo es una aplicación **instalable y offline-first**, no un sitio público: no
necesita renderizado en servidor ni SEO. Vite produce un paquete estático que
nginx sirve desde el propio local, sin dependencias de nube, y el service worker
de Workbox permite que la caja siga vendiendo sin internet.
## Pantallas
<table header-row="true">
<tr>
<td>Ruta</td>
<td>Pantalla</td>
<td>Qué hace</td>
</tr>
<tr>
<td>`/ingresar`</td>
<td>Ingreso</td>
<td>Autenticación contra el gateway</td>
</tr>
<tr>
<td>`/recuperar`</td>
<td>Recuperación</td>
<td>Pide el enlace por correo y, con `?token=`, cambia la contraseña</td>
</tr>
<tr>
<td>`/tablero`</td>
<td>Tablero</td>
<td>KPIs, serie de 14 días, top productos, medios de pago, últimas ventas</td>
</tr>
<tr>
<td>`/pos`</td>
<td>Punto de venta</td>
<td>Carrito, cliente, medio de pago, cobro con soporte offline y **facturar** la última venta</td>
</tr>
<tr>
<td>`/productos`</td>
<td>Catálogo</td>
<td>CRUD de productos y ajustes de inventario</td>
</tr>
<tr>
<td>`/compras`</td>
<td>Compras y proveedores</td>
<td>Alta de proveedores, registro de compras con líneas y anulación (suma inventario y costo)</td>
</tr>
<tr>
<td>`/clientes`</td>
<td>Clientes</td>
<td>CRUD con documento y teléfono enmascarados en el listado; el detalle los revela</td>
</tr>
<tr>
<td>`/caja`</td>
<td>Caja</td>
<td>Apertura, venta en efectivo, cierre y arqueo del turno</td>
</tr>
<tr>
<td>`/compras`</td>
<td>Compras y proveedores</td>
<td>Alta de proveedores, registro de compras con líneas y anulación (suma inventario y costo)</td>
</tr>
<tr>
<td>`/bodegas`</td>
<td>Bodegas y transferencias</td>
<td>Bodegas del negocio, stock por bodega y transferencias</td>
</tr>
<tr>
<td>`/usuarios`</td>
<td>Usuarios y roles</td>
<td>El propietario crea, edita, habilita y deshabilita usuarios</td>
</tr>
<tr>
<td>`/notificaciones`</td>
<td>Notificaciones</td>
<td>Buzón del negocio (avisos de stock, compras y resumen)</td>
</tr>
<tr>
<td>`/documentos`</td>
<td>Documentos</td>
<td>Facturas XML, notas crédito, comprobantes PDF y soportes, con descarga autenticada</td>
</tr>
<tr>
<td>`/configuracion`</td>
<td>Configuración</td>
<td>Vertical, zona horaria, **datos fiscales (DIAN)**, uso contra el plan, pagos y segundo factor</td>
</tr>
<tr>
<td>`/plataforma`</td>
<td>Panel del operador</td>
<td>Acceso propio con TOTP: negocios, suspensión, pagos, uso y auditoría</td>
</tr>
</table>
## Arquitectura del cliente
```javascript
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
<table header-row="true">
<tr>
<td>Control</td>
<td>Implementación</td>
</tr>
<tr>
<td>Access token</td>
<td>Solo en memoria (15 minutos); no se escribe en el navegador</td>
</tr>
<tr>
<td>Refresh token</td>
<td>En **cookie ****`httpOnly`****  • ****`SameSite=Strict`** que emite el gateway; el navegador no puede leerla ni guardarla</td>
</tr>
<tr>
<td>Refresco</td>
<td>**Vuelo único**: varias peticiones con `401` disparan un solo refresco</td>
</tr>
<tr>
<td>Cierre de sesión</td>
<td>Revoca el token en el servidor, borra la cookie, **limpia las cachés del service worker** y **vacía la cola offline** (el vendedor siguiente no sincroniza ventas ajenas)</td>
</tr>
<tr>
<td>Datos en caché</td>
<td>El service worker cachea solo lecturas (`products`, `customers`, `dashboard`) por una hora</td>
</tr>
<tr>
<td>Mismo origen</td>
<td>nginx sirve la app y proxea `/api`: no hay CORS ni cookies entre dominios</td>
</tr>
</table>
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
## App Android (Capacitor)
La PWA se envuelve con **Capacitor** para la app móvil (ADR-0023 y ADR-0031;
plan por fases en `kubo-docs/14-plan-app-movil.md`):
- **Assets locales**: la app abre sin red desde el primer arranque; el APK es
	uno solo para todos los negocios (la URL del servidor se configura en el
	dispositivo — siguiente tramo de la Fase 1).
- **Proyecto nativo**: `android/` (Capacitor 8; los artefactos de build y los
	assets copiados no se versionan).
- **APK de depuración en CI**: el flujo `Android`
	(`.github/workflows/android.yml`) compila y sube `app-debug.apk` como
	artefacto en cada push a `main`, tag `v*` o ejecución manual.
```bash
npm run android:sync   # compila la web y copia los assets al proyecto Android
npm run android:apk    # compila el APK de depuración (requiere SDK de Android)
```
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
- **Pruebas unitarias (vitest)**: 29 pruebas sobre la cola offline
	(IndexedDB), la política de errores, el formato es-CO, el sistema de diseño y
	la pantalla de ingreso, con gate de cobertura v8: líneas/funciones/statements
	≥ 85 y ramas ≥ 65 (hoy líneas 100 %, ramas 91 %).
- **Contratos del consumidor (Pact)**: `src/pact/consumer.pact.test.ts` declara
	4 interacciones y `make pact` las verifica contra el sistema vivo; corre en
	`make ci`.
- **Caché por sesión**: al entrar y salir se purgan las cachés del service worker
	y las consultas, para que un equipo compartido nunca sirva datos del usuario
	anterior.
