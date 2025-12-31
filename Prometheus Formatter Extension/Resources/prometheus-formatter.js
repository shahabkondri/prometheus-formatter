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

  const DEFAULT_MAX_SIZE_BYTES = 32 * 1024 * 1024;
  const DEFAULT_LARGE_PAYLOAD_BYTES = 6 * 1024 * 1024;
  const DEFAULT_VIRTUAL_ROW_HEIGHT = 24;
  const DEFAULT_VIRTUAL_OVERSCAN = 8;
  const IDLE_TIMEOUT_MS = 100;
  const CHUNK_TIME_SLICE_MS = 12;

  const FAMILY_SUFFIXES = ['_bucket', '_sum', '_count'];
  const META_COMMENT_TYPES = new Set(['HELP', 'TYPE', 'UNIT']);
  const SIDEBAR_TOGGLE_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">' +
    '<rect width="18" height="18" x="3" y="3" rx="2"></rect>' +
    '<path d="M9 3v18"></path>' +
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
  const BASE_STYLE_ID = 'prometheus-formatter-base-style';
  const THEME_STYLE_ID = 'prometheus-formatter-theme-style';
  const BASE_STYLE_PATH = 'prometheus-formatter-base.css';
  const DEFAULT_THEME_ID = 'dark-graphite';
  const LEGACY_THEME_MAP = {
    dark: 'dark-graphite',
    light: 'light-ivory',
  };
  const THEME_DEFINITIONS = [
    { id: 'light-ivory', label: 'Ivory', mode: 'light', file: 'themes/light-ivory.css' },
    { id: 'light-sandstone', label: 'Sandstone', mode: 'light', file: 'themes/light-sandstone.css' },
    { id: 'light-mint', label: 'Mint', mode: 'light', file: 'themes/light-mint.css' },
    { id: 'light-sky', label: 'Sky', mode: 'light', file: 'themes/light-sky.css' },
    { id: 'light-slate', label: 'Slate', mode: 'light', file: 'themes/light-slate.css' },
    { id: 'light-rose', label: 'Rose', mode: 'light', file: 'themes/light-rose.css' },
    { id: 'dark-graphite', label: 'Graphite', mode: 'dark', file: 'themes/dark-graphite.css' },
    { id: 'dark-ember', label: 'Ember', mode: 'dark', file: 'themes/dark-ember.css' },
    { id: 'dark-forest', label: 'Forest', mode: 'dark', file: 'themes/dark-forest.css' },
    { id: 'dark-ocean', label: 'Ocean', mode: 'dark', file: 'themes/dark-ocean.css' },
    { id: 'dark-cinder', label: 'Cinder', mode: 'dark', file: 'themes/dark-cinder.css' },
    { id: 'dark-aurora', label: 'Aurora', mode: 'dark', file: 'themes/dark-aurora.css' },
    { id: 'vaporwave', label: 'Vaporwave', mode: 'dark', file: 'themes/vaporwave.css' },
    { id: 'nocturne', label: 'Nocturne', mode: 'dark', file: 'themes/nocturne.css' },
  ];
  const THEME_GROUPS = [
    { mode: 'light', label: 'Light' },
    { mode: 'dark', label: 'Dark' },
  ];
  const THEME_LOOKUP = new Map(THEME_DEFINITIONS.map((theme) => [theme.id, theme]));

  const resolveThemeId = (value) => {
    const normalized = value ? String(value).trim() : '';
    const legacy = LEGACY_THEME_MAP[normalized];
    const candidate = legacy || normalized;
    if (THEME_LOOKUP.has(candidate)) return candidate;
    return DEFAULT_THEME_ID;
  };
  const formatBytes = (value) => {
    const bytes = Number(value);
    if (!Number.isFinite(bytes)) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let index = -1;
    let current = bytes;
    while (current >= 1024 && index < units.length - 1) {
      current /= 1024;
      index += 1;
    }
    return `${current.toFixed(current >= 10 ? 0 : 1)} ${units[index]}`;
  };

  const normalizeNumberSetting = (value, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return fallback;
    }
    return numeric;
  };

  const resolveSettings = (stored = {}) => {
    const rootSettings = root.PrometheusFormatterSettings || {};
    const maxPayloadBytes = normalizeNumberSetting(
      rootSettings.maxPayloadBytes,
      normalizeNumberSetting(stored.maxPayloadBytes, DEFAULT_MAX_SIZE_BYTES)
    );
    const largePayloadBytes = normalizeNumberSetting(
      rootSettings.largePayloadBytes,
      normalizeNumberSetting(stored.largePayloadBytes, DEFAULT_LARGE_PAYLOAD_BYTES)
    );
    const virtualRowHeight = normalizeNumberSetting(
      rootSettings.virtualRowHeight,
      normalizeNumberSetting(stored.virtualRowHeight, DEFAULT_VIRTUAL_ROW_HEIGHT)
    );
    const virtualOverscan = normalizeNumberSetting(
      rootSettings.virtualOverscan,
      normalizeNumberSetting(stored.virtualOverscan, DEFAULT_VIRTUAL_OVERSCAN)
    );

    return {
      maxPayloadBytes,
      largePayloadBytes: Math.min(largePayloadBytes, maxPayloadBytes),
      virtualRowHeight,
      virtualOverscan,
    };
  };

  const requestIdle = (callback) => {
    if (typeof root.requestIdleCallback === 'function') {
      return root.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
    }
    return root.setTimeout(() => callback({ timeRemaining: () => 0, didTimeout: true }), 0);
  };

  const shouldYield = (deadline, startTime) => {
    if (deadline && !deadline.didTimeout && deadline.timeRemaining() < 4) {
      return true;
    }
    if (!deadline || deadline.didTimeout) {
      return performance.now() - startTime > CHUNK_TIME_SLICE_MS;
    }
    return false;
  };
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

  const escapeRegExp = (value) => {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const highlightRawText = (text, query) => {
    if (!query) return escapeHtml(text);
    const escapedQuery = escapeRegExp(query);
    if (!escapedQuery) return escapeHtml(text);
    const regex = new RegExp(escapedQuery, 'gi');
    let result = '';
    let lastIndex = 0;
    let match = regex.exec(text);
    while (match) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        result += escapeHtml(text.slice(lastIndex, start));
      }
      result += `<mark class="pf-raw-search-hit">${escapeHtml(text.slice(start, end))}</mark>`;
      lastIndex = end;
      match = regex.exec(text);
    }
    if (lastIndex < text.length) {
      result += escapeHtml(text.slice(lastIndex));
    }
    return result;
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

  class VirtualizedList {
    constructor(container, options = {}) {
      this.container = container;
      this.items = [];
      this.pool = [];
      this.startIndex = 0;
      this.endIndex = 0;
      this.rowHeight = options.rowHeight || DEFAULT_VIRTUAL_ROW_HEIGHT;
      this.overscan = options.overscan || DEFAULT_VIRTUAL_OVERSCAN;
      this.renderRow = typeof options.renderRow === 'function' ? options.renderRow : () => {};
      this.emptyMessage = options.emptyMessage || 'No metrics found.';
      this.onScroll = this.render.bind(this);
      this.onResize = () => this.refresh();

      this.container.classList.add('pf-virtualized');
      this.container.innerHTML = '';

      this.spacer = document.createElement('div');
      this.spacer.className = 'pf-virtual-spacer';

      this.list = document.createElement('div');
      this.list.className = 'pf-virtual-list';

      this.emptyState = document.createElement('div');
      this.emptyState.className = 'pf-empty';
      this.emptyState.textContent = this.emptyMessage;

      this.container.appendChild(this.spacer);
      this.container.appendChild(this.list);
      this.container.appendChild(this.emptyState);

      this.container.addEventListener('scroll', this.onScroll);
      window.addEventListener('resize', this.onResize);
    }

    setItems(items = []) {
      this.items = items;
      this.refresh(true);
    }

    refresh(force) {
      const total = this.items.length;
      this.spacer.style.height = `${total * this.rowHeight}px`;
      if (total === 0) {
        this.list.style.display = 'none';
        this.spacer.style.display = 'none';
        this.emptyState.style.display = 'block';
        return;
      }
      this.list.style.display = 'block';
      this.spacer.style.display = 'block';
      this.emptyState.style.display = 'none';
      this.render(force);
    }

    ensurePool(size) {
      while (this.pool.length < size) {
        const row = document.createElement('div');
        row.className = 'pf-virtual-row';
        row.style.height = `${this.rowHeight}px`;
        this.pool.push(row);
        this.list.appendChild(row);
      }
    }

    render(force) {
      if (!this.container || this.items.length === 0) {
        return;
      }
      const viewportHeight = this.container.clientHeight;
      if (viewportHeight === 0) {
        return;
      }
      const scrollTop = this.container.scrollTop;
      const startIndex = Math.max(0, Math.floor(scrollTop / this.rowHeight) - this.overscan);
      const endIndex = Math.min(
        this.items.length,
        Math.ceil((scrollTop + viewportHeight) / this.rowHeight) + this.overscan
      );
      if (!force && startIndex === this.startIndex && endIndex === this.endIndex) {
        return;
      }
      this.startIndex = startIndex;
      this.endIndex = endIndex;

      const visibleCount = Math.max(0, endIndex - startIndex);
      this.ensurePool(visibleCount);
      this.pool.forEach((row) => {
        row.style.height = `${this.rowHeight}px`;
      });
      this.list.style.transform = `translateY(${startIndex * this.rowHeight}px)`;

      for (let i = 0; i < this.pool.length; i += 1) {
        const row = this.pool[i];
        const itemIndex = startIndex + i;
        if (i >= visibleCount) {
          row.style.display = 'none';
          continue;
        }
        row.style.display = 'flex';
        if (force || row.dataset.index !== String(itemIndex)) {
          this.renderRow(row, this.items[itemIndex], itemIndex);
          row.dataset.index = String(itemIndex);
        }
      }
    }
  }

  class PrometheusMetricsHandler {
    constructor(browserAPI) {
      this.browserAPI = browserAPI;
      this.groups = [];
      this.orphans = [];
      this.familyMetadata = new Map();
      this.parsedEntries = [];
      this.flatEntries = [];
      this.flatVirtualList = null;
      this.virtualRowHeight = DEFAULT_VIRTUAL_ROW_HEIGHT;
      this.virtualOverscan = DEFAULT_VIRTUAL_OVERSCAN;
      this.lastQuery = '';
      this.flatQuery = '';
      this.navHandlerAttached = false;
      this.sidebarHandlerAttached = false;
      this.resizeHandlerAttached = false;
      this.sidebarWidth = DEFAULT_SIDEBAR_WIDTH;
      this.sidebarCollapsed = false;
      this.onNavRender = null;
      this.onSidebarToggle = null;
    }
    setVirtualizationOptions(options = {}) {
      if (Number.isFinite(options.rowHeight) && options.rowHeight > 0) {
        this.virtualRowHeight = options.rowHeight;
      }
      if (Number.isFinite(options.overscan) && options.overscan >= 0) {
        this.virtualOverscan = options.overscan;
      }
      const rootElement = document.documentElement;
      if (rootElement) {
        rootElement.style.setProperty('--pf-virtual-row-height', `${this.virtualRowHeight}px`);
      }
      if (this.flatVirtualList) {
        this.flatVirtualList.rowHeight = this.virtualRowHeight;
        this.flatVirtualList.overscan = this.virtualOverscan;
        this.flatVirtualList.refresh(true);
      }
    }

    setNavRenderHook(callback) {
      this.onNavRender = typeof callback === 'function' ? callback : null;
    }

    setSidebarToggleHook(callback) {
      this.onSidebarToggle = typeof callback === 'function' ? callback : null;
    }

    collectParsedEntry(parsed) {
      if (!parsed) return;
      this.parsedEntries.push(parsed);
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
    }

    buildGroups(options = {}) {
      this.groups = [];
      this.orphans = [];
      this.flatEntries = [];
      const parsedEntries = this.parsedEntries;
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

      let index = 0;
      const total = parsedEntries.length;
      const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
      const onComplete = typeof options.onComplete === 'function' ? options.onComplete : () => {};
      const streaming = Boolean(options.streaming);

      const processEntry = (parsed) => {
        const entry = this.createEntry(parsed);
        if (!entry) return;
        this.flatEntries.push(entry);
        if (parsed.type === 'metric') {
          const familyName = getFamilyName(parsed.name);
          const group = getGroup(familyName, parsed.name);
          group.entries.push(entry);
          return;
        }
        if (parsed.type === 'comment') {
          if (isMetaComment(parsed.commentType)) return;
          this.orphans.push(entry);
          return;
        }
        if (parsed.type === 'warning') {
          this.orphans.push(entry);
        }
      };

      if (!streaming) {
        for (index = 0; index < total; index += 1) {
          processEntry(parsedEntries[index]);
        }
        this.parsedEntries = [];
        onComplete();
        return;
      }

      const runChunk = (deadline) => {
        const startTime = performance.now();
        while (index < total) {
          processEntry(parsedEntries[index]);
          index += 1;
          if (shouldYield(deadline, startTime)) {
            break;
          }
        }
        if (onProgress) {
          onProgress(index, total);
        }
        if (index < total) {
          requestIdle(runChunk);
        } else {
          this.parsedEntries = [];
          onComplete();
        }
      };

      requestIdle(runChunk);
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
    renderFamilyHtml(family, entriesHtml, options) {
      const typeLabel = family.type ? family.type : 'unknown';
      const helpText = family.help && family.help.trim() ? escapeHtml(family.help) : 'No HELP provided';
      const unitHtml = family.unit
        ? `<div class="pf-family-meta-row"><span class="pf-family-unit">unit: ${escapeHtml(family.unit)}</span></div>`
        : '';
      const headerClass = options.headerMatch ? ' pf-family-header-hit' : '';
      const seriesCount = options.seriesCount;

      return `
        <section class="pf-family" data-family-name="${escapeHtml(family.name)}" id="${family.id}">
          <div class="pf-family-header${headerClass}">
            <div class="pf-family-header-content">
              <div class="pf-family-title-row">
                <span class="pf-family-name">${escapeHtml(family.name)}</span>
                <span class="pf-family-pill pf-family-type">type: ${escapeHtml(typeLabel)}</span>
                <span class="pf-family-pill pf-family-count">series: ${seriesCount}</span>
                <span class="pf-family-help">${helpText}</span>
              </div>
              ${unitHtml}
            </div>
          </div>
          <div class="pf-family-body">
            ${entriesHtml}
          </div>
        </section>
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

    /**
     * Render entries into HTML and insert into the page.
     * @param {string} query - Current search query.
     */
    renderEntries(query) {
      this.lastQuery = query;
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

        familiesHtml.push(
          this.renderFamilyHtml(family, entriesHtml, {
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
      this.attachNavHandlers(navContainer);
      this.attachSidebarHandlers();
      this.attachResizeHandler();
      if (this.onNavRender) {
        this.onNavRender();
      }
    }

    renderFlatEntries(query = '') {
      this.lastQuery = query;
      this.flatQuery = normalizeQuery(query);
      const container = document.getElementById('pf-flat-container');
      if (!container) return;
      const hasQuery = this.flatQuery.length > 0;
      const filteredEntries = hasQuery
        ? this.flatEntries.filter((entry) => {
            if (entry.type === 'metric') {
              return matchesMetricEntry(entry, this.flatQuery);
            }
            return matchesOrphanEntry(entry, this.flatQuery);
          })
        : this.flatEntries;
      if (!this.flatVirtualList) {
        this.flatVirtualList = new VirtualizedList(container, {
          rowHeight: this.virtualRowHeight,
          overscan: this.virtualOverscan,
          renderRow: (row, entry) => {
            if (!entry) {
              row.innerHTML = '';
              return;
            }
            const highlight = this.flatQuery.length > 0 && entry.type === 'metric';
            row.innerHTML = entry.getHtml({ highlight });
            row.title = entry.raw || entry.message || '';
          },
        });
      }
      if (this.flatVirtualList.emptyState) {
        this.flatVirtualList.emptyState.textContent = hasQuery ? 'No matching metrics found.' : 'No metrics found.';
      }
      this.flatVirtualList.setItems(filteredEntries);
    }
  }

  class PrometheusUIManager {
    constructor(currentThemeId, browserAPI, handlers = {}) {
      this.currentThemeId = currentThemeId;
      this.browserAPI = browserAPI;
      this.onSearch = typeof handlers.onSearch === 'function' ? handlers.onSearch : () => {};
      this.onViewModeChange = typeof handlers.onViewModeChange === 'function' ? handlers.onViewModeChange : () => {};
      this.searchBarVisible = false;
      this.searchContainer = null;
      this.searchButton = null;
      this.themeButton = null;
      this.themeMenu = null;
      this.themeMenuOpen = false;
      this.themeMenuInitialized = false;
      this.viewMode = 'formatted';
      this.viewButtons = {
        formatted: null,
        flat: null,
        raw: null,
      };
      this.viewToggleInitialized = false;
    }

    injectCSS() {
      this.injectBaseCSS();
      this.applyTheme(this.currentThemeId, { persist: false });
    }

    injectBaseCSS() {
      if (document.getElementById(BASE_STYLE_ID)) return;
      const link = document.createElement('link');
      link.id = BASE_STYLE_ID;
      link.rel = 'stylesheet';
      link.href = this.browserAPI.runtime.getURL(BASE_STYLE_PATH);
      document.head.appendChild(link);
    }

    injectThemeCSS(themeId) {
      const theme = THEME_LOOKUP.get(themeId);
      if (!theme) return;
      const href = this.browserAPI.runtime.getURL(theme.file);
      let link = document.getElementById(THEME_STYLE_ID);
      if (!link) {
        link = document.createElement('link');
        link.id = THEME_STYLE_ID;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      if (link.getAttribute('href') !== href) {
        link.setAttribute('href', href);
      }
      const rootElement = document.documentElement;
      if (rootElement) {
        rootElement.setAttribute('data-theme', themeId);
      }
    }

    applyTheme(themeId, options = {}) {
      const resolvedThemeId = resolveThemeId(themeId);
      this.currentThemeId = resolvedThemeId;
      this.injectThemeCSS(resolvedThemeId);
      this.updateThemeMenuSelection();
      this.updateThemeButtonLabel();
      const shouldPersist = options.persist !== false;
      if (shouldPersist && this.browserAPI?.storage?.local) {
        this.browserAPI.storage.local.set({ theme: resolvedThemeId });
      }
    }

    updateThemeButtonLabel() {
      if (!this.themeButton) return;
      const theme = THEME_LOOKUP.get(this.currentThemeId);
      const label = theme ? theme.label : this.currentThemeId;
      this.themeButton.setAttribute('title', `Theme: ${label}`);
      this.themeButton.setAttribute('aria-label', `Theme menu (${label})`);
    }

    updateThemeMenuSelection() {
      if (!this.themeMenu) return;
      const options = this.themeMenu.querySelectorAll('.pf-theme-option');
      options.forEach((option) => {
        const isActive = option.dataset.themeId === this.currentThemeId;
        option.classList.toggle('active', isActive);
        option.setAttribute('aria-pressed', String(isActive));
      });
    }

    getTopControlsContainer() {
      let container = document.getElementById('pf-top-controls');
      if (!container) {
        container = document.createElement('div');
        container.id = 'pf-top-controls';
        container.classList.add('pf-top-controls');
        document.body.appendChild(container);
      }
      return container;
    }

    injectViewToggleUI() {
      if (this.viewToggleInitialized) return;
      const viewContainer = document.createElement('div');
      viewContainer.id = 'pf-view-controls';
      viewContainer.classList.add('pf-view-controls');

      const viewToggle = document.createElement('div');
      viewToggle.classList.add('pf-view-toggle');

      const formattedButton = document.createElement('button');
      formattedButton.type = 'button';
      formattedButton.classList.add('pf-toggle-button');
      formattedButton.textContent = 'Formatted';
      formattedButton.addEventListener('click', () => this.setViewMode('formatted'));

      const rawButton = document.createElement('button');
      rawButton.type = 'button';
      rawButton.classList.add('pf-toggle-button');
      rawButton.textContent = 'Raw';
      rawButton.addEventListener('click', () => this.setViewMode('raw'));

      const flatButton = document.createElement('button');
      flatButton.type = 'button';
      flatButton.classList.add('pf-toggle-button');
      flatButton.textContent = 'Flat';
      flatButton.addEventListener('click', () => this.setViewMode('flat'));

      viewToggle.appendChild(formattedButton);
      viewToggle.appendChild(flatButton);
      viewToggle.appendChild(rawButton);
      viewContainer.appendChild(viewToggle);
      const topControls = this.getTopControlsContainer();
      const themeControls = document.getElementById('pf-theme-controls');
      if (themeControls && themeControls.parentElement === topControls) {
        topControls.insertBefore(viewContainer, themeControls);
      } else {
        topControls.appendChild(viewContainer);
      }

      this.viewButtons.formatted = formattedButton;
      this.viewButtons.flat = flatButton;
      this.viewButtons.raw = rawButton;
      this.viewToggleInitialized = true;
      this.updateViewToggleButtons();
    }

    setViewMode(mode, options = {}) {
      const nextMode = mode === 'raw' ? 'raw' : mode === 'flat' ? 'flat' : 'formatted';
      this.viewMode = nextMode;
      const root = document.getElementById('pf-root');
      if (root) {
        root.classList.toggle('pf-view-raw', nextMode === 'raw');
        root.classList.toggle('pf-view-flat', nextMode === 'flat');
      }
      this.updateViewToggleButtons();
      this.mountSearchControls();
      this.mountSearchBar();
      const shouldPersist = options.persist !== false;
      if (shouldPersist && this.browserAPI?.storage?.local) {
        this.browserAPI.storage.local.set({ viewMode: nextMode });
      }
      this.onViewModeChange(nextMode);
    }

    updateViewToggleButtons() {
      const isRaw = this.viewMode === 'raw';
      const isFlat = this.viewMode === 'flat';
      if (this.viewButtons.formatted) {
        const isActive = !isRaw && !isFlat;
        this.viewButtons.formatted.classList.toggle('active', isActive);
        this.viewButtons.formatted.setAttribute('aria-pressed', String(isActive));
      }
      if (this.viewButtons.flat) {
        this.viewButtons.flat.classList.toggle('active', isFlat);
        this.viewButtons.flat.setAttribute('aria-pressed', String(isFlat));
      }
      if (this.viewButtons.raw) {
        this.viewButtons.raw.classList.toggle('active', isRaw);
        this.viewButtons.raw.setAttribute('aria-pressed', String(isRaw));
      }
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
        this.onSearch(value, this.viewMode);
        searchContainer.classList.toggle('has-value', value.length > 0);
      });

      clearButton.addEventListener('click', () => {
        searchInput.value = '';
        searchContainer.classList.remove('has-value');
        this.onSearch('', this.viewMode);
        searchInput.focus();
      });

      searchField.appendChild(searchInput);
      searchField.appendChild(clearButton);
      searchContainer.appendChild(searchField);

      this.ensureSidebarButtons();
      this.mountThemeControls();
    }

    ensureSidebarButtons() {
      if (this.searchButton) {
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

      this.searchButton = searchButton;
    }

    ensureThemeButton() {
      if (this.themeButton) {
        return this.themeButton;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.classList.add('pf-theme-button');
      button.setAttribute('aria-haspopup', 'menu');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', 'pf-theme-menu');
      const icon = document.createElement('img');
      icon.src = this.browserAPI.runtime.getURL('images/theme-selector.png');
      icon.alt = '';
      icon.classList.add('pf-theme-icon');
      icon.setAttribute('aria-hidden', 'true');
      button.appendChild(icon);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleThemeMenu();
      });
      this.themeButton = button;
      this.updateThemeButtonLabel();
      return button;
    }

    ensureThemeMenu() {
      if (this.themeMenu) {
        return this.themeMenu;
      }
      const menu = document.createElement('div');
      menu.id = 'pf-theme-menu';
      menu.classList.add('pf-theme-menu');
      menu.setAttribute('role', 'menu');
      menu.setAttribute('aria-hidden', 'true');

      THEME_GROUPS.forEach((group) => {
        const groupEl = document.createElement('div');
        groupEl.classList.add('pf-theme-group');
        const label = document.createElement('div');
        label.classList.add('pf-theme-group-label');
        label.textContent = group.label;
        groupEl.appendChild(label);

        THEME_DEFINITIONS.filter((theme) => theme.mode === group.mode).forEach((theme) => {
          const option = document.createElement('button');
          option.type = 'button';
          option.classList.add('pf-theme-option');
          option.dataset.themeId = theme.id;
          option.setAttribute('role', 'menuitem');
          option.textContent = theme.label;
          option.addEventListener('click', () => {
            this.switchTheme(theme.id);
            this.closeThemeMenu();
          });
          groupEl.appendChild(option);
        });

        menu.appendChild(groupEl);
      });

      this.themeMenu = menu;
      this.updateThemeMenuSelection();
      return menu;
    }

    resolveSearchButtonContainer() {
      if (this.viewMode === 'raw' || this.viewMode === 'flat') {
        return this.getTopControlsContainer();
      }
      const sidebar = document.getElementById('pf-sidebar');
      if (!sidebar) return null;
      const style = window.getComputedStyle(sidebar);
      if (style.display === 'none') {
        return this.getTopControlsContainer();
      }
      return document.querySelector('.pf-sidebar-controls');
    }

    mountSearchControls() {
      this.ensureSidebarButtons();
      if (!this.searchButton) return;
      const container = this.resolveSearchButtonContainer();
      if (!container) {
        if (this.searchButton.parentElement) {
          this.searchButton.parentElement.removeChild(this.searchButton);
        }
        return;
      }
      if (container.id === 'pf-top-controls') {
        const themeControls = document.getElementById('pf-theme-controls');
        if (themeControls && themeControls.parentElement === container) {
          container.insertBefore(this.searchButton, themeControls);
          return;
        }
      }
      if (this.searchButton.parentElement !== container) {
        container.appendChild(this.searchButton);
      }
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
      const topControls = this.getTopControlsContainer();
      let container = document.getElementById('pf-theme-controls');
      if (!container) {
        container = document.createElement('div');
        container.id = 'pf-theme-controls';
        container.classList.add('pf-theme-controls');
      }
      if (container.parentElement !== topControls) {
        topControls.appendChild(container);
      }
      const button = this.ensureThemeButton();
      const menu = this.ensureThemeMenu();
      if (button.parentElement !== container) {
        container.appendChild(button);
      }
      if (menu.parentElement !== container) {
        container.appendChild(menu);
      }
      this.registerThemeMenuHandlers();
    }

    /**
     * Switch to the selected theme.
     * @param {string} newTheme - The theme id to apply.
     */
    switchTheme(newTheme) {
      this.applyTheme(newTheme);
    }

    registerThemeMenuHandlers() {
      if (this.themeMenuInitialized) return;
      this.themeMenuInitialized = true;
      document.addEventListener('click', (event) => {
        if (!this.themeMenuOpen) return;
        const container = document.getElementById('pf-theme-controls');
        if (container && !container.contains(event.target)) {
          this.closeThemeMenu();
        }
      });
      document.addEventListener('keydown', (event) => {
        if (!this.themeMenuOpen) return;
        if (event.key === 'Escape') {
          this.closeThemeMenu();
          if (this.themeButton) {
            this.themeButton.focus();
          }
        }
      });
    }

    toggleThemeMenu() {
      if (this.themeMenuOpen) {
        this.closeThemeMenu();
        return;
      }
      this.openThemeMenu();
    }

    openThemeMenu() {
      if (!this.themeMenu || !this.themeButton) return;
      this.themeMenuOpen = true;
      this.themeMenu.classList.add('open');
      this.themeMenu.setAttribute('aria-hidden', 'false');
      this.themeButton.setAttribute('aria-expanded', 'true');
    }

    closeThemeMenu() {
      if (!this.themeMenu || !this.themeButton) return;
      this.themeMenuOpen = false;
      this.themeMenu.classList.remove('open');
      this.themeMenu.setAttribute('aria-hidden', 'true');
      this.themeButton.setAttribute('aria-expanded', 'false');
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

  const showSizeWarning = (contentSize, maxSize) => {
    if (document.getElementById('pf-size-warning')) return;
    const warning = document.createElement('div');
    warning.id = 'pf-size-warning';
    warning.textContent = `Prometheus Formatter skipped: payload ${formatBytes(contentSize)} exceeds limit ${formatBytes(
      maxSize
    )}. Adjust maxPayloadBytes to increase this limit.`;
    warning.style.cssText =
      'position: sticky; top: 0; z-index: 2147483647; padding: 0.6em 1em; background: #fff4e5; color: #7a4b00; ' +
      'border-bottom: 1px solid #f0c36d; font-family: "SF Mono", "SFMono-Regular", Menlo, Monaco, "Courier New", monospace; font-size: 13px;';
    document.body.prepend(warning);
  };

  const startStreamingParse = (rawText, metricsHandler, options = {}) => {
    const totalLength = rawText.length;
    let index = 0;
    let lineNumber = 0;
    const onComplete = typeof options.onComplete === 'function' ? options.onComplete : () => {};

    const runChunk = (deadline) => {
      const startTime = performance.now();
      while (index < totalLength) {
        const nextNewline = rawText.indexOf('\n', index);
        let line = '';
        if (nextNewline === -1) {
          line = rawText.slice(index);
          index = totalLength;
        } else {
          line = rawText.slice(index, nextNewline);
          index = nextNewline + 1;
        }
        lineNumber += 1;
        const parsed = parsePrometheusLine(line, lineNumber);
        if (parsed) {
          metricsHandler.collectParsedEntry(parsed);
        }
        if (shouldYield(deadline, startTime)) {
          break;
        }
      }
      if (index < totalLength) {
        requestIdle(runChunk);
      } else {
        onComplete();
      }
    };

    requestIdle(runChunk);
  };

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
      const rawText = document.body.textContent || '';
      const bodyText = rawText.trim();
      if (!bodyText) return false;
      const sampleText = bodyText.slice(0, 200000);
      const lines = sampleText.split('\n');
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

    const rawText = document.body.textContent || '';
    const bodyText = rawText.trim();
    if (!bodyText) return;

    const contentSize = new Blob([rawText]).size;
    const rootElement = document.documentElement;
    const previousVisibility = rootElement ? rootElement.style.visibility : '';
    const restoreVisibility = () => {
      if (rootElement) {
        rootElement.style.visibility = previousVisibility;
      }
    };
    if (rootElement) {
      rootElement.style.visibility = 'hidden';
    }

    const applyPreferences = (result = {}) => {
      const settings = resolveSettings(result);
      if (contentSize > settings.maxPayloadBytes) {
        restoreVisibility();
        showSizeWarning(contentSize, settings.maxPayloadBytes);
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

      const flatContainer = document.createElement('div');
      flatContainer.id = 'pf-flat-container';

      const rawContainer = document.createElement('pre');
      rawContainer.id = 'pf-raw-container';
      rawContainer.classList.add('pf-raw-container');
      rawContainer.dataset.loaded = 'false';

      sidebar.appendChild(navContainer);
      sidebar.appendChild(resizer);
      layout.appendChild(sidebar);
      main.appendChild(mainSearch);
      main.appendChild(metricsContainer);
      main.appendChild(flatContainer);
      main.appendChild(rawContainer);
      layout.appendChild(main);
      contentContainer.appendChild(layout);
      container.appendChild(contentContainer);
      document.body.appendChild(container);

      const currentTheme = resolveThemeId(result.theme);

      const metricsHandler = new PrometheusMetricsHandler(browserAPI);
      metricsHandler.setVirtualizationOptions({
        rowHeight: settings.virtualRowHeight,
        overscan: settings.virtualOverscan,
      });
      metricsHandler.applySidebarPreferences({
        sidebarWidth: result.sidebarWidth,
        sidebarCollapsed: result.sidebarCollapsed,
      });

      const ensureRawContent = (force = false) => {
        if (!force && rawContainer.dataset.loaded === 'true') return;
        rawContainer.textContent = rawText;
        rawContainer.dataset.loaded = 'true';
      };

      const updateRawSearch = (query) => {
        const normalizedQuery = normalizeQuery(query);
        if (!normalizedQuery) {
          ensureRawContent(true);
          return;
        }
        rawContainer.innerHTML = highlightRawText(rawText, normalizedQuery);
        rawContainer.dataset.loaded = 'true';
      };

      let parseReady = false;

      const uiManager = new PrometheusUIManager(currentTheme, browserAPI, {
        onSearch: (query, viewMode) => {
          if (viewMode === 'raw') {
            metricsHandler.lastQuery = query;
            updateRawSearch(query);
            return;
          }
          if (!parseReady) return;
          if (viewMode === 'flat') {
            metricsHandler.renderFlatEntries(query);
            return;
          }
          metricsHandler.renderEntries(query);
        },
        onViewModeChange: (mode) => {
          if (mode === 'raw') {
            updateRawSearch(metricsHandler.lastQuery || '');
            return;
          }
          if (!parseReady) return;
          if (mode === 'flat') {
            metricsHandler.renderFlatEntries(metricsHandler.lastQuery || '');
            return;
          }
          metricsHandler.renderEntries(metricsHandler.lastQuery || '');
        },
      });

      uiManager.injectCSS();
      restoreVisibility();
      uiManager.injectViewToggleUI();
      uiManager.injectSearchUI();
      metricsHandler.setNavRenderHook(() => {
        uiManager.mountSearchControls();
        uiManager.mountSearchBar();
      });
      metricsHandler.setSidebarToggleHook(() => {
        uiManager.mountSearchControls();
        uiManager.mountSearchBar();
      });

      const finalizeRender = () => {
        parseReady = true;
        const storedViewMode = result.viewMode || 'formatted';
        const preferFlat = contentSize >= settings.largePayloadBytes && (!result.viewMode || storedViewMode === 'formatted');
        const userSelectedMode = uiManager.viewMode;
        const hasUserSelected = userSelectedMode !== 'formatted';
        const defaultViewMode = preferFlat ? 'flat' : storedViewMode;
        const initialViewMode = hasUserSelected ? userSelectedMode : defaultViewMode;
        uiManager.setViewMode(initialViewMode, { persist: !preferFlat && !hasUserSelected });

        uiManager.mountSearchControls();
        uiManager.mountSearchBar();
      };

      startStreamingParse(rawText, metricsHandler, {
        onComplete: () => {
          metricsHandler.buildGroups({
            streaming: true,
            onComplete: finalizeRender,
          });
        },
      });
    };

    if (browserAPI?.storage?.local) {
      browserAPI.storage.local.get(
        [
          'theme',
          'sidebarWidth',
          'sidebarCollapsed',
          'viewMode',
          'maxPayloadBytes',
          'largePayloadBytes',
          'virtualRowHeight',
          'virtualOverscan',
        ],
        applyPreferences
      );
    } else {
      applyPreferences({});
    }
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
