import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPendingSales,
  countPendingSales,
  enqueueSale,
  listPendingSales,
  removePendingSale
} from './offline';
import type { NewSalePayload } from './types';

const venta = (nota: string): NewSalePayload => ({
  items: [{ product_id: 'p1', quantity: 1 }],
  payment_method: 'CASH',
  notes: nota
});

describe('cola offline en IndexedDB', () => {
  beforeEach(async () => {
    await clearPendingSales();
  });

  it('encola una venta y la cuenta', async () => {
    await enqueueSale(venta('a'), '1 producto');

    expect(await countPendingSales()).toBe(1);
  });

  it('lista en el orden en que se encolaron', async () => {
    await enqueueSale(venta('primera'), 'primera');
    await enqueueSale(venta('segunda'), 'segunda');

    const pendientes = await listPendingSales();

    expect(pendientes.map((item) => item.label)).toEqual(['primera', 'segunda']);
  });

  it('elimina una venta ya sincronizada', async () => {
    const pendiente = await enqueueSale(venta('a'), '1 producto');

    await removePendingSale(pendiente.id);

    expect(await countPendingSales()).toBe(0);
  });

  it('vaciar la cola no deja ventas del vendedor anterior', async () => {
    await enqueueSale(venta('a'), 'a');
    await enqueueSale(venta('b'), 'b');

    await clearPendingSales();

    expect(await listPendingSales()).toEqual([]);
  });
});
