import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';

vi.mock('../src/scenes/TransformerScene', () => ({ TransformerScene: () => <div data-testid='mock-transformer-scene' /> }));

describe('App auth controls', () => {
  it('logged out shows Login and hides Logout', async () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });

  it('successful login closes modal and shows logout', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByRole('dialog', { name: /login required/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    const dialog = screen.getByRole('dialog', { name: /login required/i });
    fireEvent.click(dialog.querySelector('button[type="submit"]') as HTMLButtonElement);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /login required/i })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
