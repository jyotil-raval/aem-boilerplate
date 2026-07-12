// @ts-check
// EDS ships zero-build — no JSX, no bundler. React.createElement + JSDoc
// is the lightweight-typing compromise for a codebase that's TS-by-default
// but can't run a compile step on this file without breaking the block model.
// CDN ESM imports below aren't filesystem-resolvable — airbnb-base's
// extension/resolution rules don't apply to them.
// eslint-disable-next-line import/no-unresolved, import/extensions
import React, { useState } from 'https://esm.sh/react@18.3.1';
// eslint-disable-next-line import/no-unresolved, import/extensions
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';

/**
 * @returns {import('https://esm.sh/react@18.3.1').ReactElement}
 */
function Counter() {
  const [count, setCount] = useState(0);

  return React.createElement(
    'div',
    { className: 'react-demo-counter' },
    React.createElement('p', null, `Count: ${count}`),
    React.createElement('button', { type: 'button', onClick: () => setCount((c) => c + 1) }, 'Increment')
  );
}

/**
 * EDS block decoration entry point. EDS calls this with the block's own
 * <div> once it's in the DOM — everything the block owns lives inside it.
 * @param {HTMLElement} block
 */
export default function decorate(block) {
  const mountPoint = document.createElement('div');
  mountPoint.className = 'react-demo-root';

  // Block arrives with authored table content (text/rows from the doc
  // source) — clear it before mounting the React tree in its place.
  block.textContent = '';
  block.append(mountPoint);

  const root = createRoot(mountPoint);
  root.render(React.createElement(Counter));
}
