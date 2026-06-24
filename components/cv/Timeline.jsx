import React from 'react';

/**
 * Vertical timeline rail. Place <JobCard> children inside; each renders its
 * own node on the rail.
 */
export function Timeline({ children, style = {}, ...rest }) {
  return (
    <div style={{ position: 'relative', paddingLeft: '30px', ...style }} {...rest}>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '6px',
          top: '8px',
          bottom: '8px',
          width: '1.5px',
          background:
            'linear-gradient(to bottom, var(--border) 0%, var(--border-strong) 20%, var(--border-strong) 80%, var(--border) 100%)',
        }}
      />
      {children}
    </div>
  );
}
