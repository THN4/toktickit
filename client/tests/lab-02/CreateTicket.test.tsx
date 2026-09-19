import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CreateTicketPage from '../../src/pages/CreateTicketPage';
import { AuthProvider } from '../../src/contexts/AuthContext';
import * as api from '../../src/services/api';

describe('UI-01, UI-04, UI-05, UI-06, UI-14: CreateTicket Component Tests', () => {
  const mockRequester = {
    id: 1,
    name: 'Jennifer Anderson',
    email: 'jennifer@example.com',
  };

  const mockCategories = [
    { id: 1, name: 'Account and Access' },
    { id: 2, name: 'Hardware' },
  ];

  const mockSystems = [
    { id: 1, name: 'Email' },
    { id: 2, name: 'Corporate Laptop' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchCurrentUser').mockResolvedValue({ user: { ...mockRequester, role: 'REQUESTER', isActive: true, mustChangePassword: false } });
    vi.spyOn(api, 'fetchCategories').mockResolvedValue(mockCategories);
    vi.spyOn(api, 'fetchRelatedSystems').mockResolvedValue(mockSystems);
  });

  function renderComponent() {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <CreateTicketPage />
        </AuthProvider>
      </BrowserRouter>
    );
  }

  // ─── UI-14: Required Asterisk ──────────────────────────────────────────────
  it('UI-14: renders red asterisks on all required fields', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Category')).toBeInTheDocument();
    });

    const asterisks = screen.getAllByText('*');
    expect(asterisks.length).toBeGreaterThanOrEqual(4); // Category, System, Priority, Summary, Description
  });

  // ─── UI-01: Validation Errors ──────────────────────────────────────────────
  it('UI-01: shows validation errors below fields and prevents API call when inputs are invalid', async () => {
    const createSpy = vi.spyOn(api, 'createTicket');
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Account and Access')).toBeInTheDocument();
    });

    // Click submit with empty form
    const submitBtn = screen.getByRole('button', { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Category is required.')).toBeInTheDocument();
    expect(screen.getByText('Related System is required.')).toBeInTheDocument();
    expect(screen.getByText('Summary must be between 5 and 200 characters.')).toBeInTheDocument();
    expect(screen.getByText('Description must be between 10 and 3000 characters.')).toBeInTheDocument();

    expect(createSpy).not.toHaveBeenCalled();
  });

  // ─── UI-04: Busy State ─────────────────────────────────────────────────────
  it('UI-04: shows submitting busy state and disables submit button during in-flight request', async () => {
    // Hang API call in pending state
    vi.spyOn(api, 'createTicket').mockReturnValue(new Promise(() => {}));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Account and Access')).toBeInTheDocument();
    });

    // Fill valid form
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '1' } }); // Category
    fireEvent.change(selects[1], { target: { value: '1' } }); // System

    const summaryInput = screen.getByPlaceholderText(/Brief summary of the issue/i);
    fireEvent.change(summaryInput, { target: { value: 'Cannot log into LEB2' } });

    const descInput = screen.getByPlaceholderText(/Detailed description of what happened/i);
    fireEvent.change(descInput, { target: { value: 'Getting invalid credentials error since 9am today.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Submitting.../i })).toBeDisabled();
    });
  });

  // ─── UI-05: Form Preservation on API Failure ──────────────────────────────
  it('UI-05: preserves entered form values when server returns an error', async () => {
    vi.spyOn(api, 'createTicket').mockRejectedValueOnce(new Error('Internal server error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Account and Access')).toBeInTheDocument();
    });

    // Fill valid form
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '1' } });
    fireEvent.change(selects[1], { target: { value: '1' } });

    const summaryInput = screen.getByPlaceholderText(/Brief summary of the issue/i);
    fireEvent.change(summaryInput, { target: { value: 'Laptop screen flickering' } });

    const descInput = screen.getByPlaceholderText(/Detailed description of what happened/i);
    fireEvent.change(descInput, { target: { value: 'Screen flickers randomly when opening multiple browser tabs.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Internal server error/i)).toBeInTheDocument();
    });

    // Verify form fields still hold user values (AC-08)
    expect((summaryInput as HTMLInputElement).value).toBe('Laptop screen flickering');
    expect((descInput as HTMLTextAreaElement).value).toBe('Screen flickers randomly when opening multiple browser tabs.');
  });

  // ─── UI-06: Success State ──────────────────────────────────────────────────
  it('UI-06: displays success screen showing the generated ticket number upon successful submission', async () => {
    vi.spyOn(api, 'createTicket').mockResolvedValueOnce({
      id: 42,
      ticketNumber: 'TKT-2026-000042',
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      currentStatus: 'NEW',
      summary: 'Valid summary test',
      description: 'Valid description test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Account and Access')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '1' } });
    fireEvent.change(selects[1], { target: { value: '1' } });

    fireEvent.change(screen.getByPlaceholderText(/Brief summary of the issue/i), {
      target: { value: 'Valid summary test' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Detailed description of what happened/i), {
      target: { value: 'Valid description test long enough' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Submit Ticket/i }));

    await waitFor(() => {
      expect(screen.getByText(/Ticket Created Successfully!/i)).toBeInTheDocument();
      expect(screen.getByText('TKT-2026-000042')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Another Ticket/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View My Tickets/i })).toBeInTheDocument();
    });
  });
});

