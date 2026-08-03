/**
 * CodeViewer — thin wrapper re-exporting CodeBlock as the default code viewer.
 */
import React from 'react';
import { CodeBlock } from './CodeBlock';

export function CodeViewer(props: React.ComponentProps<typeof CodeBlock>) {
  return <CodeBlock {...props} />;
}
