import { money } from './format';
import type { Sale } from './types';

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char
  );
}

/**
 * Imprime un comprobante de venta tipo tiquete usando un iframe oculto.
 *
 * Se genera el HTML y se lanza `print()` sin abrir pestañas ni depender de
 * internet: el navegador muestra su diálogo y el usuario elige la impresora
 * (o guarda en PDF).
 */
export function printReceipt(sale: Sale): void {
  const rows = sale.items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.product_name)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${escapeHtml(money(item.unit_price))}</td>
        <td class="num">${escapeHtml(money(item.total))}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Comprobante ${escapeHtml(sale.number)}</title>
<style>
  * { font-family: ui-monospace, "Courier New", monospace; }
  body { margin: 0; padding: 12px; width: 280px; color: #111; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 2px; }
  p.sub { text-align: center; font-size: 11px; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 2px 0; text-align: left; }
  .num { text-align: right; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
  .tot { font-size: 12px; font-weight: 700; }
</style>
</head>
<body>
  <h1>Kubo</h1>
  <p class="sub">Comprobante de venta<br>${escapeHtml(sale.number)}<br>${escapeHtml(
    new Date(sale.created_at).toLocaleString('es-CO')
  )}</p>
  <table>
    <thead>
      <tr><th>Producto</th><th class="num">Cant</th><th class="num">Vr. un</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <hr>
  <table>
    <tr><td>Subtotal</td><td class="num">${escapeHtml(money(sale.subtotal))}</td></tr>
    <tr><td>IVA</td><td class="num">${escapeHtml(money(sale.tax))}</td></tr>
    <tr class="tot"><td>Total</td><td class="num">${escapeHtml(money(sale.total))}</td></tr>
  </table>
  <hr>
  <p class="sub">${escapeHtml(sale.customer_name ?? 'Consumidor final')}<br>¡Gracias por su compra!</p>
</body>
</html>`;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.append(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  window.setTimeout(() => frame.remove(), 30_000);
}
