(() => {
   const browserAPI = typeof window.browser !== 'undefined' ? window.browser : window.chrome;
   if (!browserAPI) {
	   console.error('Browser API is not available');
	   return;
   }

   const COMMENT_REGEX = /^#\s+(HELP|TYPE)\s+(.*)/;

   // Metric name must start with [a-zA-Z_:]
   // Value must be a valid Prometheus value (number, +Inf, -Inf, NaN)
   const METRIC_REGEX = /^([a-zA-Z_:][\w_:]*)(?:\{(.*)\})?\s+([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?|NaN|Inf|\+Inf|\-Inf)$/;
   const LABEL_REGEX = /([\w_]+)="(.*?)"/g;

   const prometheusFormatterCSS = `
   /* ====================================== */
   /*        Prometheus Formatter CSS        */
   /* ====================================== */
   
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
   background-color: var(--pf-bg);
   color: var(--pf-fg);
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
   }
   
   #pf-header .pf-icon {
   flex-shrink: 0;
   }
   
   #pf-header .pf-search-active input {
   display: block;
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
   
   #pf-root[data-theme='light'] {
   --pf-bg: #ffffff;
   --pf-fg: #302A24;
   --pf-metric-name-color: #704080;
   --pf-label-key-color: #9C7028;
   --pf-label-value-color: #486830;
   --pf-value-color: #1E5C84;
   --pf-comment-color: #A0A0A0;
   }
   
   #pf-root[data-theme='dark'] {
   --pf-bg: #1E1F22;
   --pf-fg: #BCBEC4;
   --pf-metric-name-color: #C77DBB;
   --pf-label-key-color: #BCBEC4;
   --pf-label-value-color: #6AAB73;
   --pf-value-color: #CF8E6D;
   --pf-comment-color: #7A7E85;
   }
   `;

   class PrometheusMetricsHandler {
	   constructor() {
		   this.entries = [];
	   }

	   /**
		* Parse a line of text and add a Metric or Comment to entries.
		* @param {string} line - The line to parse.
		*/
	   parseAndAddEntry(line) {
		   // Try to parse as comment
		   const commentMatch = line.match(COMMENT_REGEX);
		   if (commentMatch) {
			   const [, type, text] = commentMatch;
			   this.entries.push({
				   type: 'comment',
				   commentType: type,
				   text: text,
				   getHtml: () => `<div class="pf-comment"># ${type} ${text}</div>`,
			   });
			   return;
		   }

		   // Try to parse as metric
		   const metricMatch = line.match(METRIC_REGEX);
		   if (metricMatch) {
			   const [, metricName, labelsString, value] = metricMatch;
			   const labels = this.parseLabels(labelsString);
			   this.entries.push({
				   type: 'metric',
				   name: metricName,
				   labels: labels,
				   value: value,
				   getHtml: () => {
					   const labelParts = Object.entries(labels).map(([key, value]) => {
						   return `<span class="pf-label-key">${key}</span>="<span class="pf-label-value">${value}</span>"`;
					   });
					   const formattedLabels = labelParts.length > 0 ? `<span class="pf-labels">{${labelParts.join(', ')}}</span>` : '';
					   return `<div class="pf-section"><span class="pf-metric-name">${metricName}</span>${formattedLabels} <span class="pf-value">${value}</span></div>`;
				   },
			   });
			   return;
		   }
		   // If the line doesn't match, ignore it
	   }

	   /**
		* Parse the labels from a labels string.
		* @param {string} labelsString - The labels string.
		* @returns {Object} - Labels as key-value pairs.
		*/
	   parseLabels(labelsString) {
		   const labels = {};
		   if (!labelsString) return labels;
		   let match;
		   while ((match = LABEL_REGEX.exec(labelsString)) !== null) {
			   const [, key, value] = match;
			   labels[key] = value;
		   }
		   // Reset LABEL_REGEX lastIndex for next use
		   LABEL_REGEX.lastIndex = 0;
		   return labels;
	   }

	   /**
		* Process an array of lines and populate entries.
		* @param {string[]} lines - Lines to process.
		*/
	   processLines(lines) {
		   lines.forEach((line) => this.parseAndAddEntry(line));
	   }

	   /**
		* Filter entries based on a search query.
		* @param {string} query - The search query.
		* @returns {Array} - Filtered array of entries.
		*/
	   filterEntries(query) {
		   if (!query) return this.entries;
		   const lowerQuery = query.toLowerCase();
		   return this.entries.filter(({
			   type,
			   name,
			   labels,
			   text,
			   value
		   }) => {
			   return type === 'comment' ? text.toLowerCase().includes(lowerQuery) :
				   (name.toLowerCase().includes(lowerQuery) ||
					   Object.entries(labels).some(([key, val]) => key.toLowerCase().includes(lowerQuery) || val.toLowerCase().includes(lowerQuery)) ||
					   value.toLowerCase().includes(lowerQuery));
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
		   const rootElement = document.getElementById('pf-root');
		   if (!rootElement) {
			   console.error('Root element not found. Cannot switch theme.');
			   return;
		   }

		   // Update the root element's data attribute for theme
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
			   this.onSearch(''); // Clear search when hiding
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
	   const contentType = document.contentType;
	   if (contentType === 'application/openmetrics-text') {
		   return true;
	   }

	   if (contentType === 'text/plain') {
		   const bodyText = document.body.textContent.trim();
		   const lines = bodyText.split('\n');
		   let metricLines = 0;
		   let commentLines = 0;
		   let helpLines = 0;
		   let typeLines = 0;

		   for (let line of lines) {
			   if (COMMENT_REGEX.test(line)) {
				   commentLines++;
				   metricLines++;
				   const commentMatch = line.match(COMMENT_REGEX);
				   if (commentMatch) {
					   const [, type] = commentMatch;
					   if (type === 'HELP') helpLines++;
					   if (type === 'TYPE') typeLines++;
				   }
			   } else if (METRIC_REGEX.test(line)) {
				   metricLines++;
			   }
		   }

		   // More than 50% of lines are metric lines
		   // At least one HELP and one TYPE comment present
		   const isMetricDense = lines.length > 0 && (metricLines / lines.length) > 0.5;
		   const hasHelpAndType = helpLines > 0 && typeLines > 0;

		   return isMetricDense && hasHelpAndType;
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
		   container.setAttribute('data-theme', currentTheme);

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
