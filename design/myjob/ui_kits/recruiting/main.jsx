/* Vite entry for the recruiting kit. Replaces the CDN React/ReactDOM/Babel
   <script> tags and the per-file <script type="text/babel"> includes: Vite
   bundles React and compiles the JSX at build time (no CDN, no runtime Babel).
   The modules are imported for their side effects in the original load order —
   each still attaches to window.* — so the kit code is otherwise unchanged. */
import './setup-globals.js'; // sets window.React/ReactDOM first
import '../../_ds_bundle.js'; // window.MyJobDesignSystem_f3658e (uses window.React)
import './data.js';
import './DataStates.jsx';
import './RecruitRail.jsx';
import './PipelineBoard.jsx';
import './Workspace.jsx';
import './VermittlerViews.jsx';
import './TalentProfile.jsx';
import './Editor.jsx';
import './MappeModal.jsx';
import './RecordFormModal.jsx';
import './Matching.jsx';
import './SettingsView.jsx';
import './Login.jsx';
import './app.jsx';

import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')).render(window.React.createElement(window.App));
