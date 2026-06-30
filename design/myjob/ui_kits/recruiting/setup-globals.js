/* Bundled React/ReactDOM exposed as globals, replacing the old CDN <script> tags.
   Imported FIRST by main.jsx so window.React exists before the design-system
   bundle and the kit files (which reference window.React) evaluate. */
import React from 'react';
import * as ReactDOM from 'react-dom';

window.React = React;
window.ReactDOM = ReactDOM;
