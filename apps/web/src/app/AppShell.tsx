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
const defaultPrompt = 'The cat sat';

export function AppShell() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { trace, setTrace, selectedTokenIndex, selectedLayerIndex, selectedHeadIndex, setSelectedTokenIndex, setSelectedLayerIndex, setSelectedHeadIndex } = useTraceStore();

  const traceMutation = useMutation<TransformerTrace, Error, TraceRequest>({ mutationFn: (req) => requestTransformerTrace(req), onSuccess: setTrace });

  useEffect(() => { if (!trace) setTrace(createFakeTrace(defaultPrompt)); }, [trace, setTrace]);

  return <main className='app-shell'>
    <div className='visual-panel'>{trace ? <Suspense fallback={<div className='empty-scene'>Loading 3D renderer…</div>}><TransformerScene trace={trace} onTokenSelect={setSelectedTokenIndex} /></Suspense> : null}</div>
    <section className='controls-panel overlay-panel'>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
      <div className='button-row'>
        <button onClick={() => traceMutation.mutate({ prompt, maxGeneratedTokens: 1, topK: 10 })}>Generate trace</button>
        <button className='secondary' onClick={() => setTrace(createFakeTrace(prompt))}>Use fake trace</button>
        <button className='secondary' onClick={() => setShowAuthPanel(true)} disabled={isAuthenticated}>Login</button>
        <button className='secondary' onClick={() => logout()} disabled={!isAuthenticated}>Logout</button>
      </div>
      {traceMutation.isPending ? <LoadingPanel /> : null}
      {traceMutation.isError && !(traceMutation.error instanceof AuthRequiredError) ? <ErrorPanel message={traceMutation.error.message} /> : null}
    </section>
    <aside className='side-panel overlay-panel'><h2>Selection</h2><p>Token {selectedTokenIndex} / Layer {selectedLayerIndex} / Head {selectedHeadIndex}</p>
      <button onClick={() => setSelectedLayerIndex(Math.max(0, selectedLayerIndex - 1))}>Prev Layer</button>
      <button onClick={() => setSelectedLayerIndex(selectedLayerIndex + 1)}>Next Layer</button>
      <button onClick={() => setSelectedHeadIndex(Math.max(0, selectedHeadIndex - 1))}>Prev Head</button>
      <button onClick={() => setSelectedHeadIndex(selectedHeadIndex + 1)}>Next Head</button>
    </aside>
    <AuthPanel open={showAuthPanel} isLoading={false} errorMessage={authError} onSubmit={(password) => login(password).then(() => setIsAuthenticated(true)).catch((e: Error) => setAuthError(e.message))} onClose={() => setShowAuthPanel(false)} />
  </main>;
}
