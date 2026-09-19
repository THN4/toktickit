import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';

describe('Lab 3 authentication route guarding', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('redirects an unauthenticated visitor to Login', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'TokTickIT' })).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });
  });
});
