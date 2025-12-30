(() => {
   const browserAPI = typeof window.browser !== 'undefined' ? window.browser : window.chrome;
   if (!browserAPI) {
     console.error('Browser API is not available');
     return;
   }

   const root = typeof globalThis !== 'undefined' ? globalThis : window;
   const parser = root.PrometheusFormatterParser;
   if (!parser) {
     console.error('Prometheus parser is not available');
     return;
   }

   const { parsePrometheusLine, classifyPrometheusLine } = parser;

   const escapeHtml = (value) => {
     return String(value).replace(/[&<>"']/g, (match) => {
       switch (match) {
         case '&':
           return '&amp;';
         case '<':
           return '&lt;';
         case '>':
           return '&gt;';
         case '"':
           return '&quot;';
         case '\'':
           return '&#39;';
         default:
           return match;
       }
     });
   };

   const formatLabelValue = (value) => {
     return String(value)
       .replace(/\\/g, '\\\\')
       .replace(/\n/g, '\\n')
       .replace(/\r/g, '\\r')
       .replace(/\t/g, '\\t')
       .replace(/"/g, '\\"');
   };

   const prometheusFormatterCSS = `
   /* ====================================== */
   /*        Prometheus Formatter CSS        */
   /* ====================================== */

   /* Define variables globally */
   :root[data-theme='light'] {
     --pf-bg: #ffffff;
     --pf-fg: #302A24;
     --pf-metric-name-color: #704080;
     --pf-label-key-color: #9C7028;
     --pf-label-value-color: #486830;
     --pf-value-color: #1E5C84;
     --pf-comment-color: #A0A0A0;
     --pf-warning-bg: #FFF4E5;
     --pf-warning-fg: #7A4B00;
     --pf-warning-border: #F0C36D;
     --pf-family-bg: #FAF8F4;
     --pf-family-header-bg: #F3EEE6;
     --pf-family-border: #E4D9CB;
     --pf-family-help-color: #6F655A;
     --pf-family-row-bg: #F8F2EA;
     --pf-family-pill-bg: #FFFFFF;
     --pf-family-pill-border: #E4D3C2;
     --pf-family-pill-fg: #5E5448;
     --pf-nav-bg: #F8F3EC;
     --pf-nav-border: #E6D8C9;
     --pf-nav-title-color: #5B544C;
     --pf-nav-link-hover-bg: #EFE5D9;
     --pf-search-hit-bg: #FFF1D6;
     --pf-search-hit-border: #E8B65A;
     --pf-search-bg: #C4AA92;
     --pf-search-border: #9B7F69;
     --pf-scrollbar-thumb: #B8A089;
     --pf-scrollbar-track: #F6EFE8;
   }

   :root[data-theme='dark'] {
     --pf-bg: #1E1F22;
     --pf-fg: #BCBEC4;
     --pf-metric-name-color: #C77DBB;
     --pf-label-key-color: #BCBEC4;
     --pf-label-value-color: #6AAB73;
     --pf-value-color: #CF8E6D;
     --pf-comment-color: #7A7E85;
     --pf-warning-bg: #3B2C1A;
     --pf-warning-fg: #F5D6A1;
     --pf-warning-border: #B8812C;
     --pf-family-bg: #24262B;
     --pf-family-header-bg: #2D3036;
     --pf-family-border: #3B3F47;
     --pf-family-help-color: #9AA0A8;
     --pf-family-row-bg: #2E3137;
     --pf-family-pill-bg: #2C3038;
     --pf-family-pill-border: #3B3F47;
     --pf-family-pill-fg: #A4A9B0;
     --pf-nav-bg: #26282E;
     --pf-nav-border: #3B3F47;
     --pf-nav-title-color: #A0A4AB;
     --pf-nav-link-hover-bg: #2F3238;
     --pf-search-hit-bg: #3D2F1A;
     --pf-search-hit-border: #B8812C;
     --pf-search-bg: #1F2227;
     --pf-search-border: #374151;
     --pf-scrollbar-thumb: #4E545D;
     --pf-scrollbar-track: #1F2227;
   }

   :root {
     --pf-sidebar-width: 0px;
   }

   html, body {
     margin: 0;
     padding: 0;
     width: 100%;
     height: 100%;
     background-color: var(--pf-bg);
     color: var(--pf-fg);
   }

   #pf-root {
     color-scheme: light dark;
     box-sizing: border-box;
     margin: 0;
     padding: 0;
     font-family: Menlo, Consolas, DejaVu Sans Mono, monospace;
     transition: background-color 0.3s ease, color 0.3s ease;
     height: 100%;
     width: 100%;
     display: flex;
     flex-direction: column;
   }

   #pf-root *,
   #pf-root *::before,
   #pf-root *::after {
     box-sizing: inherit;
   }

   .pf-container {
     padding: 0;
     line-height: 1.3;
     word-wrap: break-word;
     flex: 1;
     overflow: hidden;
   }

   .pf-sidebar-search {
     display: flex;
     flex-direction: column;
     gap: 0.35em;
   }

   .pf-search-container {
     display: flex;
     align-items: center;
     width: 100%;
     max-height: 0;
     opacity: 0;
     transform: translateY(-6px);
     pointer-events: none;
     overflow: hidden;
     margin: 0;
     transition: max-height 0.2s ease, opacity 0.2s ease, transform 0.2s ease, margin 0.2s ease;
   }

   .pf-search-container.active {
     max-height: 64px;
     opacity: 1;
     transform: translateY(0);
     pointer-events: auto;
     margin-bottom: 0.25em;
   }

   .pf-search-container.pf-search-in-main {
     width: 100%;
     max-width: 540px;
   }

   .pf-search-container.pf-search-in-main.active {
     margin: 0.4em 0 0.2em;
   }

   .pf-search-field {
     position: relative;
     display: flex;
     align-items: center;
     width: 100%;
     min-width: 0;
   }

   .pf-search-container input {
     width: 100%;
     -webkit-appearance: none;
     appearance: none;
     background-color: var(--pf-search-bg);
     background-image: none;
    padding: 0.55em 2.6em 0.55em 0.95em;
    font-size: 1em;
     box-sizing: border-box;
     color: var(--pf-fg);
     -webkit-text-fill-color: var(--pf-fg);
     border: 1px solid var(--pf-search-border);
     border-radius: 10px;
     box-shadow: none;
     outline: none;
   }

   .pf-search-container input::placeholder {
     color: var(--pf-comment-color);
     opacity: 0.85;
   }

   .pf-search-clear {
     position: absolute;
     right: 0.6em;
     top: 50%;
     transform: translateY(-50%);
     width: 1.4em;
     height: 1.4em;
     display: inline-flex;
     align-items: center;
     justify-content: center;
     background: none;
     border: none;
     padding: 0;
     color: var(--pf-fg);
     cursor: pointer;
     opacity: 0;
     pointer-events: none;
     transition: opacity 0.15s ease, transform 0.15s ease;
   }

   .pf-search-container.has-value .pf-search-clear {
     opacity: 0.85;
     pointer-events: auto;
   }

   .pf-search-clear:hover {
     opacity: 1;
     transform: translateY(-50%) scale(1.08);
   }

   .pf-search-clear svg {
     width: 100%;
     height: 100%;
     display: block;
   }

   .pf-icon-button {
     width: 24px;
     height: 24px;
     cursor: pointer;
     margin-left: 10px;
     transition: transform 0.2s ease, filter 0.2s ease;
     background: none;
     border: none;
     padding: 0;
     color: var(--pf-fg);
     display: inline-flex;
     align-items: center;
     justify-content: center;
   }

   .pf-icon-button:hover {
     transform: scale(1.1);
     filter: brightness(1.2);
   }

   .pf-icon-button svg {
     width: 24px;
     height: 24px;
     display: block;
   }

   #pf-filter-icon svg {
     width: 20px;
     height: 20px;
   }

   .pf-theme-controls {
     position: fixed;
     top: 0.5em;
     right: 1em;
     display: flex;
     align-items: center;
     gap: 0.5em;
     z-index: 10002;
     pointer-events: auto;
   }

   .pf-content {
     margin-top: 0;
     height: 100vh;
     display: flex;
     flex-direction: column;
   }

   .pf-layout {
     flex: 1;
     display: flex;
     gap: 0;
     align-items: stretch;
     min-height: 0;
   }

   .pf-main {
     flex: 1;
     min-width: 0;
     min-height: 0;
     display: flex;
     flex-direction: column;
   }

   .pf-main-search {
     padding: 0 1em;
     display: flex;
     justify-content: center;
   }

   #pf-metrics-container {
     flex: 1;
     min-width: 0;
     min-height: 0;
     overflow-y: auto;
     padding: 1em;
     scrollbar-width: thin;
     scrollbar-color: var(--pf-scrollbar-thumb) var(--pf-scrollbar-track);
   }

   #pf-metrics-container::-webkit-scrollbar {
     width: 8px;
   }

   #pf-metrics-container::-webkit-scrollbar-track {
     background: var(--pf-scrollbar-track);
   }

   #pf-metrics-container::-webkit-scrollbar-thumb {
     background-color: var(--pf-scrollbar-thumb);
     border-radius: 999px;
     border: 2px solid var(--pf-scrollbar-track);
     background-clip: content-box;
   }

   #pf-metrics-container::-webkit-scrollbar-corner {
     background: var(--pf-scrollbar-track);
   }

   .pf-sidebar {
     position: sticky;
     top: 0;
     align-self: stretch;
     display: flex;
      height: 100%;
     width: 300px;
     min-width: 220px;
     max-width: 420px;
     transition: width 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
     border-left: 1px solid var(--pf-nav-border);
     border-right: none;
     border-top: none;
     border-bottom: none;
     background-color: var(--pf-nav-bg);
     border-radius: 0;
   }

   .pf-sidebar.pf-sidebar-empty {
     display: none;
   }

   .pf-sidebar.collapsed {
     width: 36px;
     min-width: 36px;
     max-width: 36px;
     border-right: 1px solid var(--pf-nav-border);
   }

   #pf-family-nav {
     flex: 1;
     display: flex;
     flex-direction: column;
     gap: 0.4em;
     overflow: hidden;
     padding: 0.35em 0.55em;
     min-height: 0;
   }

   .pf-family-nav-header {
     display: flex;
     align-items: center;
     justify-content: space-between;
     margin-bottom: 0.35em;
   }

   .pf-sidebar-controls {
     display: flex;
     align-items: center;
     gap: 0.35em;
   }

   .pf-sidebar-controls .pf-icon-button {
     margin-left: 0;
   }

   .pf-theme-controls .pf-icon-button {
     margin-left: 0;
   }

   .pf-family-nav-toggle {
     border: 1px solid var(--pf-nav-border);
     background-color: var(--pf-family-header-bg);
     color: var(--pf-nav-title-color);
     width: 2em;
     height: 2em;
     border-radius: 6px;
     cursor: pointer;
     padding: 0;
     line-height: 1;
     display: inline-flex;
     align-items: center;
     justify-content: center;
   }

   .pf-family-nav-toggle:hover {
     background-color: var(--pf-nav-link-hover-bg);
   }

   .pf-family-nav-toggle svg {
     width: 22px;
     height: 22px;
     stroke: currentColor;
     fill: none;
     stroke-width: 2;
     stroke-linecap: round;
     stroke-linejoin: round;
     transition: transform 0.2s ease;
   }

   .pf-sidebar.collapsed .pf-family-nav-toggle svg {
     transform: rotate(180deg);
   }

   .pf-sidebar.collapsed #pf-family-nav {
     padding: 0.35em;
     align-items: center;
   }

   .pf-sidebar.collapsed .pf-family-nav-list,
  .pf-sidebar.collapsed .pf-sidebar-search,
  .pf-sidebar.collapsed .pf-family-nav-empty {
    display: none;
  }

   .pf-sidebar.collapsed .pf-sidebar-controls {
     display: flex;
     flex-direction: column;
     align-items: center;
     gap: 0.35em;
   }

   .pf-sidebar.collapsed .pf-family-nav-header {
     justify-content: center;
     flex-direction: column;
     gap: 0.35em;
   }

   .pf-sidebar-resizer {
     flex: 0 0 6px;
     width: 6px;
     cursor: col-resize;
     border-left: none;
     background: transparent;
     align-self: stretch;
   }

   .pf-sidebar-resizer:hover {
     background-color: var(--pf-nav-link-hover-bg);
   }

   .pf-sidebar.collapsed .pf-sidebar-resizer {
     display: none;
   }

   body.pf-resizing {
     cursor: col-resize;
     user-select: none;
   }

   body.pf-resizing .pf-sidebar {
     transition: none;
   }

  .pf-family-nav-empty {
    display: none;
    font-size: 0.9em;
    color: var(--pf-comment-color);
    padding: 0.3em 0.4em;
  }

  .pf-nav-empty .pf-family-nav-empty {
    display: block;
  }

  .pf-nav-empty .pf-family-nav-list {
    display: none;
  }

   .pf-family-nav-list {
     list-style: none;
     padding: 0;
     margin: 0;
     display: flex;
     flex-direction: column;
     gap: 0.25em;
     flex: 1;
     overflow-y: auto;
     scrollbar-width: thin;
     scrollbar-color: var(--pf-nav-border) transparent;
   }

   .pf-family-nav-list::-webkit-scrollbar {
     width: 6px;
   }

   .pf-family-nav-list::-webkit-scrollbar-track {
     background: transparent;
   }

   .pf-family-nav-list::-webkit-scrollbar-thumb {
     background-color: var(--pf-nav-border);
     border-radius: 999px;
     border: 2px solid transparent;
     background-clip: content-box;
   }

   .pf-family-nav-list::-webkit-scrollbar-corner {
     background: transparent;
   }

   .pf-family-nav-list a {
     display: block;
     padding: 0.35em 0.5em;
     border-radius: 6px;
     color: var(--pf-metric-name-color);
     text-decoration: none;
     font-size: 0.95em;
   }

   .pf-family-nav-list a:hover {
     background-color: var(--pf-nav-link-hover-bg);
   }

   .pf-orphans {
     margin-bottom: 1em;
   }

   .pf-families {
     display: flex;
     flex-direction: column;
     gap: 0.75em;
   }

   .pf-family {
     border: 1px solid var(--pf-family-border);
     border-radius: 10px;
     background-color: var(--pf-family-bg);
     scroll-margin-top: 4em;
   }

   .pf-family summary {
     list-style: none;
   }

   .pf-family summary::-webkit-details-marker {
     display: none;
   }

   .pf-family-header {
     display: flex;
     gap: 0.35em;
     padding: 0.26em 0.5em;
     cursor: pointer;
     background-color: var(--pf-family-header-bg);
     border-radius: 10px;
     user-select: none;
   }

   .pf-family-header-hit {
     box-shadow: inset 0 0 0 2px var(--pf-search-hit-border);
     background-color: var(--pf-search-hit-bg);
   }

   .pf-family[open] .pf-family-header {
     border-bottom: 1px solid var(--pf-family-border);
     border-bottom-left-radius: 0;
     border-bottom-right-radius: 0;
   }

   .pf-family-toggle {
     width: 0.7em;
     flex-shrink: 0;
     display: flex;
     align-items: flex-start;
     justify-content: center;
     padding-top: 0.05em;
   }

   .pf-family-toggle svg {
     width: 0.9em;
     height: 0.9em;
     stroke: var(--pf-comment-color);
     fill: none;
     stroke-width: 2;
     stroke-linecap: round;
     stroke-linejoin: round;
     transition: transform 0.2s ease;
   }

   .pf-family[open] .pf-family-toggle svg {
     transform: rotate(90deg);
   }

   .pf-family-header-content {
     display: flex;
     flex-direction: column;
     gap: 0.2em;
     min-width: 0;
   }

    .pf-family-title-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35em;
      align-items: baseline;
      padding: 0.2em 0.2em;
      border-radius: 8px;
      background-color: var(--pf-family-row-bg);
    }

   .pf-family-name {
     font-size: 0.92em;
     font-weight: bold;
     color: var(--pf-metric-name-color);
   }

   .pf-family-pill {
     display: inline-flex;
     align-items: center;
     padding: 0.1em 0.45em;
     border-radius: 999px;
     border: 1px solid var(--pf-family-pill-border);
     background-color: var(--pf-family-pill-bg);
     color: var(--pf-family-pill-fg);
     font-size: 0.78em;
     font-weight: 600;
   }

   .pf-family-meta-row {
     display: flex;
     flex-wrap: nowrap;
     gap: 0.4em;
     font-size: 0.78em;
     align-items: baseline;
     min-width: 0;
     color: var(--pf-fg);
     padding: 0 0.2em 0.1em 0.2em;
   }

   .pf-family-help {
     flex: 1;
     min-width: 0;
     white-space: nowrap;
     overflow: hidden;
     text-overflow: ellipsis;
     color: var(--pf-family-help-color);
   }

   .pf-family-unit {
     font-weight: 600;
     color: var(--pf-fg);
   }

   .pf-family-body {
     padding: 0.5em 1em 0.75em 1em;
   }

   .pf-section {
     margin: 0 0 0.5em 0;
   }

   .pf-section.pf-search-hit {
     background-color: var(--pf-search-hit-bg);
     border-left: 3px solid var(--pf-search-hit-border);
     padding: 0.25em 0.5em;
     border-radius: 6px;
   }

   .pf-metric-name {
     color: var(--pf-metric-name-color);
     font-weight: bold;
   }

   .pf-labels {
     color: var(--pf-fg);
   }

   .pf-label-key {
     color: var(--pf-label-key-color);
     font-weight: bold;
   }

   .pf-label-value {
     color: var(--pf-label-value-color);
   }

   .pf-value {
     color: var(--pf-value-color);
   }

   .pf-comment {
     color: var(--pf-comment-color);
     font-style: italic;
     margin: 0 0 0.5em 0;
   }

   .pf-timestamp,
   .pf-exemplar,
   .pf-exemplar-timestamp {
     color: var(--pf-comment-color);
   }

   .pf-exemplar-value {
     color: var(--pf-value-color);
   }

   .pf-warning {
     background-color: var(--pf-warning-bg);
     color: var(--pf-warning-fg);
     border-left: 3px solid var(--pf-warning-border);
     padding: 0.5em 0.75em;
     margin: 0 0 0.5em 0;
     font-size: 0.95em;
     white-space: pre-wrap;
   }

   .pf-warning-title {
     font-weight: bold;
   }

   .pf-warning-raw {
     color: var(--pf-fg);
     margin-top: 0.25em;
     word-break: break-word;
   }

   .pf-empty {
     padding: 1em;
     border: 1px dashed var(--pf-family-border);
     border-radius: 8px;
     color: var(--pf-comment-color);
     text-align: center;
   }


  @media (max-width: 900px) {
    :root {
      --pf-sidebar-width: 0px;
    }

    .pf-container {
      overflow-y: auto;
    }

    .pf-content {
      height: auto;
    }

    #pf-metrics-container {
      height: auto;
      overflow: visible;
      padding: 1em;
    }

    .pf-sidebar {
      display: none;
    }
  }
   `;

  const FAMILY_SUFFIXES = ['_bucket', '_sum', '_count'];
  const META_COMMENT_TYPES = new Set(['HELP', 'TYPE', 'UNIT']);
  const SIDEBAR_TOGGLE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect width="18" height="18" x="3" y="3" rx="2"></rect>' +
    '<path d="M9 3v18"></path>' +
    '</svg>';
  const FAMILY_TOGGLE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="m9 6 6 6-6 6"></path>' +
    '</svg>';
  const SEARCH_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="m21 21-4.34-4.34"></path>' +
    '<circle cx="11" cy="11" r="8"></circle>' +
    '</svg>';
  const CLEAR_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M18 6 6 18"></path>' +
    '<path d="M6 6 18 18"></path>' +
    '</svg>';
  const COLLAPSE_ALL_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="m7 14 5-5 5 5"></path>' +
    '<path d="m7 19 5-5 5 5"></path>' +
    '</svg>';
  const EXPAND_ALL_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="m7 5 5 5 5-5"></path>' +
    '<path d="m7 10 5 5 5-5"></path>' +
    '</svg>';
  const MOON_ICON_SVG =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<g id="SVGRepo_bgCarrier" stroke-width="0"></g>' +
    '<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>' +
    '<g id="SVGRepo_iconCarrier">' +
    '<path d="M19.9001 2.30719C19.7392 1.8976 19.1616 1.8976 19.0007 2.30719L18.5703 3.40247C18.5212 3.52752 18.4226 3.62651 18.298 3.67583L17.2067 4.1078C16.7986 4.26934 16.7986 4.849 17.2067 5.01054L18.298 5.44252C18.4226 5.49184 18.5212 5.59082 18.5703 5.71587L19.0007 6.81115C19.1616 7.22074 19.7392 7.22074 19.9001 6.81116L20.3305 5.71587C20.3796 5.59082 20.4782 5.49184 20.6028 5.44252L21.6941 5.01054C22.1022 4.849 22.1022 4.26934 21.6941 4.1078L20.6028 3.67583C20.4782 3.62651 20.3796 3.52752 20.3305 3.40247L19.9001 2.30719Z" fill="#1C274C"></path>' +
    '<path d="M16.0328 8.12967C15.8718 7.72009 15.2943 7.72009 15.1333 8.12967L14.9764 8.52902C14.9273 8.65407 14.8287 8.75305 14.7041 8.80237L14.3062 8.95987C13.8981 9.12141 13.8981 9.70107 14.3062 9.86261L14.7041 10.0201C14.8287 10.0694 14.9273 10.1684 14.9764 10.2935L15.1333 10.6928C15.2943 11.1024 15.8718 11.1024 16.0328 10.6928L16.1897 10.2935C16.2388 10.1684 16.3374 10.0694 16.462 10.0201L16.8599 9.86261C17.268 9.70107 17.268 9.12141 16.8599 8.95987L16.462 8.80237C16.3374 8.75305 16.2388 8.65407 16.1897 8.52902L16.0328 8.12967Z" fill="#1C274C"></path>' +
    '<path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#1C274C"></path>' +
    '</g>' +
    '</svg>';
  const SUN_ICON_SVG =
    '<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--twemoji" preserveAspectRatio="xMidYMid meet" fill="#000000">' +
    '<g id="SVGRepo_bgCarrier" stroke-width="0"></g>' +
    '<g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>' +
    '<g id="SVGRepo_iconCarrier">' +
    '<path fill="#FFAC33" d="M16 2s0-2 2-2s2 2 2 2v2s0 2-2 2s-2-2-2-2V2zm18 14s2 0 2 2s-2 2-2 2h-2s-2 0-2-2s2-2 2-2h2zM4 16s2 0 2 2s-2 2-2 2H2s-2 0-2-2s2-2 2-2h2zm5.121-8.707s1.414 1.414 0 2.828s-2.828 0-2.828 0L4.878 8.708s-1.414-1.414 0-2.829c1.415-1.414 2.829 0 2.829 0l1.414 1.414zm21 21s1.414 1.414 0 2.828s-2.828 0-2.828 0l-1.414-1.414s-1.414-1.414 0-2.828s2.828 0 2.828 0l1.414 1.414zm-.413-18.172s-1.414 1.414-2.828 0s0-2.828 0-2.828l1.414-1.414s1.414-1.414 2.828 0s0 2.828 0 2.828l-1.414 1.414zm-21 21s-1.414 1.414-2.828 0s0-2.828 0-2.828l1.414-1.414s1.414-1.414 2.828 0s0 2.828 0 2.828l-1.414 1.414zM16 32s0-2 2-2s2 2 2 2v2s0 2-2 2s-2-2-2-2v-2z"></path>' +
    '<circle fill="#FFAC33" cx="18" cy="18" r="10"></circle>' +
    '</g>' +
    '</svg>';

  const getFamilyName = (metricName) => {
    for (const suffix of FAMILY_SUFFIXES) {
      if (metricName.endsWith(suffix) && metricName.length > suffix.length) {
        return metricName.slice(0, -suffix.length);
      }
    }
    return metricName;
  };

  const normalizeQuery = (query) => {
    if (!query) return '';
    return String(query).trim().toLowerCase();
  };

  const isMetaComment = (commentType) => META_COMMENT_TYPES.has(commentType);

  const matchesText = (value, query) => {
    if (!value) return false;
    return String(value).toLowerCase().includes(query);
  };

  const matchesMetricEntry = (entry, query) => {
    if (!query) return false;
    if (matchesText(entry.name, query)) return true;
    if (matchesText(entry.value, query)) return true;
    if (matchesText(entry.timestamp, query)) return true;
    if (entry.labels && entry.labels.some(({ key, value }) => matchesText(key, query) || matchesText(value, query))) {
      return true;
    }
    if (entry.exemplar) {
      if (matchesText(entry.exemplar.value, query)) return true;
      if (matchesText(entry.exemplar.timestamp, query)) return true;
      if (
        entry.exemplar.labels &&
        entry.exemplar.labels.some(({ key, value }) => matchesText(key, query) || matchesText(value, query))
      ) {
        return true;
      }
    }
    return false;
  };

  const matchesFamilyMeta = (family, query) => {
    if (!query) return false;
    return (
      matchesText(family.name, query) ||
      matchesText(family.type, query) ||
      matchesText(family.unit, query) ||
      matchesText(family.help, query)
    );
  };

  const matchesOrphanEntry = (entry, query) => {
    if (!query) return true;
    if (entry.type === 'comment') {
      return matchesText(entry.raw, query);
    }
    if (entry.type === 'warning') {
      return matchesText(entry.message, query) || matchesText(entry.raw, query);
    }
    return false;
  };

  const buildFamilyId = (name, usedIds) => {
    const base = `pf-family-${name.replace(/[^a-zA-Z0-9_]/g, '-')}`;
    let id = base;
    let index = 1;
    while (usedIds.has(id)) {
      id = `${base}-${index}`;
      index += 1;
    }
    usedIds.add(id);
    return id;
  };

  const formatLabels = (labels, showEmpty) => {
    if (!labels || labels.length === 0) {
      return showEmpty ? '<span class="pf-labels">{}</span>' : '';
    }
    const labelParts = labels.map(({ key, value }) => {
      const safeKey = escapeHtml(key);
      const safeValue = escapeHtml(formatLabelValue(value));
      return `<span class="pf-label-key">${safeKey}</span>="<span class="pf-label-value">${safeValue}</span>"`;
    });
    return `<span class="pf-labels">{${labelParts.join(', ')}}</span>`;
  };

  const formatExemplar = (exemplar) => {
    if (!exemplar) return '';
    const labels = formatLabels(exemplar.labels, true);
    const exemplarValue = escapeHtml(exemplar.value);
    const exemplarTimestamp = exemplar.timestamp
      ? ` <span class="pf-exemplar-timestamp">${escapeHtml(exemplar.timestamp)}</span>`
      : '';
    return `${labels} <span class="pf-exemplar-value">${exemplarValue}</span>${exemplarTimestamp}`;
  };

  const renderMetricEntry = (entry, options = {}) => {
    const safeName = escapeHtml(entry.name);
    const labelsHtml = formatLabels(entry.labels, false);
    const safeValue = escapeHtml(entry.value);
    const timestampHtml = entry.timestamp
      ? ` <span class="pf-timestamp">${escapeHtml(entry.timestamp)}</span>`
      : '';
    const exemplarHtml = entry.exemplar
      ? ` <span class="pf-exemplar"># ${formatExemplar(entry.exemplar)}</span>`
      : '';
    const highlightClass = options.highlight ? ' pf-search-hit' : '';
    return `<div class="pf-section${highlightClass}"><span class="pf-metric-name">${safeName}</span>${labelsHtml} <span class="pf-value">${safeValue}</span>${timestampHtml}${exemplarHtml}</div>`;
  };

  const DEFAULT_SIDEBAR_WIDTH = 300;
  const MIN_SIDEBAR_WIDTH = 220;
  const MAX_SIDEBAR_WIDTH = 420;
  const COLLAPSED_SIDEBAR_WIDTH = 36;

  const clampSidebarWidth = (width) => {
    if (!Number.isFinite(width)) return DEFAULT_SIDEBAR_WIDTH;
    return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
  };

  class PrometheusMetricsHandler {
    constructor(browserAPI) {
      this.browserAPI = browserAPI;
      this.groups = [];
      this.orphans = [];
      this.familyMetadata = new Map();
      this.familyOpenState = new Map();
      this.navHandlerAttached = false;
      this.sidebarHandlerAttached = false;
      this.resizeHandlerAttached = false;
      this.sidebarWidth = DEFAULT_SIDEBAR_WIDTH;
      this.sidebarCollapsed = false;
      this.onNavRender = null;
      this.onFamilyToggle = null;
      this.onSidebarToggle = null;
      this.bulkToggleInProgress = false;
    }

    setNavRenderHook(callback) {
      this.onNavRender = typeof callback === 'function' ? callback : null;
    }

    setFamilyToggleHook(callback) {
      this.onFamilyToggle = typeof callback === 'function' ? callback : null;
    }

    setSidebarToggleHook(callback) {
      this.onSidebarToggle = typeof callback === 'function' ? callback : null;
    }

    createEntry(parsed) {
      if (parsed.type === 'comment') {
        const raw = parsed.raw || '';
        return {
          ...parsed,
          getHtml: () => `<div class="pf-comment">${escapeHtml(raw)}</div>`,
        };
      }

      if (parsed.type === 'warning') {
        const lineLabel = parsed.lineNumber ? `line ${parsed.lineNumber}` : 'unknown line';
        const safeMessage = escapeHtml(parsed.message || 'Unknown parse warning');
        const safeRaw = escapeHtml(parsed.raw || '');
        return {
          ...parsed,
          getHtml: () =>
            `<div class="pf-warning"><div class="pf-warning-title">Parse warning (${lineLabel}):</div><div>${safeMessage}</div><div class="pf-warning-raw">${safeRaw}</div></div>`,
        };
      }

      if (parsed.type === 'metric') {
        const entry = {
          ...parsed,
        };
        entry.getHtml = (options = {}) => renderMetricEntry(entry, options);
        return entry;
      }

      return null;
    }

    /**
     * Process an array of lines and populate families and metadata.
     * @param {string[]} lines - Lines to process.
     */
    processLines(lines) {
      this.groups = [];
      this.orphans = [];
      this.familyMetadata = new Map();

      const parsedEntries = [];
      lines.forEach((line, index) => {
        const parsed = parsePrometheusLine(line, index + 1);
        if (!parsed) return;
        parsedEntries.push(parsed);
        if (parsed.type === 'comment' && isMetaComment(parsed.commentType)) {
          const existing = this.familyMetadata.get(parsed.metricName) || {};
          if (parsed.commentType === 'HELP') {
            existing.help = parsed.text;
          } else if (parsed.commentType === 'TYPE') {
            existing.type = parsed.text;
          } else if (parsed.commentType === 'UNIT') {
            existing.unit = parsed.text;
          }
          this.familyMetadata.set(parsed.metricName, existing);
        }
      });

      const groupsByName = new Map();
      const usedIds = new Set();

      const getGroup = (familyName, fallbackName) => {
        let group = groupsByName.get(familyName);
        if (group) return group;

        const meta =
          this.familyMetadata.get(familyName) ||
          (fallbackName ? this.familyMetadata.get(fallbackName) : null) ||
          {};
        group = {
          name: familyName,
          id: buildFamilyId(familyName, usedIds),
          type: meta.type || '',
          unit: meta.unit || '',
          help: meta.help || '',
          entries: [],
        };
        groupsByName.set(familyName, group);
        this.groups.push(group);
        return group;
      };

      parsedEntries.forEach((parsed) => {
        if (parsed.type === 'metric') {
          const entry = this.createEntry(parsed);
          if (!entry) return;
          const familyName = getFamilyName(parsed.name);
          const group = getGroup(familyName, parsed.name);
          group.entries.push(entry);
          return;
        }

        if (parsed.type === 'comment') {
          if (isMetaComment(parsed.commentType)) return;
          const entry = this.createEntry(parsed);
          if (entry) {
            this.orphans.push(entry);
          }
          return;
        }

        if (parsed.type === 'warning') {
          const entry = this.createEntry(parsed);
          if (entry) {
            this.orphans.push(entry);
          }
        }
      });
    }

    renderFamilyHtml(family, entriesHtml, options) {
      const typeLabel = family.type ? family.type : 'unknown';
      const helpText = family.help && family.help.trim() ? escapeHtml(family.help) : 'No HELP provided';
      const unitHtml = family.unit
        ? `<span class="pf-family-unit">unit: ${escapeHtml(family.unit)}</span>`
        : '';
      const headerClass = options.headerMatch ? ' pf-family-header-hit' : '';
      const openAttr = options.open ? ' open' : '';
      const seriesCount = options.seriesCount;

      return `
        <details class="pf-family" data-family-name="${escapeHtml(family.name)}" id="${family.id}"${openAttr}>
          <summary class="pf-family-header${headerClass}">
            <span class="pf-family-toggle" aria-hidden="true">${FAMILY_TOGGLE_SVG}</span>
            <div class="pf-family-header-content">
              <div class="pf-family-title-row">
                <span class="pf-family-name">${escapeHtml(family.name)}</span>
                <span class="pf-family-pill pf-family-type">type: ${escapeHtml(typeLabel)}</span>
                <span class="pf-family-pill pf-family-count">series: ${seriesCount}</span>
              </div>
              <div class="pf-family-meta-row">
                ${unitHtml}
                <span class="pf-family-help">${helpText}</span>
              </div>
            </div>
          </summary>
          <div class="pf-family-body">
            ${entriesHtml}
          </div>
        </details>
      `;
    }

    renderNavList(navContainer, families, options = {}) {
      if (!navContainer) return;
      const hasQuery = Boolean(options.hasQuery);
      const sidebar = document.getElementById('pf-sidebar');

      if (navContainer.dataset.initialized !== 'true') {
        navContainer.innerHTML = `
          <div class="pf-family-nav-header">
            <button class="pf-family-nav-toggle" type="button" data-action="toggle-sidebar" aria-label="Collapse sidebar">
              ${SIDEBAR_TOGGLE_SVG}
            </button>
            <div class="pf-sidebar-controls"></div>
          </div>
          <div class="pf-sidebar-search"></div>
          <div class="pf-family-nav-empty">No matching families.</div>
          <ul class="pf-family-nav-list"></ul>
        `;
        navContainer.dataset.initialized = 'true';
      }

      if (!families.length) {
        navContainer.classList.add('pf-nav-empty');
        if (sidebar) {
          if (hasQuery) {
            sidebar.classList.remove('pf-sidebar-empty');
          } else {
            sidebar.classList.add('pf-sidebar-empty');
          }
        }
        const list = navContainer.querySelector('.pf-family-nav-list');
        if (list) {
          list.innerHTML = '';
        }
        this.updateSidebarToggleButton();
        this.updateSidebarOffset();
        return;
      }

      navContainer.classList.remove('pf-nav-empty');
      if (sidebar) {
        sidebar.classList.remove('pf-sidebar-empty');
      }

      const items = families
        .map(
          (family) =>
            `<li><a href="#${family.id}" data-family-id="${family.id}">${escapeHtml(family.name)}</a></li>`
        )
        .join('');
      const list = navContainer.querySelector('.pf-family-nav-list');
      if (list) {
        list.innerHTML = items;
      }
      this.updateSidebarToggleButton();
      this.updateSidebarOffset();
    }

    attachNavHandlers(navContainer) {
      if (!navContainer || this.navHandlerAttached) return;
      navContainer.addEventListener('click', (event) => {
        const toggleButton = event.target.closest('button[data-action="toggle-sidebar"]');
        if (toggleButton) {
          event.preventDefault();
          this.setSidebarCollapsed(!this.sidebarCollapsed);
          return;
        }

        const link = event.target.closest('a[data-family-id]');
        if (!link) return;
        event.preventDefault();
        const targetId = link.dataset.familyId;
        const target = targetId ? document.getElementById(targetId) : null;
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      this.navHandlerAttached = true;
    }

    attachFamilyToggleHandlers(container) {
      if (!container) return;
      const detailsList = container.querySelectorAll('details.pf-family');
      detailsList.forEach((details) => {
        details.addEventListener('toggle', () => {
          const familyName = details.dataset.familyName;
          if (!familyName) return;
          this.familyOpenState.set(familyName, details.open);
          if (this.onFamilyToggle && !this.bulkToggleInProgress) {
            this.onFamilyToggle();
          }
        });
      });
    }

    shouldFamilyBeOpen(familyName, hasQuery, hasSampleMatch) {
      if (hasQuery && hasSampleMatch) {
        return true;
      }
      const stored = this.familyOpenState.get(familyName);
      return stored !== undefined ? stored : true;
    }

    updateSidebarToggleButton() {
      const navContainer = document.getElementById('pf-family-nav');
      if (!navContainer) return;
      const button = navContainer.querySelector('.pf-family-nav-toggle');
      if (!button) return;
      if (this.sidebarCollapsed) {
        button.setAttribute('aria-label', 'Expand sidebar');
      } else {
        button.setAttribute('aria-label', 'Collapse sidebar');
      }
    }

    updateSidebarOffset() {
      const rootElement = document.documentElement;
      if (!rootElement) return;
      const sidebar = document.getElementById('pf-sidebar');
      let width = 0;
      if (sidebar && !sidebar.classList.contains('pf-sidebar-empty')) {
        const style = window.getComputedStyle(sidebar);
        const isHidden = style.display === 'none';
        if (!isHidden) {
          width = this.sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : this.sidebarWidth;
        }
      }
      rootElement.style.setProperty('--pf-sidebar-width', `${width}px`);
    }

    setSidebarCollapsed(collapsed) {
      this.sidebarCollapsed = Boolean(collapsed);
      const sidebar = document.getElementById('pf-sidebar');
      if (sidebar) {
        sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
        if (this.sidebarCollapsed) {
          sidebar.style.width = '';
        } else {
          sidebar.style.width = `${this.sidebarWidth}px`;
        }
      }
      if (this.browserAPI?.storage?.local) {
        this.browserAPI.storage.local.set({ sidebarCollapsed: this.sidebarCollapsed });
      }
      this.updateSidebarToggleButton();
      this.updateSidebarOffset();
      if (this.onSidebarToggle) {
        this.onSidebarToggle();
      }
    }

    setSidebarWidth(width, persist) {
      this.sidebarWidth = clampSidebarWidth(width);
      const sidebar = document.getElementById('pf-sidebar');
      if (sidebar && !this.sidebarCollapsed) {
        sidebar.style.width = `${this.sidebarWidth}px`;
      }
      if (persist && this.browserAPI?.storage?.local) {
        this.browserAPI.storage.local.set({ sidebarWidth: this.sidebarWidth });
      }
      this.updateSidebarOffset();
    }

    applySidebarPreferences(preferences = {}) {
      if (typeof preferences.sidebarWidth === 'number') {
        this.sidebarWidth = clampSidebarWidth(preferences.sidebarWidth);
      }
      if (typeof preferences.sidebarCollapsed === 'boolean') {
        this.sidebarCollapsed = preferences.sidebarCollapsed;
      }
      const sidebar = document.getElementById('pf-sidebar');
      if (sidebar) {
        sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
        if (this.sidebarCollapsed) {
          sidebar.style.width = '';
        } else {
          sidebar.style.width = `${this.sidebarWidth}px`;
        }
      }
      this.updateSidebarToggleButton();
      this.updateSidebarOffset();
      if (this.onSidebarToggle) {
        this.onSidebarToggle();
      }
    }

    attachSidebarHandlers() {
      if (this.sidebarHandlerAttached) return;
      const sidebar = document.getElementById('pf-sidebar');
      if (!sidebar) return;
      const resizer = sidebar.querySelector('.pf-sidebar-resizer');
      if (!resizer) return;

      const onMouseMove = (event, startX, startWidth) => {
        const delta = event.clientX - startX;
        this.setSidebarWidth(startWidth + delta, false);
      };

      const onMouseDown = (event) => {
        if (this.sidebarCollapsed) return;
        const startX = event.clientX;
        const startWidth = sidebar.getBoundingClientRect().width;
        document.body.classList.add('pf-resizing');

        const moveHandler = (moveEvent) => onMouseMove(moveEvent, startX, startWidth);
        const upHandler = () => {
          document.removeEventListener('mousemove', moveHandler);
          document.removeEventListener('mouseup', upHandler);
          document.body.classList.remove('pf-resizing');
          this.setSidebarWidth(this.sidebarWidth, true);
        };

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
        event.preventDefault();
      };

      resizer.addEventListener('mousedown', onMouseDown);
      this.sidebarHandlerAttached = true;
    }

    attachResizeHandler() {
      if (this.resizeHandlerAttached) return;
      const handler = () => {
        this.updateSidebarOffset();
        if (this.onSidebarToggle) {
          this.onSidebarToggle();
        }
      };
      window.addEventListener('resize', handler);
      this.resizeHandlerAttached = true;
    }

    getAllFamiliesOpenState() {
      const container = document.getElementById('pf-metrics-container');
      if (!container) return 'none';
      const detailsList = container.querySelectorAll('details.pf-family');
      if (!detailsList.length) return 'none';
      let openCount = 0;
      detailsList.forEach((details) => {
        if (details.open) {
          openCount += 1;
        }
      });
      if (openCount === 0) return 'all-closed';
      if (openCount === detailsList.length) return 'all-open';
      return 'mixed';
    }

    setAllFamiliesOpen(open) {
      const nextOpen = Boolean(open);
      this.groups.forEach((family) => {
        this.familyOpenState.set(family.name, nextOpen);
      });

      const container = document.getElementById('pf-metrics-container');
      if (!container) return;
      const detailsList = container.querySelectorAll('details.pf-family');
      if (!detailsList.length) return;

      this.bulkToggleInProgress = true;
      detailsList.forEach((details) => {
        details.open = nextOpen;
      });
      this.bulkToggleInProgress = false;
      if (this.onFamilyToggle) {
        this.onFamilyToggle();
      }
    }

    /**
     * Render entries into HTML and insert into the page.
     * @param {string} query - Current search query.
     */
    renderEntries(query) {
      const container = document.getElementById('pf-metrics-container');
      const navContainer = document.getElementById('pf-family-nav');
      if (!container || !navContainer) return;

      const normalizedQuery = normalizeQuery(query);
      const hasQuery = normalizedQuery.length > 0;

      const filteredOrphans = this.orphans.filter((entry) => matchesOrphanEntry(entry, normalizedQuery));
      const familiesForNav = [];
      const familiesHtml = [];

      this.groups.forEach((family) => {
        const headerMatch = hasQuery ? matchesFamilyMeta(family, normalizedQuery) : false;

        let matchFlags = [];
        let hasSampleMatch = false;
        if (hasQuery) {
          matchFlags = family.entries.map((entry) => {
            const matched = matchesMetricEntry(entry, normalizedQuery);
            if (matched) {
              hasSampleMatch = true;
            }
            return matched;
          });

          if (!hasSampleMatch && !headerMatch) {
            return;
          }
        }

        const entriesHtml = family.entries
          .map((entry, index) => {
            const highlight = hasQuery ? matchFlags[index] : false;
            return entry.getHtml({ highlight });
          })
          .join('\n');

        const open = this.shouldFamilyBeOpen(family.name, hasQuery, hasSampleMatch);
        familiesHtml.push(
          this.renderFamilyHtml(family, entriesHtml, {
            open,
            headerMatch,
            seriesCount: family.entries.length,
          })
        );
        familiesForNav.push({ id: family.id, name: family.name });
      });

      const sections = [];
      if (filteredOrphans.length > 0) {
        const orphanHtml = filteredOrphans.map((entry) => entry.getHtml()).join('\n');
        sections.push(`<div class="pf-orphans">${orphanHtml}</div>`);
      }
      if (familiesHtml.length > 0) {
        sections.push(`<div class="pf-families">${familiesHtml.join('\n')}</div>`);
      }
      if (sections.length === 0) {
        sections.push('<div class="pf-empty">No matching metrics found.</div>');
      }

      container.innerHTML = sections.join('\n');
      this.renderNavList(navContainer, familiesForNav, { hasQuery });
      this.attachFamilyToggleHandlers(container);
      this.attachNavHandlers(navContainer);
      this.attachSidebarHandlers();
      this.attachResizeHandler();
      if (this.onNavRender) {
        this.onNavRender();
      }
    }
  }

  class PrometheusUIManager {
    constructor(currentTheme, browserAPI, handlers = {}) {
      this.currentTheme = currentTheme;
      this.browserAPI = browserAPI;
      this.onSearch = typeof handlers.onSearch === 'function' ? handlers.onSearch : () => {};
      this.onToggleAll = typeof handlers.onToggleAll === 'function' ? handlers.onToggleAll : null;
      this.getAllOpenState = typeof handlers.getAllOpenState === 'function' ? handlers.getAllOpenState : null;
      this.searchBarVisible = false;
      this.searchContainer = null;
      this.searchButton = null;
      this.toggleAllButton = null;
      this.sunIcon = null;
      this.moonIcon = null;
    }

    injectCSS() {
      if (document.getElementById('prometheus-formatter-style')) return;
      const style = document.createElement('style');
      style.id = 'prometheus-formatter-style';
      style.type = 'text/css';
      style.textContent = prometheusFormatterCSS;
      document.head.appendChild(style);
    }

    injectSearchUI() {
      const searchContainer = document.createElement('div');
      searchContainer.classList.add('pf-search-container');
      this.searchContainer = searchContainer;

      const searchField = document.createElement('div');
      searchField.classList.add('pf-search-field');

      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.id = 'pf-search-input';
      searchInput.placeholder = 'Search metrics...';

      const clearButton = document.createElement('button');
      clearButton.type = 'button';
      clearButton.classList.add('pf-search-clear');
      clearButton.setAttribute('aria-label', 'Clear search');
      clearButton.innerHTML = CLEAR_ICON_SVG;

      searchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        this.onSearch(value);
        searchContainer.classList.toggle('has-value', value.length > 0);
      });

      clearButton.addEventListener('click', () => {
        searchInput.value = '';
        searchContainer.classList.remove('has-value');
        this.onSearch('');
        searchInput.focus();
      });

      searchField.appendChild(searchInput);
      searchField.appendChild(clearButton);
      searchContainer.appendChild(searchField);

      this.ensureSidebarButtons();
      this.mountThemeControls();
    }

    ensureSidebarButtons() {
      if (this.searchButton && this.toggleAllButton && this.sunIcon && this.moonIcon) {
        return;
      }

      const searchButton = document.createElement('button');
      searchButton.id = 'pf-filter-icon';
      searchButton.type = 'button';
      searchButton.classList.add('pf-icon-button');
      searchButton.setAttribute('aria-label', 'Search metrics');
      searchButton.innerHTML = SEARCH_ICON_SVG;
      searchButton.addEventListener('click', () => {
        this.toggleSearchBar();
      });

      const toggleAllButton = document.createElement('button');
      toggleAllButton.id = 'pf-toggle-all';
      toggleAllButton.type = 'button';
      toggleAllButton.classList.add('pf-icon-button');
      toggleAllButton.setAttribute('aria-label', 'Collapse all families');
      toggleAllButton.title = 'Collapse all families';
      toggleAllButton.innerHTML = COLLAPSE_ALL_ICON_SVG;
      toggleAllButton.addEventListener('click', () => {
        this.toggleAllFamilies();
      });

      const sunIcon = document.createElement('button');
      sunIcon.id = 'pf-sun-icon';
      sunIcon.type = 'button';
      sunIcon.classList.add('pf-icon-button');
      sunIcon.setAttribute('aria-label', 'Light Mode');
      sunIcon.innerHTML = SUN_ICON_SVG;
      sunIcon.style.display = this.currentTheme === 'light' ? 'none' : 'inline-flex';
      sunIcon.addEventListener('click', () => this.switchTheme('light'));

      const moonIcon = document.createElement('button');
      moonIcon.id = 'pf-moon-icon';
      moonIcon.type = 'button';
      moonIcon.classList.add('pf-icon-button');
      moonIcon.setAttribute('aria-label', 'Dark Mode');
      moonIcon.innerHTML = MOON_ICON_SVG;
      moonIcon.style.display = this.currentTheme === 'dark' ? 'none' : 'inline-flex';
      moonIcon.addEventListener('click', () => this.switchTheme('dark'));

      this.searchButton = searchButton;
      this.toggleAllButton = toggleAllButton;
      this.sunIcon = sunIcon;
      this.moonIcon = moonIcon;
    }

    toggleAllFamilies() {
      if (!this.onToggleAll || !this.getAllOpenState) return;
      const state = this.getAllOpenState();
      if (state === 'none') return;
      const shouldOpen = state === 'all-closed';
      this.onToggleAll(shouldOpen);
      this.updateToggleAllButton();
    }

    updateToggleAllButton() {
      if (!this.toggleAllButton || !this.getAllOpenState) return;
      const state = this.getAllOpenState();
      if (state === 'none') {
        this.toggleAllButton.style.display = 'none';
        return;
      }

      this.toggleAllButton.style.display = 'inline-flex';
      if (state === 'all-closed') {
        this.toggleAllButton.innerHTML = EXPAND_ALL_ICON_SVG;
        this.toggleAllButton.setAttribute('aria-label', 'Expand all families');
        this.toggleAllButton.title = 'Expand all families';
      } else {
        this.toggleAllButton.innerHTML = COLLAPSE_ALL_ICON_SVG;
        this.toggleAllButton.setAttribute('aria-label', 'Collapse all families');
        this.toggleAllButton.title = 'Collapse all families';
      }
    }

    mountSidebarControls() {
      const container = document.querySelector('.pf-sidebar-controls');
      if (!container) return;
      this.ensureSidebarButtons();
      if (this.searchButton && this.searchButton.parentElement !== container) {
        container.appendChild(this.searchButton);
      }
      if (this.toggleAllButton && this.toggleAllButton.parentElement !== container) {
        container.appendChild(this.toggleAllButton);
      }
      this.updateToggleAllButton();
    }

    shouldUseMainSearch() {
      const sidebar = document.getElementById('pf-sidebar');
      if (!sidebar) return true;
      const style = window.getComputedStyle(sidebar);
      if (style.display === 'none') return true;
      return sidebar.classList.contains('collapsed');
    }

    mountSearchBar() {
      if (!this.searchContainer) return;
      const useMainSearch = this.shouldUseMainSearch();
      const container = useMainSearch
        ? document.getElementById('pf-main-search')
        : document.querySelector('.pf-sidebar-search');
      if (!container) return;
      if (this.searchContainer.parentElement !== container) {
        container.appendChild(this.searchContainer);
      }
      this.searchContainer.classList.toggle('pf-search-in-main', useMainSearch);
      this.searchContainer.classList.toggle('pf-search-in-sidebar', !useMainSearch);
    }

    mountThemeControls() {
      let container = document.getElementById('pf-theme-controls');
      if (!container) {
        container = document.createElement('div');
        container.id = 'pf-theme-controls';
        container.classList.add('pf-theme-controls');
        document.body.appendChild(container);
      }
      this.ensureSidebarButtons();
      [this.sunIcon, this.moonIcon].forEach((button) => {
        if (!button) return;
        if (button.parentElement !== container) {
          container.appendChild(button);
        }
      });
    }

    /**
     * Switch the theme between light and dark.
     * @param {string} newTheme - The new theme to apply.
     */
    switchTheme(newTheme) {
      const rootElement = document.documentElement;
      if (!rootElement) {
        console.error('Root element not found. Cannot switch theme.');
        return;
      }

      rootElement.setAttribute('data-theme', newTheme);

      this.browserAPI.storage.local.set({
        theme: newTheme
      }, () => {
        console.log(`Theme set to ${newTheme}`);
      });

      const sunIcon = document.getElementById('pf-sun-icon');
      const moonIcon = document.getElementById('pf-moon-icon');

      if (sunIcon && moonIcon) {
        if (newTheme === 'light') {
          sunIcon.style.display = 'none';
          moonIcon.style.display = 'inline-flex';
        } else {
          sunIcon.style.display = 'inline-flex';
          moonIcon.style.display = 'none';
        }
      }
    }

    /**
     * Toggle the visibility of the search bar.
     */
    toggleSearchBar() {
      if (!this.searchContainer) return;
      this.mountSearchBar();
      const searchContainer = this.searchContainer;
      if (this.searchBarVisible) {
        searchContainer.classList.remove('active', 'has-value');
        this.searchBarVisible = false;
        return;
      }

      searchContainer.classList.add('active');
      this.searchBarVisible = true;
      const searchInput = searchContainer.querySelector('#pf-search-input');
      if (searchInput) {
        searchContainer.classList.toggle('has-value', searchInput.value.length > 0);
        searchInput.focus();
      }
    }
  }

  /**
   * Determines if the page contains Prometheus metrics.
   * @returns {boolean} - True if the page is a Prometheus metrics endpoint.
   */
  const isValidEndpoint = () => {
    const contentType = (document.contentType || '').toLowerCase();
    if (contentType.includes('application/openmetrics-text')) {
      return true;
    }

    if (contentType.startsWith('text/plain') || contentType === '') {
      const bodyText = document.body.textContent.trim();
      if (!bodyText) return false;
      const lines = bodyText.split('\n');
      let metricLines = 0;
      let metadataLines = 0;
      let inspected = 0;
      const maxInspect = 200;

      for (const rawLine of lines) {
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
        if (!line.trim()) continue;
        inspected += 1;
        const classification = classifyPrometheusLine(line);
        if (classification?.type === 'metric') {
          metricLines += 1;
        } else if (classification?.type === 'comment') {
          if (classification.commentType !== 'COMMENT') {
            metadataLines += 1;
          }
        }
        if (inspected >= maxInspect) {
          break;
        }
      }

      if (metricLines === 0) return false;
      const metricRatio = metricLines / Math.max(1, inspected);
      const hasMetadata = metadataLines > 0;
      const isMetricDense = metricRatio > 0.5 && metricLines >= 3;
      return hasMetadata || isMetricDense;
    }

    return false;
  };

  const processPage = () => {
    if (!isValidEndpoint()) return;

    if (document.getElementById('pf-root')) return;

    const bodyText = document.body.textContent.trim();
    if (!bodyText) return;

    const MAX_SIZE_BYTES = 32 * 1024 * 1024; // 32 MB
    const contentSize = new Blob([bodyText]).size;

    if (contentSize > MAX_SIZE_BYTES) {
      console.warn('Content size exceeds 32 MB. Skipping processing.');
      return;
    }

    document.body.innerHTML = '';

    const container = document.createElement('div');
    container.id = 'pf-root';

    const contentContainer = document.createElement('div');
    contentContainer.classList.add('pf-container', 'pf-content');

    const layout = document.createElement('div');
    layout.classList.add('pf-layout');

    const sidebar = document.createElement('div');
    sidebar.id = 'pf-sidebar';
    sidebar.classList.add('pf-sidebar');

    const navContainer = document.createElement('div');
    navContainer.id = 'pf-family-nav';

    const resizer = document.createElement('div');
    resizer.classList.add('pf-sidebar-resizer');

    const main = document.createElement('div');
    main.classList.add('pf-main');

    const mainSearch = document.createElement('div');
    mainSearch.id = 'pf-main-search';
    mainSearch.classList.add('pf-main-search');

    const metricsContainer = document.createElement('div');
    metricsContainer.id = 'pf-metrics-container';

    sidebar.appendChild(navContainer);
    sidebar.appendChild(resizer);
    layout.appendChild(sidebar);
    main.appendChild(mainSearch);
    main.appendChild(metricsContainer);
    layout.appendChild(main);
    contentContainer.appendChild(layout);
    container.appendChild(contentContainer);
    document.body.appendChild(container);

    browserAPI.storage.local.get(['theme', 'sidebarWidth', 'sidebarCollapsed'], (result) => {
      const currentTheme = result.theme || 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);

      const metricsHandler = new PrometheusMetricsHandler(browserAPI);
      const lines = bodyText.split('\n');
      metricsHandler.processLines(lines);
      metricsHandler.applySidebarPreferences({
        sidebarWidth: result.sidebarWidth,
        sidebarCollapsed: result.sidebarCollapsed,
      });

      const uiManager = new PrometheusUIManager(currentTheme, browserAPI, {
        onSearch: (query) => {
          metricsHandler.renderEntries(query);
        },
        onToggleAll: (open) => {
          metricsHandler.setAllFamiliesOpen(open);
        },
        getAllOpenState: () => metricsHandler.getAllFamiliesOpenState(),
      });

      uiManager.injectCSS();
      uiManager.injectSearchUI();
      metricsHandler.setNavRenderHook(() => {
        uiManager.mountSidebarControls();
        uiManager.mountSearchBar();
        uiManager.updateToggleAllButton();
      });
      metricsHandler.setSidebarToggleHook(() => {
        uiManager.mountSearchBar();
      });
      metricsHandler.setFamilyToggleHook(() => {
        uiManager.updateToggleAllButton();
      });
      metricsHandler.renderEntries('');
      uiManager.mountSidebarControls();
      uiManager.mountSearchBar();
      uiManager.updateToggleAllButton();
    });
  };

   if (document.readyState !== 'loading') {
     processPage();
   } else {
     const listener = () => {
       processPage();
       document.removeEventListener('DOMContentLoaded', listener);
     };
     document.addEventListener('DOMContentLoaded', listener);
   }
 })();
