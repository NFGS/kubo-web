import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerSetup } from './ServerSetup';

describe('pantalla de conexión al servidor (app móvil)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('exige una dirección antes de probar', async () => {
    const onDone = vi.fn();
    render(<ServerSetup onDone={onDone} />);

    await userEvent.click(screen.getByRole('button', { name: /probar y continuar/i }));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toMatch(/escribe la dirección/i);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('guarda la dirección cuando el servidor responde', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const onDone = vi.fn();
    render(<ServerSetup onDone={onDone} />);

    await userEvent.type(screen.getByLabelText(/dirección del servidor/i), 'kubo-app.duckdns.org');
    await userEvent.click(screen.getByRole('button', { name: /probar y continuar/i }));

    expect(onDone).toHaveBeenCalled();
    expect(localStorage.getItem('kubo.serverUrl')).toBe('https://kubo-app.duckdns.org');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://kubo-app.duckdns.org/api/v1/auth/.well-known/jwks.json'
    );
  });

  it('muestra el error cuando el servidor no responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<ServerSetup onDone={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/dirección del servidor/i), 'https://no-existe.local');
    await userEvent.click(screen.getByRole('button', { name: /probar y continuar/i }));

    expect(await screen.findByText(/no se pudo conectar/i)).toBeTruthy();
  });

  it('el botón de la demo usa la URL pública', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    const onDone = vi.fn();
    render(<ServerSetup onDone={onDone} />);

    await userEvent.click(screen.getByRole('button', { name: /usar la demo/i }));

    expect(onDone).toHaveBeenCalled();
    expect(localStorage.getItem('kubo.serverUrl')).toBe('https://kubo.shares.zrok.io');
  });
});
