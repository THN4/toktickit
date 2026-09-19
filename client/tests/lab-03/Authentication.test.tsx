import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../../src/pages/LoginPage';
import ChangePasswordPage from '../../src/pages/ChangePasswordPage';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'REQUESTER', isActive: true, mustChangePassword: true },
    login: mocks.login,
    logout: mocks.logout,
    changePassword: mocks.changePassword,
  }),
}));

describe('Lab 3 authentication UI', () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.logout.mockReset();
    mocks.changePassword.mockReset();
  });

  it('marks Login credentials as required before submission', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);

    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/^password/i)).toBeRequired();
  });

  it('redirects a first-login User to Change Password after successful sign-in', async () => {
    mocks.login.mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'REQUESTER',
      isActive: true,
      mustChangePassword: true,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<p>Change Password destination</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'TEST@EXAMPLE.COM' } });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'InitialPassword!123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith('TEST@EXAMPLE.COM', 'InitialPassword!123'));
    await waitFor(() => expect(screen.getByText('Change Password destination')).toBeInTheDocument());
  });

  it('rejects mismatched new passwords before calling the API', () => {
    render(<MemoryRouter><ChangePasswordPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText(/^current password/i), { target: { value: 'InitialPassword!123' } });
    fireEvent.change(screen.getByLabelText(/^new password/i), { target: { value: 'ReplacementPassword!123' } });
    fireEvent.change(screen.getByLabelText(/^confirm new password/i), { target: { value: 'OtherPassword!123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));

    expect(screen.getByRole('alert')).toHaveTextContent('New password and confirmation must match.');
    expect(mocks.changePassword).not.toHaveBeenCalled();
  });
});
