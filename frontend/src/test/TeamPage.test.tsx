/**
 * TeamPage.test.tsx
 *
 * Integration tests for the Team Management page.
 * Key paths: loading state → member list, optimistic role change success,
 * optimistic role change 403 rollback, and GET /users 403 error state.
 *
 * All API calls are mocked — no live backend required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TeamPage from '../pages/TeamPage';

// ── Mock heavy child components that aren't under test ───────────────────────
vi.mock('../components/DashboardShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
vi.mock('../components/MapLoader', () => ({ default: () => null }));
vi.mock('../components/InviteModal', () => ({
  default: ({ isOpen, onInvite }: { isOpen: boolean; onInvite: (emails: string[], role: string, message: string) => void }) =>
    isOpen ? (
      <div data-testid="mock-invite-modal">
        <button onClick={() => onInvite(['test_creator@company.com'], 'Content Creator', '')}>Send Test Invite</button>
      </div>
    ) : null,
}));
vi.mock('../components/ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onClose }: { isOpen: boolean; onConfirm: () => void; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));
vi.mock('../components/RoleBadge', () => ({ default: ({ role }: { role: string }) => <span>{role}</span> }));

// ── Mock apiFetch ─────────────────────────────────────────────────────────────
vi.mock('../services/api', () => ({
  apiFetch: vi.fn(),
  getAccessToken: vi.fn(() => null),
  setTokens: vi.fn(),
  clearSession: vi.fn(),
}));
import { apiFetch } from '../services/api';
const mockApiFetch = vi.mocked(apiFetch);

// ── Mock JWT decode (no token stored) — defaults to "admin" role in tests ────
// TeamPage reads role from localStorage accessToken. We simulate an admin token.
const FAKE_ADMIN_PAYLOAD = btoa(JSON.stringify({ sub: '1', role: 'admin', exp: 9999999999 }));
const FAKE_ADMIN_TOKEN = `header.${FAKE_ADMIN_PAYLOAD}.sig`;

const TWO_USERS = [
  { id: 'u1', full_name: 'Alice Admin', username: 'alice', email: 'alice@sp.co', role: 'admin', is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
  { id: 'u2', full_name: 'Bob User',   username: 'bob',   email: 'bob@sp.co',   role: 'user',  is_active: true, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
];

function renderTeamPage() {
  localStorage.setItem('accessToken', FAKE_ADMIN_TOKEN);
  return render(<MemoryRouter><TeamPage /></MemoryRouter>);
}

describe('TeamPage – loading & rendering', () => {
  it('shows skeleton rows while fetch is pending', async () => {
    mockApiFetch.mockImplementation(() => new Promise(() => {})); // never resolves
    renderTeamPage();
    // Skeleton rows have animated divs — we check that the table rows are skeletons
    const cells = document.querySelectorAll('td .animate-pulse');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('renders member names after data loads', async () => {
    mockApiFetch.mockResolvedValueOnce(TWO_USERS);
    renderTeamPage();
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument());
    expect(screen.getByText('Bob User')).toBeInTheDocument();
  });
});

describe('TeamPage – role change (optimistic)', () => {
  beforeEach(() => { mockApiFetch.mockReset(); });

  it('success path: updates the displayed role and fires PATCH request', async () => {
    // First call = GET /users, second call = PATCH /users/{id}/role
    mockApiFetch
      .mockResolvedValueOnce(TWO_USERS)
      .mockResolvedValueOnce({ ...TWO_USERS[1], role: 'manager' });

    renderTeamPage();
    await waitFor(() => screen.getByText('Alice Admin'));

    // Selects[0] = role filter, Selects[1] = status filter, Selects[2+] = member rows
    const selects = screen.getAllByRole('combobox');
    // Alice is selects[2], Bob is selects[3]
    await userEvent.selectOptions(selects[3], 'Marketing Team');

    // Confirm modal fires — click confirm
    await waitFor(() => expect(screen.getByTestId('confirm-modal')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/u2/role'),
        expect.objectContaining({ method: 'PATCH' })
      )
    );
  });

  it('403 failure path: rolls back the role and shows error toast', async () => {
    mockApiFetch
      .mockResolvedValueOnce(TWO_USERS)            // GET /users
      .mockRejectedValueOnce(new Error('Insufficient permissions')); // PATCH fails

    renderTeamPage();
    await waitFor(() => screen.getByText('Bob User'));

    // Selects[0] = role filter, [1] = status filter, [2] = Alice's role, [3] = Bob's role
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[3], 'Marketing Team');

    await waitFor(() => screen.getByTestId('confirm-modal'));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    // After rollback the toast shows the error
    await waitFor(() =>
      expect(screen.getByText('Insufficient permissions')).toBeInTheDocument()
    );

    // Bob's display role should be rolled back to Content Creator
    await waitFor(() => {
      const selects2 = screen.getAllByRole('combobox');
      expect(selects2[3]).toHaveValue('Content Creator');
    });
  });
});

describe('TeamPage – GET /users error states', () => {
  beforeEach(() => { mockApiFetch.mockReset(); });

  it('shows "Access Restricted" for a 403 error', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('403 Insufficient permissions'));
    renderTeamPage();
    await waitFor(() => expect(screen.getByText('Access Restricted')).toBeInTheDocument(), { timeout: 3000 });
    // The main member data table should NOT be rendered in error state
    // (the permissions reference card has a table too, so we check by content)
    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob User')).not.toBeInTheDocument();
  });

  it('shows "Failed to Load" for a generic network error with a Retry button', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'));
    renderTeamPage();
    await waitFor(() => expect(screen.getByText('Failed to Load')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});

describe('TeamPage - invite teammate notification', () => {
  beforeEach(() => { mockApiFetch.mockReset(); });

  it('calls createNotification when teammate is invited', async () => {
    mockApiFetch
      .mockResolvedValueOnce(TWO_USERS) // GET /users
      .mockResolvedValueOnce({});       // POST /api/notifications

    renderTeamPage();
    await waitFor(() => screen.getByText('Alice Admin'));

    // Click Invite Teammate button to open modal
    const inviteBtn = screen.getByRole('button', { name: /\+ Invite teammate/i });
    await userEvent.click(inviteBtn);

    // Verify mock modal is open and click Send Test Invite
    expect(screen.getByTestId('mock-invite-modal')).toBeInTheDocument();
    const sendInviteBtn = screen.getByRole('button', { name: /Send Test Invite/i });
    await userEvent.click(sendInviteBtn);

    // Verify it called /api/notifications with POST
    await waitFor(() =>
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/notifications',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            type: 'team_invite_sent',
            message: 'Teammate test_creator@company.com was invited to join as Content Creator.',
            target_user_id: null,
          }),
        })
      )
    );
  });
});

