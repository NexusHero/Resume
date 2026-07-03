/* Vitest setup for the recruiting kit (ADR-0023). Runs before every web test
   file and reproduces, in jsdom, the three things main.jsx installs in the
   browser before the kit modules evaluate:

     1. window.React / window.ReactDOM — the kit references the global `React`
        (classic JSX: `React.createElement`, `React.useState`).
     2. jest-dom matchers (toBeInTheDocument, …) on Vitest's expect.
     3. A stub for the design-system bundle (window.MyJobDesignSystem_f3658e),
        so a component test does not have to load the whole _ds_bundle.js.

   A kit module publishes its symbols with `Object.assign(window, { … })` and
   reads its dependencies off `window`, so a test imports the file for its side
   effect and then reads the symbol under test off `window`. */
import '@testing-library/jest-dom/vitest';
import React from 'react';
import * as ReactDOM from 'react-dom';

globalThis.React = React;
globalThis.ReactDOM = ReactDOM;
window.React = React;
window.ReactDOM = ReactDOM;

/* Design-system stub. Every kit file starts with
   `const XX = window.MyJobDesignSystem_f3658e;` and then renders `XX.Something`.
   Rather than list every primitive, the stub is a Proxy: any accessed member is
   a passthrough component that renders a host element, forwards its event
   handlers and children, and tags itself with `data-ds="<Name>"` so tests can
   find it. A component using a member in a non-render way (a hook, a classname
   helper) can override just that member — see installDesignSystem() below. */
const stubCache = new Map();

function makeStubComponent(name) {
  function Stub(props) {
    const { children, ...rest } = props || {};
    const handlers = {};
    for (const key of Object.keys(rest)) {
      if (/^on[A-Z]/.test(key) && typeof rest[key] === 'function') handlers[key] = rest[key];
    }
    const clickable = typeof handlers.onClick === 'function';
    const hostProps = { 'data-ds': name, ...handlers };
    if (clickable) hostProps.type = 'button';
    return React.createElement(clickable ? 'button' : 'div', hostProps, children);
  }
  Stub.displayName = `DSStub(${name})`;
  return Stub;
}

function makeDesignSystemProxy(overrides = {}) {
  return new Proxy(overrides, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop === '__esModule') return target[prop];
      if (prop in target) return target[prop];
      if (!stubCache.has(prop)) stubCache.set(prop, makeStubComponent(String(prop)));
      return stubCache.get(prop);
    },
  });
}

/** Replace the design-system global with a stub, optionally providing real
    implementations for specific members. Returns the installed object. Call it
    before dynamically importing a component that uses a member the passthrough
    stub cannot fake (e.g. `const cx = DS.cx` used to build a className). */
globalThis.installDesignSystem = function installDesignSystem(overrides = {}) {
  const ds = makeDesignSystemProxy(overrides);
  window.MyJobDesignSystem_f3658e = ds;
  return ds;
};

globalThis.installDesignSystem();
