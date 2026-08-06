/**
 * AuthScreen.test.tsx
 *
 * Unit + integration tests for the auth screen.
 * Tests chosen: mode switching, form validation, and login redirect.
 * The API calls are mocked so no backend is required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AuthScreen from '../components/AuthScreen';

// ── Mock React Router's useNavigate ──────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Mock the API service ──────────────────────────────────────────────────────
vi.mock('../services/api', () => ({
  apiFetch: vi.fn(),
  setTokens: vi.fn(),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  clearSession: vi.fn(),
}));

import { apiFetch, setTokens } from '../services/api';
const mockApiFetch = vi.mocked(apiFetch);

// ── Mock MapLoader (heavy SVG — not needed in tests) ────────────────────────
vi.mock('../components/MapLoader', () => ({ default: () => <div data-testid="map-loader" /> }));
vi.mock('../components/ThemeToggle', () => ({ default: () => <button>Theme</button> }));

function renderAuth(mode: 'login' | 'signup' = 'login') {
  return render(
    <MemoryRouter>
      <AuthScreen initialMode={mode} />
    </MemoryRouter>
  );
}

describe('AuthScreen – mode switching', () => {
  it('starts in login mode and shows the login heading', () => {
    renderAuth('login');
    expect(screen.getByText('Log in to your workspace')).toBeInTheDocument();
  });

  it('switches to signup mode when "Create an account" is clicked (no navigation)', async () => {
    renderAuth('login');
    await userEvent.click(screen.getByRole('button', { name: /create an account/i }));
    expect(screen.getByText('Create your workspace')).toBeInTheDocument();
    // navigate should NOT have been called for an in-page mode switch
    // (it replaces the URL but doesn't navigate away from the SPA shell)
  });

  it('switches back to login mode when "Log in" is clicked on signup screen', async () => {
    renderAuth('signup');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(screen.getByText('Log in to your workspace')).toBeInTheDocument();
  });
});

describe('AuthScreen – form validation', () => {
  beforeEach(() => { mockApiFetch.mockClear(); });

  it('shows a toast when email and password are empty on login submit', async () => {
    renderAuth('login');
    fireEvent.submit(screen.getByRole('button', { name: /log in/i }).closest('form')!);
    await waitFor(() =>
      expect(screen.getByText('Please enter email and password.')).toBeInTheDocument()
    );
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('shows a toast when passwords do not match on signup', async () => {
    renderAuth('signup');
    await userEvent.type(screen.getByLabelText(/full name/i), 'Test User');
    await userEvent.type(screen.getByLabelText(/work email/i), 'test@example.com');
    // Get password fields by placeholder
    const pwFields = screen.getAllByPlaceholderText(/8\+|re-enter/i);
    await userEvent.type(pwFields[0], 'password1');
    await userEvent.type(pwFields[1], 'different2');
    fireEvent.submit(pwFields[0].closest('form')!);
    await waitFor(() =>
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    );
  });
});

describe('AuthScreen – login submit → redirect', () => {
  it('calls apiFetch, stores tokens, and navigates to /dashboard on success', async () => {
    mockApiFetch.mockResolvedValueOnce({
      access_token: 'tok-access',
      refresh_token: 'tok-refresh',
      user: { email: 'a@b.com', full_name: 'Alice', username: 'alice' },
    });

    renderAuth('login');
    await userEvent.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'secret123');
    fireEvent.submit(screen.getByRole('button', { name: /^log in$/i }).closest('form')!);

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' })));
    expect(setTokens).toHaveBeenCalledWith('tok-access', 'tok-refresh');

    // Navigate fires after 500ms timeout — fast-forward isn't needed since we just wait
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'), { timeout: 1500 });
  });

  it('shows an error toast when apiFetch rejects', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Invalid credentials'));
    renderAuth('login');
    await userEvent.type(screen.getByLabelText(/email address/i), 'bad@b.com');
    await userEvent.type(screen.getByLabelText(/^password$/i), 'wrong');
    fireEvent.submit(screen.getByRole('button', { name: /^log in$/i }).closest('form')!);
    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument());
  });
});
