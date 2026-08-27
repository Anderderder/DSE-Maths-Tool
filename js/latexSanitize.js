/**
 * Convert full-document LaTeX that MathJax cannot render into MathJax-friendly text.
 * Gemini sometimes emits \begin{itemize}, bare \text{...}, or math without $...$.
 */

function convertListEnv(text, envName) {
  const re = new RegExp(
    String.raw`\\begin\{${envName}\}([\s\S]*?)\\end\{${envName}\}`,
    'gi',
  );
  return text.replace(re, (_full, inner) => {
    const lines = String(inner)
      .split(/\\item\b/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `• ${s}`);
    return `\n${lines.join('\n')}\n`;
  });
}

/** Unwrap \text{...} / \textrm{...} / \mathrm{...} that wrap an entire string. */
function unwrapWholeTextCommand(text) {
  const m = text.match(
    /^\\(?:text|textrm|textit|textbf|mathrm|mathsf|mathbf)\{([\s\S]*)\}$/,
  );
  if (!m) return text;
  // Only unwrap if braces are balanced as a single group
  const inner = m[1];
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '{') depth += 1;
    else if (inner[i] === '}') {
      depth -= 1;
      if (depth < 0) return text;
    }
  }
  return depth === 0 ? inner : text;
}

/** Replace inline \text{...} with plain text (keeps surrounding math readable). */
function flattenTextCommands(text) {
  return text.replace(
    /\\(?:text|textrm|textit|textbf)\{([^{}]*)\}/g,
    '$1',
  );
}

function hasMathDelimiters(text) {
  return /\$|\\\(|\\\[|\\begin\{/.test(text);
}

function looksLikeLatex(text) {
  return /\\[a-zA-Z]+|[_^]|\{|\}/.test(text);
}

/**
 * Options are often bare fragments like `\text{II and III only}` or `\dfrac{1}{2}`
 * without $...$, so MathJax never typesets them.
 */
export function sanitizeOptionLatex(input) {
  if (input == null) return '';
  let text = String(input).trim();

  text = unwrapWholeTextCommand(text);
  text = flattenTextCommands(text);
  text = text.replace(/\\,/g, ' ').replace(/~/g, ' ').replace(/\s+/g, ' ').trim();

  // Pure prose options (I / II / III wording) — no math wrapping needed
  if (!looksLikeLatex(text)) {
    return text;
  }

  if (!hasMathDelimiters(text)) {
    text = `$${text}$`;
  }
  return text;
}

export function sanitizeForMathJax(input) {
  if (input == null) return '';
  let text = String(input);

  text = convertListEnv(text, 'itemize');
  text = convertListEnv(text, 'enumerate');
  text = convertListEnv(text, 'description');

  text = text.replace(/\\item\b/g, '\n• ');

  text = text.replace(/\\begin\{center\}/gi, '');
  text = text.replace(/\\end\{center\}/gi, '');
  text = text.replace(/\\begin\{flushleft\}/gi, '');
  text = text.replace(/\\end\{flushleft\}/gi, '');

  // Flatten \text in prose/solution so it doesn't show as raw commands when outside $ $
  // Keep math in $...$ untouched for \text inside math — MathJax handles that.
  // Only flatten \text that sits outside math delimiters is harder; flatten all is OK for DSE prose.
  text = text.replace(
    /\$([^$]*)\$/g,
    (_m, inner) => `§MATH§${inner}§/MATH§`,
  );
  text = flattenTextCommands(text);
  text = text.replace(/§MATH§([\s\S]*?)§\/MATH§/g, (_m, inner) => `$${inner}$`);

  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export function sanitizeMcqItem(item) {
  if (!item || typeof item !== 'object') return item;
  const next = { ...item };
  if (typeof next.stem_latex === 'string') {
    next.stem_latex = sanitizeForMathJax(next.stem_latex);
  }
  if (typeof next.smart_solution_latex === 'string') {
    next.smart_solution_latex = sanitizeForMathJax(next.smart_solution_latex);
  }
  if (Array.isArray(next.options)) {
    next.options = next.options.map((o) =>
      o && typeof o.latex === 'string'
        ? { ...o, latex: sanitizeOptionLatex(o.latex) }
        : o,
    );
  }
  return next;
}
