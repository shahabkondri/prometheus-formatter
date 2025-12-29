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
   }

   html, body {
     margin: 0;
     padding: 0;
     width: 100%;
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
     padding: 1em;
     line-height: 1.3;
     word-wrap: break-word;
     flex: 1;
     overflow-y: auto;
   }

   #pf-header {
     position: fixed;
     top: 0;
     left: 0;
     right: 0;
     color: var(--pf-fg);
     display: flex;
     align-items: center;
     justify-content: flex-end;
     padding: 0.5em 1em;
     z-index: 10000;
     box-sizing: border-box;
   }

   #pf-header .pf-search-container {
     display: flex;
     align-items: center;
     width: 0;
     overflow: hidden;
     transition: width 0.3s ease;
   }

   #pf-header .pf-search-container.active {
     width: calc(100% - 100px);
   }

   #pf-header input {
     width: 100%;
     padding: 0.5em;
     font-size: 1em;
     box-sizing: border-box;
     background-color: var(--pf-bg);
     color: var(--pf-fg);
     border: 1px solid var(--pf-fg);
     border-radius: 4px;
   }

   #pf-header img {
     width: 24px;
     height: 24px;
     cursor: pointer;
     margin-left: 10px;
     transition: transform 0.2s ease, filter 0.2s ease;
   }

   #pf-header img.pf-icon:hover {
     transform: scale(1.1);
     filter: brightness(1.2);
   }

   .pf-content {
     margin-top: 3em;
   }

   .pf-section {
     margin: 0 0 0.5em 0;
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
   `;

  class PrometheusMetricsHandler {
    constructor() {
      this.entries = [];
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

        const safeName = escapeHtml(parsed.name);
        const labelsHtml = formatLabels(parsed.labels, false);
        const safeValue = escapeHtml(parsed.value);
        const timestampHtml = parsed.timestamp
          ? ` <span class="pf-timestamp">${escapeHtml(parsed.timestamp)}</span>`
          : '';
        const exemplarHtml = parsed.exemplar
          ? ` <span class="pf-exemplar"># ${formatExemplar(parsed.exemplar)}</span>`
          : '';

        return {
          ...parsed,
          getHtml: () =>
            `<div class="pf-section"><span class="pf-metric-name">${safeName}</span>${labelsHtml} <span class="pf-value">${safeValue}</span>${timestampHtml}${exemplarHtml}</div>`,
        };
      }

      return null;
    }

    parseLine(line, lineNumber) {
      const parsed = parsePrometheusLine(line, lineNumber);
      if (!parsed) {
        return null;
      }
      return this.createEntry(parsed);
    }

    /**
     * Process an array of lines and populate entries.
     * @param {string[]} lines - Lines to process.
     */
    processLines(lines) {
      this.entries = [];
      lines.forEach((line, index) => {
        const entry = this.parseLine(line, index + 1);
        if (entry) {
          this.entries.push(entry);
        }
      });
    }

    /**
     * Filter entries based on a search query.
     * @param {string} query - The search query.
     * @returns {Array} - Filtered array of entries.
     */
    filterEntries(query) {
      if (!query) return this.entries;
      const lowerQuery = query.toLowerCase();
      return this.entries.filter((entry) => {
        if (entry.type === 'comment') {
          return (entry.raw || '').toLowerCase().includes(lowerQuery);
        }
        if (entry.type === 'warning') {
          return (
            (entry.message || '').toLowerCase().includes(lowerQuery) ||
            (entry.raw || '').toLowerCase().includes(lowerQuery)
          );
        }
        if (entry.type === 'metric') {
          if (entry.name.toLowerCase().includes(lowerQuery)) return true;
          if (entry.value.toLowerCase().includes(lowerQuery)) return true;
          if (entry.timestamp && entry.timestamp.toLowerCase().includes(lowerQuery)) return true;
          if (entry.labels.some(({ key, value }) => {
            return key.toLowerCase().includes(lowerQuery) || value.toLowerCase().includes(lowerQuery);
          })) {
            return true;
          }
          if (entry.exemplar) {
            if (entry.exemplar.value.toLowerCase().includes(lowerQuery)) return true;
            if (entry.exemplar.timestamp && entry.exemplar.timestamp.toLowerCase().includes(lowerQuery)) return true;
            if (entry.exemplar.labels.some(({ key, value }) => {
              return key.toLowerCase().includes(lowerQuery) || value.toLowerCase().includes(lowerQuery);
            })) {
              return true;
            }
          }
        }
        return false;
      });
    }

    /**
     * Render entries into HTML and insert into the page.
     * @param {Array} entries - Array of entries to render.
     */
    renderEntries(entries) {
      const html = entries.map((item) => item.getHtml()).join('\n');
      const container = document.getElementById('pf-metrics-container');
      container.innerHTML = html;
    }
  }

   class PrometheusUIManager {

     constructor(currentTheme, browserAPI, onSearch) {
       this.currentTheme = currentTheme;
       this.browserAPI = browserAPI;
       this.onSearch = onSearch;
       this.searchBarVisible = false;
     }

     injectCSS() {
       if (document.getElementById('prometheus-formatter-style')) return;
       const style = document.createElement('style');
       style.id = 'prometheus-formatter-style';
       style.type = 'text/css';
       style.textContent = prometheusFormatterCSS;
       document.head.appendChild(style);
     }

     injectHeader() {
       const header = document.createElement('div');
       header.id = 'pf-header';

       const searchContainer = document.createElement('div');
       searchContainer.classList.add('pf-search-container');

       const searchInput = document.createElement('input');
       searchInput.type = 'text';
       searchInput.id = 'pf-search-input';
       searchInput.placeholder = 'Search metrics...';

       searchInput.addEventListener('input', (e) => {
         this.onSearch(e.target.value);
       });

       searchContainer.appendChild(searchInput);

       const filterIcon = document.createElement('img');
       filterIcon.id = 'pf-filter-icon';
       filterIcon.src = this.browserAPI.runtime.getURL('images/filter.png');
       filterIcon.alt = 'Filter Metrics';
       filterIcon.classList.add('pf-icon');

       filterIcon.addEventListener('click', () => {
         this.toggleSearchBar(searchContainer, header);
       });

       const sunIcon = document.createElement('img');
       sunIcon.id = 'pf-sun-icon';
       sunIcon.src = this.browserAPI.runtime.getURL('images/sun.png');
       sunIcon.alt = 'Light Mode';
       sunIcon.style.display = this.currentTheme === 'light' ? 'none' : 'inline';
       sunIcon.classList.add('pf-icon');

       const moonIcon = document.createElement('img');
       moonIcon.id = 'pf-moon-icon';
       moonIcon.src = this.browserAPI.runtime.getURL('images/moon.png');
       moonIcon.alt = 'Dark Mode';
       moonIcon.style.display = this.currentTheme === 'dark' ? 'none' : 'inline';
       moonIcon.classList.add('pf-icon');

       sunIcon.addEventListener('click', () => this.switchTheme('light'));
       moonIcon.addEventListener('click', () => this.switchTheme('dark'));

       header.appendChild(searchContainer);
       header.appendChild(filterIcon);
       header.appendChild(sunIcon);
       header.appendChild(moonIcon);

       const container = document.getElementById('pf-root');
       container.insertBefore(header, container.firstChild);
     }

     /**
      * Switch the theme between light and dark.
      * @param {string} newTheme - The new theme to apply.
      */
     switchTheme(newTheme) {
       const rootElement = document.documentElement; // Get the <html> element
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
           moonIcon.style.display = 'inline';
         } else {
           sunIcon.style.display = 'inline';
           moonIcon.style.display = 'none';
         }
       }
     }

     /**
      * Toggle the visibility of the search bar.
      * @param {HTMLElement} searchContainer - The search container element.
      * @param {HTMLElement} header - The header element.
      */
     toggleSearchBar(searchContainer, header) {
       if (this.searchBarVisible) {
         searchContainer.classList.remove('active');
         this.searchBarVisible = false;
       } else {
         searchContainer.classList.add('active');
         this.searchBarVisible = true;
         const searchInput = searchContainer.querySelector('#pf-search-input');
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

     const metricsContainer = document.createElement('div');
     metricsContainer.id = 'pf-metrics-container';

     contentContainer.appendChild(metricsContainer);
     container.appendChild(contentContainer);
     document.body.appendChild(container);

     browserAPI.storage.local.get('theme', (result) => {
       let currentTheme = result.theme || 'dark';
       document.documentElement.setAttribute('data-theme', currentTheme);

       const metricsHandler = new PrometheusMetricsHandler();
       const lines = bodyText.split('\n');
       metricsHandler.processLines(lines);

       metricsHandler.renderEntries(metricsHandler.entries);

       const uiManager = new PrometheusUIManager(currentTheme, browserAPI, (query) => {
         const filteredEntries = metricsHandler.filterEntries(query);
         metricsHandler.renderEntries(filteredEntries);
       });

       uiManager.injectCSS();
       uiManager.injectHeader();
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
