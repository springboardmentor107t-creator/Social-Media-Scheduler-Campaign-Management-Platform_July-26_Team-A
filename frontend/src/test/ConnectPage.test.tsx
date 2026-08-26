/**
 * ConnectPage.test.tsx
 *
 * Integration tests for the Connect Accounts page.
 * Verifies that connected/pending/disconnected statuses render
 * the correct action buttons.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ConnectPage from '../pages/ConnectPage';

// ── Mock services/api ─────────────────────────────────────────────────────────
vi.mock('../services/api', () => ({
  apiFetch: vi.fn(),
  getAccessToken: vi.fn(() => null),
  setTokens: vi.fn(),
  clearSession: vi.fn(),
}));
import { apiFetch } from '../services/api';
const mockApiFetch = vi.mocked(apiFetch);

// ── Mock the stub module ──────────────────────────────────────────────────────
vi.mock('../components/DashboardShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
vi.mock('../lib/mockConnectAccounts', () => ({
  getConnectedAccounts: vi.fn(),
  disconnectAccount: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../components/ConfirmModal', () => ({
  default: ({ isOpen, onConfirm, onClose }: { isOpen: boolean; onConfirm: () => void; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="confirm-modal">
        <button onClick={onConfirm}>Disconnect</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

import { getConnectedAccounts, disconnectAccount } from '../lib/mockConnectAccounts';
const mockGet = vi.mocked(getConnectedAccounts);
const mockDisconnect = vi.mocked(disconnectAccount);

const MOCK_ACCOUNTS = [
  { platform: 'facebook',  displayName: 'Facebook',  handle: '@fb_handle', status: 'connected' as const },
  { platform: 'instagram', displayName: 'Instagram',                        status: 'pending' as const },
  { platform: 'linkedin',  displayName: 'LinkedIn',                         status: 'disconnected' as const },
];

function renderConnect() {
  return render(<MemoryRouter><ConnectPage /></MemoryRouter>);
}

describe('ConnectPage – status-based button rendering', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue(MOCK_ACCOUNTS);
    mockDisconnect.mockClear();
    mockApiFetch.mockResolvedValue({ connected: false, accounts: [] });
  });

  it('renders a Disconnect button for connected accounts', async () => {
    renderConnect();
    await waitFor(() => expect(screen.getByText('Facebook')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
  });

  it('renders a Reconnect button for pending-auth accounts', async () => {
    renderConnect();
    await waitFor(() => screen.getByText('Instagram'));
    expect(screen.getByRole('button', { name: /reconnect/i })).toBeInTheDocument();
  });

  it('renders a Connect button for disconnected accounts', async () => {
    renderConnect();
    await waitFor(() => screen.getByText('LinkedIn'));
    // "Connect" buttons — LinkedIn should have one
    const connectBtns = screen.getAllByRole('button', { name: /^connect$/i });
    expect(connectBtns.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ConnectPage – Sync All', () => {
  beforeEach(() => { mockGet.mockClear(); });

  it('re-fetches accounts when Sync all is clicked', async () => {
    mockGet.mockResolvedValue(MOCK_ACCOUNTS);
    renderConnect();
    await waitFor(() => screen.getByText('Facebook'));
    mockGet.mockResolvedValue(MOCK_ACCOUNTS); // second call
    await userEvent.click(screen.getByRole('button', { name: /sync all/i }));
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  });
});

describe('ConnectPage – disconnect flow', () => {
  it('opens confirm modal and calls disconnectAccount on confirm', async () => {
    mockGet.mockResolvedValue(MOCK_ACCOUNTS);
    renderConnect();
    await waitFor(() => screen.getByText('Facebook'));

    // Click the "Disconnect" card button (first match, in the card)
    const disconnectBtns = screen.getAllByRole('button', { name: /disconnect/i });
    await userEvent.click(disconnectBtns[0]);

    // Confirm modal should now be open
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    // Click the modal's own "Disconnect" confirm button
    const modalBtns = screen.getAllByRole('button', { name: /disconnect/i });
    await userEvent.click(modalBtns[modalBtns.length - 1]);

    await waitFor(() => expect(mockDisconnect).toHaveBeenCalledWith('facebook'));
  });
});
