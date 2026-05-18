import { useMutation } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useState } from 'react';
import { requestTransformerTrace } from '../api/traceApiClient';
import type { TraceRequest, TransformerTrace } from '../transformer-ir/traceTypes';
import { ErrorPanel } from '../components/ErrorPanel';
import { LoadingPanel } from '../components/LoadingPanel';
import { useTraceStore } from '../state/useTraceStore';
import { createFakeTrace } from '../transformer-ir/fakeTrace';

const TransformerScene = lazy(() => import('../scenes/TransformerScene').then((module) => ({ default: module.TransformerScene })));

const defaultPrompt = 'A transformer routes token information through attention heads and a gated MLP.';

export function AppShell() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const { trace, selection, setTrace, setSelection, selectedOperation } = useTraceStore();
  const mutation = useMutation<TransformerTrace, Error, TraceRequest>({
    mutationFn: (traceRequest) => requestTransformerTrace(traceRequest),
    onSuccess: setTrace
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

  return (
    <main className="app-shell">
      <section className="landing-panel">
        <p className="eyebrow">Model-agnostic TransformerTrace IR</p>
        <h1>Explore decoder-only LLM internals as compact 3D traces.</h1>
        <p>
          The browser renders a canonical trace locally. A backend can later summarize Qwen, Gemma, Mistral, or other modern models without changing the scene renderer.
        </p>
      </section>

      <section className="workspace">
        <div className="controls-panel">
          <label htmlFor="prompt">Prompt</label>
          <textarea id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} />
          <div className="button-row">
            <button type="button" onClick={() => mutation.mutate({ prompt })} disabled={mutation.isPending}>
              Generate trace
            </button>
            <button type="button" className="secondary" onClick={loadFakeTrace}>
              Use fake trace
            </button>
          </div>
          {mutation.isPending ? <LoadingPanel /> : null}
          {mutation.isError ? <ErrorPanel message={mutation.error.message} /> : null}
          <p className="hint">Real traces call same-origin <code>/api/trace</code>; fake traces never download a model.</p>
        </div>

        <div className="visual-panel">
          {trace ? (
            <Suspense fallback={<div className="empty-scene">Loading 3D renderer…</div>}>
              <TransformerScene trace={trace} onTokenSelect={(tokenIndex) => setSelection({ tokenIndex })} />
            </Suspense>
          ) : (
            <div className="empty-scene" data-testid="scene-shell">Click “Use fake trace” to load the local scene.</div>
          )}
        </div>

        <aside className="side-panel" aria-label="Trace selection details">
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
      </section>
    </main>
  );
}
