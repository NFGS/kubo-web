import { MatchersV3, PactV4 } from '@pact-foundation/pact';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Contratos del consumidor (Pact): la PWA declara que espera del API y el
 * archivo generado se verifica contra el sistema vivo con `make pact`.
 *
 * No se prueba aqui la logica de la PWA (eso lo cubren vitest y Playwright),
 * sino el **contrato**: forma de la respuesta que el consumidor consume.
 */
const { eachLike, integer, like, string } = MatchersV3;

const provider = new PactV4({
  consumer: 'kubo-web',
  provider: 'kubo-api',
  dir: fileURLToPath(new URL('../../pacts', import.meta.url))
});

const TOKEN = 'Bearer token-de-ejemplo';

describe('contratos del consumidor (PWA)', () => {
  it('el ingreso devuelve la sesion', async () => {
    await provider
      .addInteraction()
      .given('el negocio de demostracion existe')
      .uponReceiving('un ingreso correcto')
      .withRequest('POST', '/api/v1/auth/login', (builder) =>
        builder
          .headers({ 'Content-Type': 'application/json' })
          .jsonBody({ email: 'admin@kubo.local', password: 'Admin123!' })
      )
      .willRespondWith(200, (builder) =>
        builder.jsonBody({
          accessToken: string('token-de-ejemplo'),
          tokenType: 'Bearer',
          expiresInSeconds: integer(900),
          user: like({
            id: string('usuario-1'),
            email: string('admin@kubo.local'),
            role: string('OWNER')
          })
        })
      )
      .executeTest(async (mock) => {
        const res = await fetch(`${mock.url}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@kubo.local', password: 'Admin123!' })
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(typeof data.accessToken).toBe('string');
      });
  });

  it('el catalogo devuelve productos con total', async () => {
    await provider
      .addInteraction()
      .given('existe al menos un producto')
      .uponReceiving('la consulta del catalogo')
      .withRequest('GET', '/api/v1/products', (builder) => builder.headers({ Authorization: TOKEN }))
      .willRespondWith(200, (builder) =>
        builder.jsonBody({
          data: eachLike({
            id: string('producto-1'),
            sku: string('SKU-1'),
            name: string('Producto'),
            // El ERP serializa los decimales como cadena ("12800.00").
            price: like('1000.00'),
            stock: integer(1)
          }),
          total: integer(1)
        })
      )
      .executeTest(async (mock) => {
        const res = await fetch(`${mock.url}/api/v1/products`, {
          headers: { Authorization: TOKEN }
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data.data)).toBe(true);
      });
  });

  it('el listado de clientes llega enmascarado', async () => {
    await provider
      .addInteraction()
      .given('existe un cliente con documento')
      .uponReceiving('el listado de clientes')
      .withRequest('GET', '/api/v1/customers', (builder) =>
        builder
          .headers({ Authorization: TOKEN })
          // El filtro acota a los clientes del estado: documento y telefono
          // son opcionales, y solo los que los tienen se pueden enmascarar.
          .query({ q: 'Cliente de contrato' })
      )
      .willRespondWith(200, (builder) =>
        builder.jsonBody({
          data: eachLike({
            id: string('cliente-1'),
            name: string('Cliente de contrato'),
            document_number: like('*******432'),
            phone: like('*******567')
          }),
          total: integer(1)
        })
      )
      .executeTest(async (mock) => {
        const res = await fetch(
          `${mock.url}/api/v1/customers?q=${encodeURIComponent('Cliente de contrato')}`,
          { headers: { Authorization: TOKEN } }
        );

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(Array.isArray(data.data)).toBe(true);
      });
  });

  it('la vista compuesta del tablero trae data', async () => {
    await provider
      .addInteraction()
      .uponReceiving('la vista compuesta del tablero')
      .withRequest('GET', '/api/v1/dashboard/overview', (builder) =>
        builder.headers({ Authorization: TOKEN })
      )
      .willRespondWith(200, (builder) =>
        builder.jsonBody({ data: like({ summary: like({ revenue: like(0) }) }) })
      )
      .executeTest(async (mock) => {
        const res = await fetch(`${mock.url}/api/v1/dashboard/overview`, {
          headers: { Authorization: TOKEN }
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.data).toBeDefined();
      });
  });
});
