import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffQueuePage from '../../src/pages/StaffQueuePage';
import * as api from '../../src/services/api';
vi.mock('../../src/services/api', async () => ({ ...(await vi.importActual<typeof api>('../../src/services/api')), fetchStaffQueue: vi.fn() }));
describe('Lab 3 Staff Queue UI', () => {
 beforeEach(() => vi.mocked(api.fetchStaffQueue).mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } }));
 it('renders documented controls and empty state', async () => { render(<StaffQueuePage />); await waitFor(() => expect(screen.getByText(/No Tickets match/)).toBeInTheDocument()); expect(screen.getByLabelText('IT priority')).toBeInTheDocument(); expect(screen.getByLabelText('Owner ID')).toBeInTheDocument(); expect(screen.getByLabelText('Page size')).toBeInTheDocument(); });
 it('sends search and pagination values', async () => { render(<StaffQueuePage />); fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'printer' } }); await waitFor(() => expect(api.fetchStaffQueue).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'printer', pageSize: 10 }))); });
});
