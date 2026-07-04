/* Vite entry for the recruiting kit. Replaces the CDN React/ReactDOM/Babel
   <script> tags and the per-file <script type="text/babel"> includes: Vite
   bundles React and compiles the JSX at build time (no CDN, no runtime Babel).
   The modules are imported for their side effects in the original load order —
   each still attaches to window.* — so the kit code is otherwise unchanged. */
import './setup-globals.js'; // sets window.React/ReactDOM first
import '../../_ds_bundle.js'; // window.MyJobDesignSystem_f3658e (uses window.React)
import './data.js';
import './use-viewport.jsx'; // window.useViewport — read by the shell + views
import './use-online.jsx'; // window.useOnline — connectivity for the offline banner
import './OfflineBanner.jsx'; // window.OfflineBanner — shown while offline (ADR-0039)
import './DataStates.jsx';
import './RecruitRail.jsx';
import './PipelineBoard.jsx';
import './Workspace.jsx';
import './VermittlerViews.jsx';
import './MandatePipelineModals.jsx'; // feature modals, published before the orchestrator mounts them
import './MandatePipeline.jsx';
import './TalentProfile.jsx';
// Editor pieces: shared primitives first (the others destructure them from
// window at module scope), then previews and modals, then the editor itself.
import './EditorShared.jsx';
import './EditorDocs.jsx';
import './EditorModals.jsx';
import './Editor.jsx';
import './MappeModal.jsx';
import './RecordFormModal.jsx';
import './Matching.jsx';
import './AssistantView.jsx';
import './SettingsView.jsx';
import './Login.jsx';
import './app.jsx';

import { createRoot } from 'react-dom/client';
// Workbox service-worker registration, injected by vite-plugin-pwa (ADR-0028).
// This is a bundled, same-origin module — no inline script — so it satisfies the
// kit's strict CSP (`script-src 'self'`, ADR-0004). registerSW feature-checks
// `serviceWorker` support itself, so a failure (no HTTPS in dev, unsupported
// browser) is a no-op and never breaks the app.
import { registerSW } from 'virtual:pwa-register';

createRoot(document.getElementById('root')).render(window.React.createElement(window.App));

// `autoUpdate` (vite.config.ts): a redeployed worker takes over and reloads to
// the fresh shell without a user prompt. Fire-and-forget.
registerSW({ immediate: true });
