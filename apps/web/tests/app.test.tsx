import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { AuthRequiredError, login, requestTransformerTrace } from '../src/api/traceApiClient';
import { createFakeTrace } from '../src/transformer-ir/fakeTrace';
import { validateTransformerTrace } from '../src/transformer-ir/traceValidation';

vi.mock('../src/scenes/TransformerScene', () => ({
  TransformerScene: () => <div data-testid="mock-transformer-scene" />
}));

describe('App', () => {
  it('renders landing controls', async () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /generate trace/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /use fake trace/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(await screen.findByTestId('mock-transformer-scene')).toBeInTheDocument();
  });

  it('shows password form when trace request returns 401', async () => {
    const fetchMock = vi
      .fn(async (input: RequestInfo | URL) => {
        if (String(input) === '/api/trace') {
          return new Response('{}', { status: 401 });
        }
        return new Response('{}', { status: 200 });
      }) as unknown as typeof fetch;

    vi.stubGlobal('fetch', fetchMock);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /generate trace/i }));

    expect(await screen.findByRole('dialog', { name: /login required/i })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe('trace validation', () => {
  it('accepts the local fake trace shape', () => {
    const trace = validateTransformerTrace(createFakeTrace('hello world'));
    expect(trace.modelMetadata.usesGroupedQueryAttention).toBe(true);
    expect(trace.layers[0]?.operations.some((operation) => operation.kind === 'attention')).toBe(true);
  });
});

describe('trace api client', () => {
  it('posts to same-origin /api/trace and validates the response', async () => {
    const fakeTrace = createFakeTrace('mocked fetch');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(fakeTrace), { status: 200 })) as unknown as typeof fetch;
    const trace = await requestTransformerTrace({ prompt: 'mocked fetch' }, fetchMock);
    expect(trace.traceId).toEqual(fakeTrace.traceId);
    expect(fetchMock).toHaveBeenCalledWith('/api/trace', expect.objectContaining({ method: 'POST', credentials: 'include' }));
  });

  it('sends login request with credentials include', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
    await login('secret', fetchMock);
    expect(fetchMock).toHaveBeenCalledWith('/login', expect.objectContaining({
      method: 'POST',
      credentials: 'include'
    }));
  });

  it('throws auth-required error on 401 trace response', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    await expect(requestTransformerTrace({ prompt: 'x' }, fetchMock)).rejects.toBeInstanceOf(AuthRequiredError);
  });
});
