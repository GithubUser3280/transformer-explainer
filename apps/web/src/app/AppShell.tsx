import { useMutation } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthRequiredError, login, logout, requestTransformerTrace } from '../api/traceApiClient';
import type { TraceRequest, TransformerTrace } from '../transformer-ir/traceTypes';
import { ErrorPanel } from '../components/ErrorPanel';
import { LoadingPanel } from '../components/LoadingPanel';
import { useTraceStore } from '../state/useTraceStore';
import { createFakeTrace } from '../transformer-ir/fakeTrace';
import { AuthPanel } from '../components/AuthPanel';

const TransformerScene = lazy(() => import('../scenes/TransformerScene').then((module) => ({ default: module.TransformerScene })));

const defaultPrompt = 'A transformer routes token information through attention heads and a gated MLP.';

export function AppShell() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingTraceRequest, setPendingTraceRequest] = useState<TraceRequest | null>(null);
  const { trace, selection, setTrace, setSelection, selectedOperation } = useTraceStore();
  const traceMutation = useMutation<TransformerTrace, Error, TraceRequest>({
    mutationFn: (traceRequest) => requestTransformerTrace(traceRequest),
    onSuccess: (nextTrace) => {
      setTrace(nextTrace);
      setPendingTraceRequest(null);
      setShowAuthPanel(false);
      setAuthError(null);
      setIsAuthenticated(true);
    },
    onError: (error, traceRequest) => {
      if (error instanceof AuthRequiredError) {
        setPendingTraceRequest(traceRequest);
        setShowAuthPanel(true);
      }
    }
  });

  const loginMutation = useMutation({
    mutationFn: (password: string) => login(password),
    onSuccess: async () => {
      setAuthError(null);
      setIsAuthenticated(true);
      if (pendingTraceRequest) {
        await traceMutation.mutateAsync(pendingTraceRequest);
        return;
      }
      setShowAuthPanel(false);
    },
    onError: (error: Error) => {
      setAuthError(error.message);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      setIsAuthenticated(false);
      setShowAuthPanel(false);
      setAuthError(null);
      setPendingTraceRequest(null);
    }
  });

  const operation = selectedOperation?.();
  const selectedToken = trace?.tokens.find((token) => token.tokenIndex === selection.tokenIndex);
  const selectedLayer = trace?.layers.find((layer) => layer.layerIndex === selection.layerIndex);

  useEffect(() => {
    if (!trace) {
      setTrace(createFakeTrace(defaultPrompt));
    }
  }, [setTrace, trace]);

  function loadFakeTrace() {
    setTrace(createFakeTrace(prompt));
  }

  function handleGenerateTrace() {
    traceMutation.mutate({ prompt });
  }

  return (
    <main className="app-shell">
      <div className="visual-panel">
        {trace ? (
          <Suspense fallback={<div className="empty-scene">Loading 3D renderer…</div>}>
            <TransformerScene trace={trace} onTokenSelect={(tokenIndex) => setSelection({ tokenIndex })} />
          </Suspense>
        ) : (
          <div className="empty-scene" data-testid="scene-shell">Click “Use fake trace” to load the local scene.</div>
        )}
      </div>

      <section className="landing-panel overlay-panel">
        <p className="eyebrow">Model-agnostic TransformerTrace IR</p>
        <h1>Explore decoder-only LLM internals as compact 3D traces.</h1>
        <p>
          The browser renders a canonical trace locally. A backend can later summarize Qwen, Gemma, Mistral, or other modern models without changing the scene renderer.
        </p>
      </section>

      <section className="controls-panel overlay-panel" aria-label="Trace controls">
        <label htmlFor="prompt">Prompt</label>
        <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} />
        <div className="button-row">
          <button type="button" onClick={handleGenerateTrace} disabled={traceMutation.isPending || loginMutation.isPending}>
            Generate trace
          </button>
          <button type="button" className="secondary" onClick={loadFakeTrace}>
            Use fake trace
          </button>
          <button type="button" className="secondary" onClick={() => setShowAuthPanel(true)} disabled={isAuthenticated || loginMutation.isPending}>
            Login
          </button>
          <button type="button" className="secondary" onClick={() => logoutMutation.mutate()} disabled={!isAuthenticated || logoutMutation.isPending}>
            {logoutMutation.isPending ? 'Logging out…' : 'Logout'}
          </button>
        </div>
        {traceMutation.isPending ? <LoadingPanel /> : null}
        {traceMutation.isError && !(traceMutation.error instanceof AuthRequiredError) ? <ErrorPanel message={traceMutation.error.message} /> : null}
        <p className="hint">Real traces call same-origin <code>/api/trace</code>; fake traces never download a model.</p>
      </section>

      <aside className="side-panel overlay-panel" aria-label="Trace selection details">
        <h2>Selection</h2>
        <dl>
          <dt>Model</dt>
          <dd>{trace?.modelMetadata.modelId ?? 'No trace loaded'}</dd>
          <dt>Token</dt>
          <dd>{selectedToken ? `${selectedToken.tokenIndex}: ${selectedToken.text}` : 'None'}</dd>
          <dt>Layer</dt>
          <dd>{selectedLayer ? `${selectedLayer.layerIndex} · ${selectedLayer.displayName}` : 'None'}</dd>
          <dt>Head</dt>
          <dd>{selection.headIndex ?? 'Auto-selected summary'}</dd>
          <dt>Operation</dt>
          <dd>{operation ? `${operation.displayName} (${operation.kind})` : 'Choose a layer operation later'}</dd>
        </dl>
        {trace?.warnings.length ? <p className="warning">{trace.warnings[0]}</p> : null}
      </aside>

      <AuthPanel
        open={showAuthPanel}
        isLoading={loginMutation.isPending}
        errorMessage={authError}
        onSubmit={(password) => loginMutation.mutate(password)}
        onClose={() => {
          setShowAuthPanel(false);
          setAuthError(null);
        }}
      />
    </main>
  );
}
