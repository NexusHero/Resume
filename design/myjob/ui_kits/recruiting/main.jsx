/* Vite entry for the recruiting kit. Replaces the CDN React/ReactDOM/Babel
   <script> tags and the per-file <script type="text/babel"> includes: Vite
   bundles React and compiles the JSX at build time (no CDN, no runtime Babel).
   The modules are imported for their side effects in the original load order —
   each still attaches to window.* — so the kit code is otherwise unchanged. */
import './theme.js'; // sets data-mode on <html> before paint (light/dark, #196)
import './setup-globals.js'; // sets window.React/ReactDOM first
import '../../_ds_bundle.js'; // window.MyJobDesignSystem_5611b7 (uses window.React)
import './data.js';
import './use-viewport.jsx'; // window.useViewport — read by the shell + views
import './use-theme.jsx'; // window.useTheme — appearance binding for Settings + rail
import './use-dialog.jsx'; // window.useDialog — modal focus trap / Esc / return focus (#203)
import './use-online.jsx'; // window.useOnline — connectivity for the offline banner
import './OfflineBanner.jsx'; // window.OfflineBanner — shown while offline (ADR-0039)
import './undo-delete.js'; // window.UndoDelete — deferred-delete controller (#200)
import './use-undo-delete.jsx'; // window.useUndoDelete — React binding for the snackbar
import './Snackbar.jsx'; // window.Snackbar — the undo toast
import './DataStates.jsx';
import './KanbanShared.jsx'; // window.KanbanColumn/KanbanCard — shared by both boards (#199)
import './PipelineBoard.jsx';
import './Workspace.jsx';
import './AgencyViews.jsx';
import './MandatePipelineModals.jsx'; // feature modals, published before the orchestrator mounts them
import './MandatePipeline.jsx';
import './TalentProfile.jsx';
// Editor pieces: shared primitives first (the others destructure them from
// window at module scope), then previews and modals, then the editor itself.
import './EditorShared.jsx';
import './EditorDocs.jsx';
import './EditorModals.jsx';
import './Editor.jsx';
import './DossierModal.jsx';
import './ConfirmDialog.jsx'; // window.ConfirmDialog — designed confirm for irreversible actions (#200)
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
