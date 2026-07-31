/**
 * ThemeToggle.test.tsx
 *
 * Unit tests for the ThemeToggle component.
 * Verifies that clicking the toggle: (1) adds/removes the .dark class on
 * <html>, and (2) persists the preference to localStorage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

function renderToggle(initialStoredTheme?: string) {
  if (initialStoredTheme) {
    localStorage.setItem('socialpilot-theme', initialStoredTheme);
  } else {
    localStorage.removeItem('socialpilot-theme');
  }
  // ThemeProvider reads localStorage on mount, so wrap the toggle in it
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('renders a toggle button', () => {
    renderToggle();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('adds .dark class to <html> after clicking from light mode', async () => {
    renderToggle('light');
    await userEvent.click(screen.getByRole('button'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes .dark class from <html> after clicking from dark mode', async () => {
    document.documentElement.classList.add('dark');
    renderToggle('dark');
    await userEvent.click(screen.getByRole('button'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists "dark" to localStorage after toggling to dark', async () => {
    renderToggle('light');
    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem('socialpilot-theme')).toBe('dark');
  });

  it('persists "light" to localStorage after toggling back to light', async () => {
    document.documentElement.classList.add('dark');
    renderToggle('dark');
    await userEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem('socialpilot-theme')).toBe('light');
  });
});
