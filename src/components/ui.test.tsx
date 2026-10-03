import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  Modal,
  Select,
  Spinner
} from './ui';

describe('sistema de diseno', () => {
  it('la tarjeta muestra titulo, accion y contenido', () => {
    render(
      <Card title="Resumen" action={<button type="button">Ver</button>}>
        cuerpo
      </Card>
    );

    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver' })).toBeTruthy();
    expect(screen.getByText('cuerpo')).toBeTruthy();
  });

  it('la tarjeta sin titulo ni accion no pinta cabecera', () => {
    render(<Card>solo cuerpo</Card>);

    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('el boton normal dispara el clic', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Cobrar</Button>);

    await userEvent.click(screen.getByRole('button', { name: /cobrar/i }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('el boton en carga queda deshabilitado y no dispara', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>
    );

    const boton = screen.getByRole('button', { name: /guardar/i }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);

    await userEvent.click(boton);

    expect(onClick).not.toHaveBeenCalled();
  });

  it('el campo muestra etiqueta y pista', () => {
    render(
      <Field label="Documento" hint="Se guarda cifrado">
        <Input />
      </Field>
    );

    expect(screen.getByText('Documento')).toBeTruthy();
    expect(screen.getByText('Se guarda cifrado')).toBeTruthy();
  });

  it('el select acepta opciones con nombre accesible', () => {
    render(
      <Select aria-label="Etapa">
        <option value="LEAD">Prospecto</option>
      </Select>
    );

    expect(screen.getByRole('combobox', { name: 'Etapa' })).toBeTruthy();
  });

  it('el modal abierto es un dialogo accesible y cierra', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Editar cliente">
        <p>contenido</p>
      </Modal>
    );

    expect(screen.getByRole('dialog', { name: 'Editar cliente' })).toBeTruthy();
    expect(screen.getByText('contenido')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('el modal cerrado no renderiza nada', () => {
    const { container } = render(
      <Modal open={false} onClose={() => undefined} title="x">
        <p>y</p>
      </Modal>
    );

    expect(container.firstChild).toBeNull();
  });

  it('la insignia, el vacio y el spinner se renderizan', () => {
    render(
      <>
        <Badge tone="success">Activo</Badge>
        <EmptyState title="Sin datos" description="Nada aun" />
        <Spinner label="Cargando ventas" />
      </>
    );

    expect(screen.getByText('Activo')).toBeTruthy();
    expect(screen.getByText('Sin datos')).toBeTruthy();
    expect(screen.getByText('Nada aun')).toBeTruthy();
    expect(screen.getByText('Cargando ventas')).toBeTruthy();
  });

  it('el aviso de error se anuncia y sin mensaje no pinta nada', () => {
    const { container, unmount } = render(<ErrorNote message="Fallo de red" />);
    expect(screen.getByRole('alert').textContent).toBe('Fallo de red');
    unmount();

    const vacio = render(<ErrorNote message={null} />);
    expect(vacio.container.firstChild).toBeNull();
    expect(container).toBeTruthy();
  });
});
