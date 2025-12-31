(() => {
  const METRIC_NAME_REGEX = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
  const LABEL_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  const VALUE_REGEX = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/;
  const SPECIAL_VALUE_REGEX = /^(?:NaN|Inf|\+Inf|\-Inf)$/;
  const TIMESTAMP_REGEX = /^[-+]?\d+(?:\.\d+)?$/;

  const isWhitespace = (char) => char === ' ' || char === '\t';

  const isMetricNameStart = (char) => /[a-zA-Z_:]/.test(char);
  const isMetricNameChar = (char) => /[a-zA-Z0-9_:]/.test(char);
  const isLabelNameStart = (char) => /[a-zA-Z_]/.test(char);
  const isLabelNameChar = (char) => /[a-zA-Z0-9_]/.test(char);

  const skipWhitespace = (line, pos) => {
    let index = pos;
    while (index < line.length && isWhitespace(line[index])) {
      index += 1;
    }
    return index;
  };

  const readToken = (line, pos, stopAtHash) => {
    let index = pos;
    while (index < line.length) {
      const char = line[index];
      if (isWhitespace(char) || (stopAtHash && char === '#')) {
        break;
      }
      index += 1;
    }
    return {
      token: line.slice(pos, index),
      pos: index,
    };
  };

  const isValidSampleValue = (token) => {
    return SPECIAL_VALUE_REGEX.test(token) || VALUE_REGEX.test(token);
  };

  const isValidTimestamp = (token) => TIMESTAMP_REGEX.test(token);

  const makeWarning = (lineNumber, message, raw) => ({
    type: 'warning',
    lineNumber,
    message,
    raw,
  });

  const parseQuotedString = (line, startPos) => {
    let pos = startPos + 1;
    let value = '';
    while (pos < line.length) {
      const char = line[pos];
      if (char === '"') {
        return { value, pos: pos + 1 };
      }
      if (char === '\\') {
        pos += 1;
        if (pos >= line.length) {
          return { error: 'Unterminated escape sequence' };
        }
        const escaped = line[pos];
        switch (escaped) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case 'r':
            value += '\r';
            break;
          case '\\':
            value += '\\';
            break;
          case '"':
            value += '"';
            break;
          default:
            return { error: `Invalid escape sequence \\${escaped}` };
        }
        pos += 1;
        continue;
      }
      value += char;
      pos += 1;
    }
    return { error: 'Unterminated quoted string' };
  };

  const parseLabelSet = (line, startPos) => {
    let pos = startPos;
    const labels = [];
    if (line[pos] !== '{') {
      return { error: 'Expected "{" to start labels' };
    }
    pos += 1;
    pos = skipWhitespace(line, pos);

    if (pos < line.length && line[pos] === '}') {
      return { labels, pos: pos + 1 };
    }

    while (pos < line.length) {
      pos = skipWhitespace(line, pos);
      if (pos >= line.length) {
        return { error: 'Unterminated label set' };
      }
      const nameStart = pos;
      if (!isLabelNameStart(line[pos])) {
        return { error: 'Invalid label name' };
      }
      pos += 1;
      while (pos < line.length && isLabelNameChar(line[pos])) {
        pos += 1;
      }
      const name = line.slice(nameStart, pos);
      if (!LABEL_NAME_REGEX.test(name)) {
        return { error: `Invalid label name "${name}"` };
      }
      pos = skipWhitespace(line, pos);
      if (pos >= line.length || line[pos] !== '=') {
        return { error: `Expected "=" after label name "${name}"` };
      }
      pos += 1;
      pos = skipWhitespace(line, pos);
      if (pos >= line.length || line[pos] !== '"') {
        return { error: `Expected quoted value for label "${name}"` };
      }
      const valueResult = parseQuotedString(line, pos);
      if (valueResult.error) {
        return { error: valueResult.error };
      }
      pos = valueResult.pos;
      labels.push({ key: name, value: valueResult.value });
      pos = skipWhitespace(line, pos);
      if (pos >= line.length) {
        return { error: 'Unterminated label set' };
      }
      if (line[pos] === ',') {
        pos += 1;
        continue;
      }
      if (line[pos] === '}') {
        return { labels, pos: pos + 1 };
      }
      return { error: 'Expected "," or "}" after label value' };
    }
    return { error: 'Unterminated label set' };
  };

  const parseExemplar = (line, startPos) => {
    let pos = startPos;
    const len = line.length;
    if (line[pos] !== '#') {
      return { error: 'Expected "#" to start exemplar' };
    }
    pos += 1;
    pos = skipWhitespace(line, pos);
    if (pos >= len || line[pos] !== '{') {
      return { error: 'Expected "{" after "#" for exemplar labels' };
    }
    const labelResult = parseLabelSet(line, pos);
    if (labelResult.error) {
      return { error: labelResult.error };
    }
    pos = labelResult.pos;
    pos = skipWhitespace(line, pos);
    if (pos >= len) {
      return { error: 'Missing exemplar value' };
    }
    const valueResult = readToken(line, pos, false);
    if (!valueResult.token) {
      return { error: 'Missing exemplar value' };
    }
    if (!isValidSampleValue(valueResult.token)) {
      return { error: 'Invalid exemplar value' };
    }
    pos = valueResult.pos;
    pos = skipWhitespace(line, pos);
    let timestamp = null;
    if (pos < len) {
      const tsResult = readToken(line, pos, false);
      if (!tsResult.token) {
        return { error: 'Missing exemplar timestamp' };
      }
      if (!isValidTimestamp(tsResult.token)) {
        return { error: 'Invalid exemplar timestamp' };
      }
      timestamp = tsResult.token;
      pos = tsResult.pos;
      pos = skipWhitespace(line, pos);
    }
    return {
      exemplar: {
        labels: labelResult.labels,
        value: valueResult.token,
        timestamp: timestamp,
      },
      pos: pos,
    };
  };

  const parseCommentLine = (line, lineNumber) => {
    const trimmed = line.trim();
    const content = trimmed.replace(/^#\s*/, '');
    if (content.length === 0) {
      return {
        type: 'comment',
        raw: line,
        commentType: 'COMMENT',
        text: '',
      };
    }
    const spaceIndex = content.indexOf(' ');
    const keyword = spaceIndex === -1 ? content : content.slice(0, spaceIndex);
    if (keyword === 'HELP' || keyword === 'TYPE' || keyword === 'UNIT') {
      const rest = content.slice(keyword.length).trim();
      if (!rest) {
        return makeWarning(lineNumber, `Missing metric name in # ${keyword}`, line);
      }
      const nameEnd = rest.search(/\s/);
      const metricName = nameEnd === -1 ? rest : rest.slice(0, nameEnd);
      const text = nameEnd === -1 ? '' : rest.slice(nameEnd + 1);
      if (!METRIC_NAME_REGEX.test(metricName)) {
        return makeWarning(lineNumber, `Invalid metric name "${metricName}" in # ${keyword}`, line);
      }
      if ((keyword === 'TYPE' || keyword === 'UNIT') && text.trim().length === 0) {
        return makeWarning(
          lineNumber,
          `Missing ${keyword === 'TYPE' ? 'type' : 'unit'} for "${metricName}"`,
          line
        );
      }
      return {
        type: 'comment',
        raw: line,
        commentType: keyword,
        metricName,
        text: text,
      };
    }
    if (keyword === 'EOF') {
      return {
        type: 'comment',
        raw: line,
        commentType: 'EOF',
        text: '',
      };
    }
    return {
      type: 'comment',
      raw: line,
      commentType: 'COMMENT',
      text: content,
    };
  };

  const parseSampleLine = (line, lineNumber) => {
    let pos = skipWhitespace(line, 0);
    if (pos >= line.length || !isMetricNameStart(line[pos])) {
      return makeWarning(lineNumber, 'Expected metric name', line);
    }
    const nameStart = pos;
    pos += 1;
    while (pos < line.length && isMetricNameChar(line[pos])) {
      pos += 1;
    }
    const metricName = line.slice(nameStart, pos);
    if (!METRIC_NAME_REGEX.test(metricName)) {
      return makeWarning(lineNumber, `Invalid metric name "${metricName}"`, line);
    }

    let labels = [];
    if (pos < line.length && line[pos] === '{') {
      const labelResult = parseLabelSet(line, pos);
      if (labelResult.error) {
        return makeWarning(lineNumber, labelResult.error, line);
      }
      labels = labelResult.labels;
      pos = labelResult.pos;
    }

    if (pos >= line.length || !isWhitespace(line[pos])) {
      return makeWarning(lineNumber, 'Expected whitespace before sample value', line);
    }
    pos = skipWhitespace(line, pos);

    if (pos >= line.length) {
      return makeWarning(lineNumber, 'Missing sample value', line);
    }
    const valueResult = readToken(line, pos, true);
    if (!valueResult.token) {
      return makeWarning(lineNumber, 'Missing sample value', line);
    }
    if (!isValidSampleValue(valueResult.token)) {
      return makeWarning(lineNumber, `Invalid sample value "${valueResult.token}"`, line);
    }
    const value = valueResult.token;
    pos = valueResult.pos;

    pos = skipWhitespace(line, pos);
    let timestamp = null;
    if (pos < line.length && line[pos] !== '#') {
      const tsResult = readToken(line, pos, true);
      if (!tsResult.token) {
        return makeWarning(lineNumber, 'Missing timestamp', line);
      }
      if (!isValidTimestamp(tsResult.token)) {
        return makeWarning(lineNumber, `Invalid timestamp "${tsResult.token}"`, line);
      }
      timestamp = tsResult.token;
      pos = tsResult.pos;
      pos = skipWhitespace(line, pos);
    }

    let exemplar = null;
    if (pos < line.length) {
      if (line[pos] !== '#') {
        return makeWarning(lineNumber, 'Unexpected trailing characters', line);
      }
      const exemplarResult = parseExemplar(line, pos);
      if (exemplarResult.error) {
        return makeWarning(lineNumber, exemplarResult.error, line);
      }
      exemplar = exemplarResult.exemplar;
      pos = exemplarResult.pos;
    }

    pos = skipWhitespace(line, pos);
    if (pos < line.length) {
      return makeWarning(lineNumber, 'Unexpected trailing characters', line);
    }

    return {
      type: 'metric',
      name: metricName,
      labels: labels,
      value: value,
      timestamp: timestamp,
      exemplar: exemplar,
      raw: line,
    };
  };

  const parsePrometheusLine = (line, lineNumber) => {
    const normalized = line.endsWith('\r') ? line.slice(0, -1) : line;
    if (!normalized.trim()) {
      return null;
    }
    if (normalized.trimStart().startsWith('#')) {
      return parseCommentLine(normalized, lineNumber);
    }
    return parseSampleLine(normalized, lineNumber);
  };

  const classifyPrometheusLine = (line) => {
    const parsed = parsePrometheusLine(line, 0);
    if (!parsed) {
      return null;
    }
    if (parsed.type === 'metric') {
      return { type: 'metric' };
    }
    if (parsed.type === 'comment') {
      return { type: 'comment', commentType: parsed.commentType };
    }
    return { type: 'invalid' };
  };

  const root = typeof globalThis !== 'undefined' ? globalThis : window;
  if (root.PrometheusFormatterParser) {
    return;
  }
  root.PrometheusFormatterParser = {
    parsePrometheusLine,
    classifyPrometheusLine,
  };
})();
