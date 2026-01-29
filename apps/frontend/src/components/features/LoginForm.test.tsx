import type { UserRole } from '@repo/shared-types';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('button is disabled when input is empty', () => {
    render(<LoginForm onJoin={vi.fn()} />);
    const button = screen.getByRole('button', { name: /csatlakozás/i });
    expect(button).toBeDisabled();
  });

  it('submits correct data when form is filled', async () => {
    const onJoinMock = vi.fn<(name: string, role: UserRole) => void>();
    const user = userEvent.setup();

    render(<LoginForm onJoin={onJoinMock} />);

    // 1. Név kitöltése
    const input = screen.getByPlaceholderText('Neved...');
    await user.type(input, 'Teszt Elek');

    // 2. Gomb ellenőrzése
    const button = screen.getByRole('button', { name: /csatlakozás/i });
    expect(button).toBeEnabled();

    // 3. Kattintás
    await user.click(button);

    // 4. Ellenőrzés: Alapértelmezett role 'USER'
    expect(onJoinMock).toHaveBeenCalledWith('Teszt Elek', 'USER');
  });

  it('allows changing role', async () => {
    const onJoinMock = vi.fn<(name: string, role: UserRole) => void>();
    const user = userEvent.setup();

    render(<LoginForm onJoin={onJoinMock} />);

    await user.type(screen.getByPlaceholderText('Neved...'), 'Admin Boss');

    // Select megnyitása (Trigger) - a jelenlegi érték a "Résztvevő"
    const trigger = screen.getByText('Résztvevő');
    await user.click(trigger);

    // Opció kiválasztása a legördülőből
    const adminOption = screen.getByText('Adminisztrátor');
    await user.click(adminOption);

    // Submit
    await user.click(screen.getByRole('button', { name: /csatlakozás/i }));

    expect(onJoinMock).toHaveBeenCalledWith('Admin Boss', 'ADMIN');
  });
});
