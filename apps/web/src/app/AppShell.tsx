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
  const { trace, setTrace, selectedTokenIndex, selectedLayerIndex, selectedHeadIndex, setSelectedTokenIndex, setSelectedLayerIndex, setSelectedHeadIndex, traceDiagnostics, setTraceSourceStatus, setTraceError } = useTraceStore();

  const traceMutation = useMutation<TransformerTrace, Error, TraceRequest>({
    mutationFn: (req) => {
      console.info('Trace fetch started', req);
      return requestTransformerTrace(req);
    },
    onMutate: () => { setTraceSourceStatus('loading'); setTraceError(undefined); },
    onSuccess: (t) => {
      console.info('Live trace parsed successfully', { source: 'live-success', tokens: t.input.tokens.length, sampledLayers: t.layers.map((l) => l.layerIndex), headsPerLayer: t.layers.map((l) => l.attention.heads.length), hasTopK: t.output.nextTokenTopK.length > 0, hasResidual: t.layers.some((l) => l.residualStream.tokenNormsAfterMlp.length > 0) });
      setTraceSourceStatus('live-success');
      setTrace(t);
    },
    onError: (e) => {
      if (e instanceof AuthRequiredError) {
        setShowAuthPanel(true);
        setTraceSourceStatus('failed');
        setTraceError('Authentication required for live traces.');
        return;
      }
      console.error('Trace fetch/validation failed; using fixture fallback.', e);
      const fallback = createFakeTrace(prompt);
      fallback.warnings = [...(fallback.warnings ?? []), `Fixture fallback active: ${e.message}`];
      setTraceSourceStatus('fallback-after-failure');
      setTraceError(e.message);
      setTrace(fallback);
      console.info('Fixture fallback used', { model: fallback.model.name, tokens: fallback.input.tokens.length, layers: fallback.layers.length });
    }
  });

  useEffect(() => {
    if (!trace) {
      setTraceSourceStatus('fixture-success');
      setTrace(createFakeTrace(defaultPrompt));
    }
  }, [trace, setTrace, setTraceSourceStatus]);

  const canGenerateLiveTrace = isAuthenticated;

  return <main className='app-shell'>
    <div className='visual-panel'>{trace ? <Suspense fallback={<div className='empty-scene'>Loading 3D renderer…</div>}><TransformerScene trace={trace} diagnostics={traceDiagnostics} selectedTokenIndex={selectedTokenIndex} selectedLayerIndex={selectedLayerIndex} selectedHeadIndex={selectedHeadIndex} onSelectToken={setSelectedTokenIndex} onSelectLayer={setSelectedLayerIndex} onSelectHead={setSelectedHeadIndex} /></Suspense> : null}</div>
    <section className='controls-panel overlay-panel'>
      <label htmlFor='prompt'>Prompt</label><textarea id='prompt' value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
      <div className='button-row'>
        <button onClick={() => traceMutation.mutate({ prompt, maxGeneratedTokens: 1, topK: 10 })} disabled={!canGenerateLiveTrace || traceMutation.isPending}>Generate trace</button>
        <button className='secondary' onClick={() => { setTraceSourceStatus('fixture-success'); setTrace(createFakeTrace(prompt)); }}>Use fixture trace</button>
        {!isAuthenticated ? <button className='secondary' onClick={() => setShowAuthPanel(true)}>Login</button> : null}
        {isAuthenticated ? <button className='secondary' onClick={() => logout().then(() => setIsAuthenticated(false))}>Logout</button> : null}
      </div>
      {!isAuthenticated ? <p className='hint'>Live API trace requires login. Fixture mode remains available.</p> : null}
      {traceMutation.isPending ? <LoadingPanel /> : null}
      {traceDiagnostics.lastError ? <ErrorPanel message={traceDiagnostics.lastError} /> : null}
      {traceDiagnostics.sourceStatus === 'fallback-after-failure' ? <p className='warning'>Fixture fallback active after live failure.</p> : null}
    </section>
    <AuthPanel open={showAuthPanel} isLoading={false} errorMessage={authError} onSubmit={(password) => login(password).then(() => { setIsAuthenticated(true); setShowAuthPanel(false); setAuthError(null); }).catch((e: Error) => setAuthError(e.message))} onClose={() => setShowAuthPanel(false)} />
  </main>;
}
