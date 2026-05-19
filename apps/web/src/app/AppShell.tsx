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
const defaultPrompt = 'The cat sat on the';

export function AppShell() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { trace, setTrace, selectedTokenIndex, selectedLayerIndex, selectedHeadIndex, setSelectedTokenIndex, setSelectedLayerIndex, setSelectedHeadIndex, isLoading, setLoading, error, setError, usingFixtureFallback, setUsingFixtureFallback } = useTraceStore();

  const traceMutation = useMutation<TransformerTrace, Error, TraceRequest>({
    mutationFn: (req) => requestTransformerTrace(req),
    onMutate: () => { setLoading(true); setError(undefined); setUsingFixtureFallback(false); },
    onSuccess: (t) => { setTrace(t); setLoading(false); },
    onError: (e) => { setLoading(false); if (e instanceof AuthRequiredError) { setShowAuthPanel(true); return; } setError(e.message); const fallback = createFakeTrace(prompt); fallback.warnings = [...(fallback.warnings ?? []), 'Showing fixture fallback because API request failed']; setTrace(fallback); setUsingFixtureFallback(true); }
  });

  useEffect(() => { if (!trace) setTrace(createFakeTrace(defaultPrompt)); }, [trace, setTrace]);

  return <main className='app-shell'>
    <div className='visual-panel'>{trace ? <Suspense fallback={<div className='empty-scene'>Loading 3D renderer…</div>}><TransformerScene trace={trace} selectedTokenIndex={selectedTokenIndex} selectedLayerIndex={selectedLayerIndex} selectedHeadIndex={selectedHeadIndex} onSelectToken={setSelectedTokenIndex} onSelectLayer={setSelectedLayerIndex} onSelectHead={setSelectedHeadIndex} /></Suspense> : null}</div>
    <section className='controls-panel overlay-panel'>
      <label htmlFor='prompt'>Prompt</label><textarea id='prompt' value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
      <div className='button-row'>
        <button onClick={() => traceMutation.mutate({ prompt, maxGeneratedTokens: 1, topK: 10 })}>Generate trace</button>
        <button className='secondary' onClick={() => { setTrace(createFakeTrace(prompt)); setUsingFixtureFallback(true); }}>Use fixture trace</button>
        <button className='secondary' onClick={() => setShowAuthPanel(true)} disabled={isAuthenticated}>Login</button>
        <button className='secondary' onClick={() => logout()} disabled={!isAuthenticated}>Logout</button>
      </div>
      {isLoading ? <LoadingPanel /> : null}
      {error ? <ErrorPanel message={error} /> : null}
      {usingFixtureFallback ? <p className='warning'>Fixture fallback active.</p> : null}
    </section>
    <AuthPanel open={showAuthPanel} isLoading={false} errorMessage={authError} onSubmit={(password) => login(password).then(() => setIsAuthenticated(true)).catch((e: Error) => setAuthError(e.message))} onClose={() => setShowAuthPanel(false)} />
  </main>;
}
