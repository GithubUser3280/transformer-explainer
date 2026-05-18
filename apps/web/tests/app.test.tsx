import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { requestTransformerTrace } from '../src/api/traceApiClient';
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
    expect(await screen.findByTestId('mock-transformer-scene')).toBeInTheDocument();
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
    expect(fetchMock).toHaveBeenCalledWith('/api/trace', expect.objectContaining({ method: 'POST' }));
  });
});
