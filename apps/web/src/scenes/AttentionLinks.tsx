import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import type { AttentionLink, TokenTrace } from '../transformer-ir/traceTypes';

interface AttentionLinksProps {
  links: AttentionLink[];
  tokens: TokenTrace[];
}

export function AttentionLinks({ links, tokens }: AttentionLinksProps) {
  const tokenCount = Math.max(1, tokens.length);
  const sparseLinks = useMemo(() => links.slice(0, 40), [links]);

  return (
    <group>
      {sparseLinks.map((link, index) => {
        const sourceX = link.sourceTokenIndex * 0.72 - (tokenCount - 1) * 0.36;
        const targetX = link.targetTokenIndex * 0.72 - (tokenCount - 1) * 0.36;
        const arcHeight = 0.35 + Math.abs(sourceX - targetX) * 0.22;
        return (
          <Line
            key={`${link.layerIndex}-${link.headIndex ?? 0}-${link.sourceTokenIndex}-${link.targetTokenIndex}-${index}`}
            points={[
              [sourceX, -1.05, 0.04],
              [(sourceX + targetX) / 2, -1.05 + arcHeight, 0.04],
              [targetX, -1.05, 0.04]
            ]}
            color="#f59e0b"
            lineWidth={Math.max(1, link.weight * 3)}
            transparent
            opacity={0.55}
          />
        );
      })}
    </group>
  );
}
