import { describe, expect, it } from 'vitest';
import {
  compactMoney,
  dateTime,
  money,
  number,
  paymentLabels,
  shortDate,
  stageLabels
} from './format';

describe('formato es-CO', () => {
  it('formatea pesos sin decimales', () => {
    expect(money(11900)).toContain('11.900');
    expect(money('35700.00')).toContain('35.700');
  });

  it('un valor vacio o invalido cae a cero', () => {
    expect(money(null)).toContain('0');
    expect(money(undefined)).toContain('0');
    expect(money('no-es-numero')).toContain('0');
  });

  it('compacta montos grandes', () => {
    expect(compactMoney(1500000)).toMatch(/1,5/);
    expect(compactMoney(1500000)).toContain('$');
  });

  it('separa miles y tolera vacios', () => {
    expect(number(1234)).toBe('1.234');
    expect(number(null)).toBe('0');
    expect(number(undefined)).toBe('0');
  });

  it('las fechas invalidas o vacias se muestran como guion', () => {
    expect(shortDate(null)).toBe('—');
    expect(shortDate('no-es-fecha')).toBe('—');
    expect(shortDate('2026-09-24T12:00:00Z')).toMatch(/24/);

    expect(dateTime(null)).toBe('—');
    expect(dateTime('no-es-fecha')).toBe('—');
    expect(dateTime('2026-09-24T12:00:00Z')).toMatch(/24/);
  });

  it('las etiquetas de dominio estan en espanol', () => {
    expect(stageLabels.CUSTOMER).toBe('Cliente');
    expect(stageLabels.LEAD).toBe('Prospecto nuevo');
    expect(paymentLabels.CASH).toBe('Efectivo');
    expect(paymentLabels.TRANSFER).toBe('Transferencia');
  });
});
