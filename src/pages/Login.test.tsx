import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, login, verifyTotp } from '../lib/api';
import { useAuth } from '../lib/auth';
import { LoginPage } from './Login';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, login: vi.fn(), verifyTotp: vi.fn() };
});

vi.mock('../lib/auth', () => ({ useAuth: vi.fn() }));

const usuario = {
  id: 'usuario-1',
  tenantId: 'negocio-1',
  email: 'admin@kubo.local',
  fullName: 'Admin',
  role: 'OWNER',
  status: 'ACTIVE'
};

const sesion = {
  accessToken: 'token',
  tokenType: 'Bearer',
  expiresInSeconds: 900,
  user: usuario
};

function renderizar() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('pantalla de ingreso', () => {
  const signIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ user: null, ready: true, signIn, signOut: vi.fn() } as never);
  });

  it('ingresa con correo y contrasena', async () => {
    vi.mocked(login).mockResolvedValue(sesion as never);

    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(login).toHaveBeenCalledWith('admin@kubo.local', 'Admin123!');
    expect(signIn).toHaveBeenCalledWith(usuario);
  });

  it('pide el codigo cuando el segundo factor esta activo', async () => {
    vi.mocked(login).mockResolvedValue({ totpRequired: true, challengeToken: 'desafio' } as never);
    vi.mocked(verifyTotp).mockResolvedValue(sesion as never);

    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(screen.getByText(/verifica tu identidad/i)).toBeTruthy();

    await userEvent.type(screen.getByLabelText(/código de verificación/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verificar código/i }));

    expect(verifyTotp).toHaveBeenCalledWith('desafio', '123456');
    expect(signIn).toHaveBeenCalledWith(usuario);
  });

  it('permite volver del paso del codigo', async () => {
    vi.mocked(login).mockResolvedValue({ totpRequired: true, challengeToken: 'desafio' } as never);

    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));
    await userEvent.click(screen.getByRole('button', { name: /volver al ingreso/i }));

    expect(screen.getByRole('button', { name: /ingresar/i })).toBeTruthy();
  });

  it('muestra el error del servidor sin revelar detalles internos', async () => {
    vi.mocked(login).mockRejectedValue(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Correo o contrasena incorrectos')
    );

    renderizar();
    await userEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(screen.getByRole('alert').textContent).toMatch(/incorrectos/i);
    expect(signIn).not.toHaveBeenCalled();
  });
});
