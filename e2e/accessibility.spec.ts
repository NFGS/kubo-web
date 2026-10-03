import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const IMPACTOS_BLOQUEANTES = ['critical', 'serious'];

/**
 * Ejecuta axe y falla si hay violaciones graves o criticas de WCAG 2 A/AA.
 * Las moderadas se listan en el mensaje para no bloquear por ruido menor.
 */
async function auditar(page: Page): Promise<void> {
  const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const graves = resultado.violations.filter((violacion) =>
    IMPACTOS_BLOQUEANTES.includes(violacion.impact ?? '')
  );

  const resumen = resultado.violations
    .map((violacion) => `${violacion.impact ?? 'menor'}: ${violacion.id}`)
    .join(', ');

  expect(graves, `Violaciones graves de accesibilidad: ${resumen || 'ninguna'}`).toEqual([]);
}

test('la pantalla de ingreso carga y es accesible', async ({ page }) => {
  await page.goto('/ingresar');

  await expect(page.getByRole('heading', { name: /ingresa a tu negocio/i })).toBeVisible();
  await auditar(page);
});

test('el ingreso lleva al tablero y el tablero es accesible', async ({ page }) => {
  await page.goto('/ingresar');

  await page.getByLabel('Correo').fill('admin@kubo.local');
  await page.getByLabel('Contraseña').fill('Admin123!');
  await page.getByRole('button', { name: /ingresar/i }).click();

  await expect(page).toHaveURL(/tablero/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /tablero del negocio/i })).toBeVisible();
  await expect(page.getByText('Ventas de hoy')).toBeVisible();

  await auditar(page);
});

test('el panel de plataforma carga y es accesible', async ({ page }) => {
  await page.goto('/plataforma');

  await expect(page.getByRole('heading', { name: /plataforma kubo/i })).toBeVisible();
  await auditar(page);
});

test('la pagina de recuperacion de contrasena carga', async ({ page }) => {
  await page.goto('/recuperar');

  await expect(page.getByRole('heading', { name: /recupera tu acceso/i })).toBeVisible();
  await auditar(page);
});

async function ingresar(page: Page): Promise<void> {
  await page.goto('/ingresar');
  await page.getByLabel('Correo').fill('admin@kubo.local');
  await page.getByLabel('Contraseña').fill('Admin123!');
  await page.getByRole('button', { name: /ingresar/i }).click();
  await expect(page).toHaveURL(/tablero/, { timeout: 15_000 });
}

test('productos, clientes y POS son accesibles', async ({ page }) => {
  await ingresar(page);

  await page.goto('/productos');
  await expect(page.getByRole('heading', { name: /productos e inventario/i })).toBeVisible();
  await auditar(page);

  await page.goto('/clientes');
  await expect(page.getByRole('heading', { name: /clientes/i })).toBeVisible();
  await auditar(page);

  await page.goto('/compras');
  await expect(page.getByRole('heading', { name: /compras y proveedores/i })).toBeVisible();
  await auditar(page);

  await page.goto('/caja');
  await expect(page.getByRole('heading', { name: /^caja$/i })).toBeVisible();
  await auditar(page);

  await page.goto('/usuarios');
  await expect(page.getByRole('heading', { name: /usuarios y roles/i })).toBeVisible();
  await auditar(page);

  await page.goto('/notificaciones');
  await expect(page.getByRole('heading', { name: /notificaciones/i })).toBeVisible();
  await auditar(page);

  await page.goto('/documentos');
  await expect(page.getByRole('heading', { name: /^documentos$/i })).toBeVisible();
  await auditar(page);

  await page.goto('/bodegas');
  await expect(page.getByRole('heading', { name: /bodegas y transferencias/i })).toBeVisible();
  await auditar(page);

  await page.goto('/configuracion');
  await expect(page.getByRole('heading', { name: /configuración del negocio/i })).toBeVisible();
  await auditar(page);

  await page.goto('/pos');
  await expect(page.getByRole('heading', { name: /punto de venta/i })).toBeVisible();
  await auditar(page);
});
