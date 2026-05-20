import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const enrichedResponse = {
  schemaVersion: '1.0',
  traceId: 'e2e-live-trace',
  model: { name: 'Qwen/Qwen3-0.6B-Base', architecture: 'qwen2', numLayers: 17, numHeads: 16, keyValueHeads: 8, hiddenSize: 1024, vocabSize: 151936, sampledLayerIndices: [0, 4, 8, 12, 14, 16] },
  input: { prompt: 'The cat sat on the', tokens: [{ index: 0, id: 1, text: 'The' }, { index: 1, id: 2, text: ' cat' }, { index: 2, id: 3, text: ' sat' }, { index: 3, id: 4, text: ' on' }, { index: 4, id: 5, text: ' the' }] },
  embedding: { tokenEmbeddingPreview: [], positionEmbeddingPreview: [], previewDimensions: 16 },
  layers: [{ layerIndex: 0, residualStream: { tokenNormsBefore: [1, 1, 1, 1, 1], tokenNormsAfterAttention: [1.1, 1.1, 1.1, 1.1, 1.1], tokenNormsAfterMlp: [1.2, 1.2, 1.2, 1.2, 1.2], tokenMeanAfterMlp: [0.1, 0.1, 0.1, 0.1, 0.1], tokenMaxAbsAfterMlp: [2, 2, 2, 2, 2] }, attention: { heads: Array.from({ length: 16 }, (_, h) => ({ headIndex: h, weights: Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => (c <= r ? 1 / (r + 1) : 0))), queryPreview: null, keyPreview: null, valuePreview: null })) }, hiddenStatePreview: [] }],
  output: { nextTokenTopK: [{ tokenId: 6, text: ' mat', logit: 3.1, probability: 0.42 }, { tokenId: 7, text: ' floor', logit: 2.2, probability: 0.2 }] },
  limits: { maxSequenceTokens: 32, previewDimensions: 16, returnedLayers: 1, returnedHeadsPerLayer: 16 },
  warnings: ['Q/K/V previews are null in v1.']
};

test('generate trace path keeps enriched fields through HUD and scene', async ({ page }) => {
  await page.route('**/login', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/trace', async (route) => {
    const req = route.request();
    fs.mkdirSync('../../artifacts', { recursive: true });
    fs.writeFileSync('../../artifacts/browser-generate-trace-response.json', JSON.stringify(enrichedResponse, null, 2));
    fs.writeFileSync('../../artifacts/browser-generate-trace-summary.json', JSON.stringify({ url: req.url(), method: req.method(), postData: req.postDataJSON(), status: 200, keys: Object.keys(enrichedResponse), firstLayerKeys: Object.keys(enrichedResponse.layers[0]), firstLayerHeadCount: enrichedResponse.layers[0].attention.heads.length, topKLength: enrichedResponse.output.nextTokenTopK.length, hasResidual: enrichedResponse.layers[0].residualStream.tokenNormsAfterMlp.length > 0 }, null, 2));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(enrichedResponse) });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('dialog', { name: 'Login required' }).locator('button[type="submit"]').click();
  await page.getByRole('button', { name: 'Generate trace' }).click();

  await expect(page.getByText(/Trace source:/)).toContainText('live-success');
  await expect(page.getByText(/Trace ID:/)).toContainText('e2e-live-trace');
  await expect(page.getByText(/Availability:/)).toContainText('attention yes');
  await expect(page.getByText(/Availability:/)).toContainText('top-k yes');
  await expect(page.getByText(/Availability:/)).toContainText('residual yes');
});
