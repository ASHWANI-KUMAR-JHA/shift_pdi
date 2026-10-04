// Lightweight inline formatting for the Letter Generator.
//
// The body/subject stay plain strings in storage, so existing templates keep
// working. Formatting is expressed with simple, reversible markup tokens:
//
//   **bold**            -> bold
//   //italic//          -> italic
//   __underline__       -> underline
//   {color:#ff0000|txt} -> coloured text
//
// Tokens can be nested, e.g. **//__hi__//** or {color:#f00|**hi**}.

// Wrap the characters [start, end) of `text` with the given markers.
// Returns the new string and the new selection covering the wrapped text.
export function wrapSelection(text, start, end, prefix, suffix) {
  const before = text.slice(0, start);
  const sel = text.slice(start, end);
  const after = text.slice(end);
  const next = `${before}${prefix}${sel}${suffix}${after}`;
  return {
    text: next,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + sel.length,
  };
}

// Marker definitions used by the toolbar helpers.
export const MARKERS = {
  bold: { prefix: '**', suffix: '**' },
  italic: { prefix: '//', suffix: '//' },
  underline: { prefix: '__', suffix: '__' },
};

export function colorMarkers(hex) {
  return { prefix: `{color:${hex}|`, suffix: '}' };
}

// Parse a string into an array of styled segments:
//   { text, bold, italic, underline, color }
// Order of nesting does not matter; styles accumulate.
export function parseRichText(input) {
  const segments = [];
  if (input == null) return segments;
  const text = String(input);

  // Walk the string, maintaining a style stack. We detect the longest marker
  // first so '**' isn't mistaken for two separate tokens.
  const style = { bold: false, italic: false, underline: false, color: null };
  let buf = '';
  let i = 0;

  const push = () => {
    if (buf) {
      segments.push({ text: buf, ...style });
      buf = '';
    }
  };

  while (i < text.length) {
    const two = text.slice(i, i + 2);

    // Colour open: {color:#rrggbb| or {color:name|
    if (text[i] === '{' && text.slice(i, i + 7) === '{color:') {
      const close = text.indexOf('|', i);
      if (close !== -1) {
        const hex = text.slice(i + 7, close).trim();
        push();
        const prevColor = style.color;
        style.color = hex || prevColor;
        // Recurse into the coloured content until its matching '}'.
        const { inner, nextIndex } = readUntilBrace(text, close + 1);
        const innerSegs = parseRichText(inner);
        for (const s of innerSegs) {
          segments.push({
            text: s.text,
            bold: s.bold || style.bold,
            italic: s.italic || style.italic,
            underline: s.underline || style.underline,
            color: s.color || style.color,
          });
        }
        style.color = prevColor;
        i = nextIndex;
        continue;
      }
    }

    if (two === '**') { push(); style.bold = !style.bold; i += 2; continue; }
    if (two === '//') { push(); style.italic = !style.italic; i += 2; continue; }
    if (two === '__') { push(); style.underline = !style.underline; i += 2; continue; }

    buf += text[i];
    i += 1;
  }
  push();
  return segments;
}

// Read characters starting at `from` until the matching closing brace,
// accounting for nested {color:...} blocks. Returns the inner text and the
// index just past the closing brace.
function readUntilBrace(text, from) {
  let depth = 1;
  let i = from;
  let inner = '';
  while (i < text.length) {
    if (text.slice(i, i + 7) === '{color:') { depth += 1; inner += text[i]; i += 1; continue; }
    if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return { inner, nextIndex: i + 1 };
      inner += text[i];
      i += 1;
      continue;
    }
    inner += text[i];
    i += 1;
  }
  return { inner, nextIndex: i };
}

// Strip all markup, returning plain text (used as a safe fallback).
export function stripMarkup(input) {
  return parseRichText(input).map((s) => s.text).join('');
}
