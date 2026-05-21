import { useMutation } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { AuthRequiredError, login, logout, requestTransformerTrace } from '../api/traceApiClient';
import type { TraceRequest, TransformerTrace } from '../transformer-ir/traceTypes';
import { ErrorPanel } from '../components/ErrorPanel';
import { LoadingPanel } from '../components/LoadingPanel';
import { useTraceStore } from '../state/useTraceStore';
import { AuthPanel } from '../components/AuthPanel';

const TransformerScene = lazy(() => import('../scenes/TransformerScene').then((module) => ({ default: module.TransformerScene })));
const defaultPrompt = 'The cat sat on the';

export function AppShell() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { trace, setTrace, selectedTokenIndex, selectedLayerIndex, selectedHeadIndex, setSelectedTokenIndex, setSelectedLayerIndex, setSelectedHeadIndex, traceDiagnostics, setTraceSourceStatus, setTraceError, pipelineDebug, setPipelineDebug } = useTraceStore();

  const traceMutation = useMutation<{ trace: TransformerTrace; rawSummary: any }, Error, TraceRequest>({
    mutationFn: (req) => requestTransformerTrace(req),
    onMutate: () => {
      setTraceSourceStatus('loading');
      setTraceError(undefined);
      setPipelineDebug({ ...(pipelineDebug ?? { buttonClicks: 0, rawAttention: false, rawTopK: false, rawResidual: false, normalizedAttention: false, normalizedTopK: false, normalizedResidual: false, fallbackUsed: false, authLoggedIn: false }), buttonClicks: (pipelineDebug?.buttonClicks ?? 0) + 1, authLoggedIn: isAuthenticated });
    },
    onSuccess: ({ trace: t, rawSummary }) => {
      setTraceSourceStatus('live-success');
      setTrace(t);
      setPipelineDebug({
        buttonClicks: pipelineDebug?.buttonClicks ?? 0,
        lastRequestUrl: rawSummary.url,
        lastResponseStatus: rawSummary.status,
        rawTraceId: rawSummary.traceId,
        rawAttention: rawSummary.hasAttention,
        rawTopK: rawSummary.hasTopK,
        rawResidual: rawSummary.hasResidual,
        normalizedAttention: t.layers.some((l) => l.attention.heads.length > 0),
        normalizedTopK: t.output.nextTokenTopK.length > 0,
        normalizedResidual: t.layers.some((l) => l.residualStream.tokenNormsAfterMlp.length > 0 || (l.residualStream.tokenMeanAfterMlp?.length ?? 0) > 0),
        fallbackUsed: false,
        authLoggedIn: isAuthenticated,
      });
    },
    onError: (e) => {
      if (e instanceof AuthRequiredError) {
        setShowAuthPanel(true);
        setTraceSourceStatus('failed');
        setTraceError('Authentication required for live traces.');
        return;
      }
      setTraceSourceStatus('failed');
      setTraceError(e.message);
      setPipelineDebug({ ...(pipelineDebug ?? { buttonClicks: 0, rawAttention: false, rawTopK: false, rawResidual: false, normalizedAttention: false, normalizedTopK: false, normalizedResidual: false, fallbackUsed: true, authLoggedIn: false }), fallbackUsed: true, authLoggedIn: isAuthenticated });
    }
  });

  return <main className='app-shell'>
    <div className='visual-panel'>{trace ? <Suspense fallback={<div className='empty-scene'>Loading 3D renderer…</div>}><TransformerScene trace={trace} diagnostics={traceDiagnostics} selectedTokenIndex={selectedTokenIndex} selectedLayerIndex={selectedLayerIndex} selectedHeadIndex={selectedHeadIndex} onSelectToken={setSelectedTokenIndex} onSelectLayer={setSelectedLayerIndex} onSelectHead={setSelectedHeadIndex} /></Suspense> : null}</div>
    <section className='controls-panel overlay-panel'>
      <label htmlFor='prompt'>Prompt</label><textarea id='prompt' value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} />
      <div className='button-row'>
        <button onClick={() => traceMutation.mutate({ prompt, maxGeneratedTokens: 1, topK: 10 })} disabled={!isAuthenticated || traceMutation.isPending}>Generate trace</button>
        {!isAuthenticated ? <button className='secondary' onClick={() => setShowAuthPanel(true)}>Login</button> : null}
        {isAuthenticated ? <button className='secondary' onClick={() => logout().then(() => setIsAuthenticated(false))}>Logout</button> : null}
      </div>
      {!isAuthenticated ? <p className='hint'>Live API trace requires login.</p> : null}
      {traceMutation.isPending ? <LoadingPanel /> : null}
      {traceDiagnostics.lastError ? <ErrorPanel message={traceDiagnostics.lastError} /> : null}
      {process.env.NODE_ENV !== 'production' ? <details><summary>Trace Pipeline Debug</summary><pre>{JSON.stringify({ traceStatus: traceDiagnostics.sourceStatus, ...pipelineDebug, storeTopK: trace?.output.nextTokenTopK.length ?? 0, storeHeads: trace?.layers[0]?.attention.heads.length ?? 0 }, null, 2)}</pre></details> : null}
    </section>
    <AuthPanel open={showAuthPanel} isLoading={false} errorMessage={authError} onSubmit={(password) => login(password).then(() => { setIsAuthenticated(true); setShowAuthPanel(false); setAuthError(null); }).catch((e: Error) => setAuthError(e.message))} onClose={() => setShowAuthPanel(false)} />
  </main>;
}
