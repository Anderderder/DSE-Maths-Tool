/**
 * DSE MC Generator — React UI (no JSX / Babel; ES module).
 */
import { t } from './i18n.js';
import { TOPIC_META, DIFFICULTY } from './topics/straightLine.js';
import { renderCartesianSvg } from './graph/cartesianSvg.js';
import { getClientMode, getGeminiApiKey } from './gemini.js';
import { getPoeApiKey } from './poe.js';
import { createLlmClient, getProviderStatus } from './llm.js';
import { generateStraightLineMcq, getAllSubtopics } from './generate.js';
import { QA_FIXTURES } from './qa/fixtures.js';
import { sanitizeMcqItem } from './latexSanitize.js';

const React = window.React;
const ReactDOM = window.ReactDOM;
if (!React || !ReactDOM) {
  document.getElementById('root').textContent =
    'Failed to load React. Check your network connection to unpkg.com and reload.';
  throw new Error('React / ReactDOM globals missing');
}

const h = React.createElement;
const { useState, useEffect, useRef } = React;
const { createRoot } = ReactDOM;

const ALL_SUBTOPICS = getAllSubtopics();

const MATHJAX_CDN = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';

function loadMathJax() {
  return new Promise((resolve, reject) => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      resolve(window.MathJax);
      return;
    }
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
      },
      svg: { fontCache: 'global' },
      startup: {
        ready() {
          window.MathJax.startup.defaultReady();
          resolve(window.MathJax);
        },
      },
    };
    const s = document.createElement('script');
    s.src = MATHJAX_CDN;
    s.async = true;
    s.onerror = () => reject(new Error('MathJax failed to load'));
    document.head.appendChild(s);
  });
}

function useTypeset(ref, deps, ready) {
  useEffect(() => {
    if (!ready || !ref.current || !window.MathJax?.typesetPromise) return;
    window.MathJax.typesetClear?.([ref.current]);
    window.MathJax.typesetPromise([ref.current]).catch(() => {});
  }, [deps, ready]);
}

function App() {
  const [lang, setLang] = useState('en');
  const [difficulty, setDifficulty] = useState('Moderate');
  const [subtopicId, setSubtopicId] = useState('fig_intercept_pos');
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    try {
      return getGeminiApiKey();
    } catch {
      return '';
    }
  });
  const [poeKey, setPoeKey] = useState(() => {
    try {
      return getPoeApiKey();
    } catch {
      return '';
    }
  });
  const [providerPref, setProviderPref] = useState(() => {
    try {
      return sessionStorage.getItem('dse_mc_provider') || 'auto';
    } catch {
      return 'auto';
    }
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [item, setItem] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mathReady, setMathReady] = useState(false);

  const contentRef = useRef(null);
  const clientMode = getClientMode();

  useEffect(() => {
    loadMathJax()
      .then(() => setMathReady(true))
      .catch((e) => setError(String(e.message || e)));
  }, []);

  useEffect(() => {
    window.__APP_GEMINI_KEY__ = apiKey.trim();
    try {
      if (apiKey.trim()) sessionStorage.setItem('gemini_api_key', apiKey.trim());
      else sessionStorage.removeItem('gemini_api_key');
    } catch {
      /* private browsing */
    }
  }, [apiKey]);

  useEffect(() => {
    window.__APP_POE_KEY__ = poeKey.trim();
    try {
      if (poeKey.trim()) sessionStorage.setItem('poe_api_key', poeKey.trim());
      else sessionStorage.removeItem('poe_api_key');
    } catch {
      /* private browsing */
    }
  }, [poeKey]);

  useEffect(() => {
    if (providerPref === 'auto') {
      delete window.DSE_MC_PROVIDER;
    } else {
      window.DSE_MC_PROVIDER = providerPref;
    }
    try {
      sessionStorage.setItem('dse_mc_provider', providerPref);
    } catch {
      /* private browsing */
    }
  }, [providerPref]);

  // Keep provider detection in sync with controlled inputs this render
  window.__APP_GEMINI_KEY__ = apiKey.trim();
  window.__APP_POE_KEY__ = poeKey.trim();
  if (providerPref === 'auto') delete window.DSE_MC_PROVIDER;
  else window.DSE_MC_PROVIDER = providerPref;

  const providerStatus = getProviderStatus();
  const activeProviderLabel =
    providerStatus.provider === 'gemini'
      ? t(lang, 'providerGemini')
      : providerStatus.provider === 'poe'
        ? t(lang, 'providerPoe')
        : t(lang, 'providerNone');

  const typesetKey = item
    ? `${item.stem_latex}|${JSON.stringify(item.options)}|${item.smart_solution_latex}|${reveal}`
    : '';
  useTypeset(contentRef, typesetKey, mathReady);

  async function handleGenerate() {
    setLoading(true);
    setError('');
    setReveal(false);
    setStatus(t(lang, 'statusStarting'));
    try {
      const client = createLlmClient();
      const { item: next } = await generateStraightLineMcq({
        language: lang,
        difficulty,
        subtopicId: subtopicId || null,
        client,
        onProgress: (msg) => setStatus(msg),
      });
      setItem(next);
      setStatus('');
    } catch (err) {
      setError(err && err.message ? err.message : String(err));
      setStatus('');
    } finally {
      setLoading(false);
    }
  }

  function loadFixture(index) {
    const f = QA_FIXTURES[index];
    if (!f) return;
    setError('');
    setReveal(false);
    setItem(sanitizeMcqItem({ ...f }));
  }

  function buildLatexBundle() {
    if (!item) return '';
    const opts = (item.options || []).map((o) => `${o.key}. ${o.latex}`).join('\n');
    return [
      item.stem_latex,
      '',
      opts,
      '',
      `Answer: ${item.correct_key}`,
      '',
      item.smart_solution_latex,
    ].join('\n');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildLatexBundle());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Clipboard copy failed');
    }
  }

  const showGraph =
    item &&
    item.needs_graph &&
    item.graph &&
    ((item.graph.lines && item.graph.lines.length) ||
      (item.graph.points && item.graph.points.length));

  const svgMarkup = showGraph ? renderCartesianSvg(item.graph) : '';

  return h(
    'div',
    { className: 'app-shell' },
    h(
      'header',
      { className: 'topbar' },
      h(
        'div',
        null,
        h('h1', { className: 'brand' }, t(lang, 'brand')),
        h('p', { className: 'brand-sub' }, t(lang, 'subtitle')),
      ),
      h(
        'div',
        { className: 'seg no-print', role: 'group', 'aria-label': t(lang, 'language') },
        h(
          'button',
          {
            type: 'button',
            className: lang === 'en' ? 'active' : '',
            onClick: () => setLang('en'),
          },
          'EN',
        ),
        h(
          'button',
          {
            type: 'button',
            className: lang === 'zh' ? 'active' : '',
            onClick: () => setLang('zh'),
          },
          '繁中',
        ),
      ),
    ),
    h(
      'div',
      { className: 'layout' },
      h(
        'aside',
        { className: 'panel no-print' },
        h('h2', null, t(lang, 'topic')),
        h(
          'div',
          { className: 'field' },
          h('label', null, lang === 'zh' ? TOPIC_META.labelZh : TOPIC_META.labelEn),
          h(
            'select',
            { disabled: true, value: TOPIC_META.id },
            h(
              'option',
              { value: TOPIC_META.id },
              lang === 'zh' ? TOPIC_META.labelZh : TOPIC_META.labelEn,
            ),
          ),
        ),
        h(
          'div',
          { className: 'field' },
          h('label', null, t(lang, 'subtopic')),
          h(
            'div',
            { className: 'chips' },
            h(
              'button',
              {
                type: 'button',
                className: `chip ${!subtopicId ? 'active' : ''}`,
                onClick: () => setSubtopicId(''),
              },
              t(lang, 'subtopicAny'),
            ),
            ...ALL_SUBTOPICS.map((s) =>
              h(
                'button',
                {
                  key: s.id,
                  type: 'button',
                  className: `chip ${subtopicId === s.id ? 'active' : ''}`,
                  onClick: () => setSubtopicId(s.id),
                },
                lang === 'zh' ? s.labelZh : s.labelEn,
              ),
            ),
          ),
        ),
        h(
          'div',
          { className: 'field' },
          h('label', null, t(lang, 'difficulty')),
          h(
            'select',
            {
              value: difficulty,
              onChange: (e) => setDifficulty(e.target.value),
            },
            ...Object.keys(DIFFICULTY).map((k) =>
              h(
                'option',
                { key: k, value: k },
                lang === 'zh' ? DIFFICULTY[k].labelZh : DIFFICULTY[k].labelEn,
              ),
            ),
          ),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'btn btn-primary',
            disabled: loading,
            onClick: handleGenerate,
          },
          loading && h('span', { className: 'spinner', 'aria-hidden': 'true' }),
          loading ? t(lang, 'regenerating') : item ? t(lang, 'newVariant') : t(lang, 'generate'),
        ),
        loading && h('p', { className: 'hint status-live' }, status || t(lang, 'statusStarting')),
        h(
          'div',
          { className: 'settings-block' },
          h(
            'button',
            {
              type: 'button',
              className: 'btn btn-ghost',
              style: { width: '100%' },
              onClick: () => setShowSettings((v) => !v),
            },
            t(lang, 'settings'),
          ),
          showSettings &&
            h(
              'div',
              { className: 'field', style: { marginTop: '0.75rem' } },
              clientMode === 'proxy'
                ? h('p', { className: 'hint' }, t(lang, 'proxyMode'))
                : h(
                    React.Fragment,
                    null,
                    h('label', { htmlFor: 'apiKey' }, t(lang, 'apiKey')),
                    h('input', {
                      id: 'apiKey',
                      type: 'password',
                      autoComplete: 'off',
                      value: apiKey,
                      onChange: (e) => setApiKey(e.target.value),
                      placeholder: 'AIza…',
                    }),
                    h(
                      'p',
                      { className: 'hint' },
                      apiKey.trim() ? t(lang, 'apiKeySaved') : t(lang, 'apiKeyHint'),
                    ),
                    h('label', { htmlFor: 'poeKey', style: { marginTop: '0.75rem' } }, t(lang, 'poeApiKey')),
                    h('input', {
                      id: 'poeKey',
                      type: 'password',
                      autoComplete: 'off',
                      value: poeKey,
                      onChange: (e) => setPoeKey(e.target.value),
                      placeholder: 'poe-…',
                    }),
                    h(
                      'p',
                      { className: 'hint' },
                      poeKey.trim() ? t(lang, 'poeApiKeySaved') : t(lang, 'poeApiKeyHint'),
                    ),
                    h('label', { htmlFor: 'providerPref', style: { marginTop: '0.75rem' } }, t(lang, 'providerActive')),
                    h(
                      'select',
                      {
                        id: 'providerPref',
                        value: providerPref,
                        onChange: (e) => setProviderPref(e.target.value),
                      },
                      h('option', { value: 'auto' }, t(lang, 'providerAuto')),
                      h('option', { value: 'gemini' }, t(lang, 'providerGemini')),
                      h('option', { value: 'poe' }, t(lang, 'providerPoe')),
                    ),
                    h('p', { className: 'hint' }, `${t(lang, 'providerActive')}: ${activeProviderLabel}`),
                    h('p', { className: 'hint' }, t(lang, 'demoHint')),
                    h(
                      'div',
                      { className: 'chips', style: { marginTop: '0.5rem' } },
                      ...QA_FIXTURES.map((f, i) =>
                        h(
                          'button',
                          {
                            key: f.id,
                            type: 'button',
                            className: 'chip',
                            onClick: () => loadFixture(i),
                            title: f.subtopic,
                          },
                          `QA ${f.id}`,
                        ),
                      ),
                    ),
                  ),
            ),
        ),
      ),
      h(
        'main',
        null,
        error &&
          h(
            'div',
            { className: 'error-box', role: 'alert' },
            h('strong', null, `${t(lang, 'errorPrefix')}: `),
            error,
          ),
        !item && !loading && h('div', { className: 'panel empty-state' }, t(lang, 'empty')),
        item &&
          h(
            'div',
            { className: 'mcq-card', ref: contentRef },
            showGraph &&
              h(
                'div',
                { className: 'figure-wrap' },
                h('div', { dangerouslySetInnerHTML: { __html: svgMarkup } }),
                h('p', { className: 'figure-note' }, t(lang, 'figureNote')),
              ),
            h('div', { className: 'stem math-block' }, item.stem_latex),
            h(
              'ul',
              { className: 'options' },
              ...(item.options || []).map((opt) =>
                h(
                  'li',
                  {
                    key: opt.key,
                    className: `option math-block ${
                      reveal && opt.key === item.correct_key ? 'correct-reveal' : ''
                    }`,
                  },
                  h('span', { className: 'option-key' }, `${opt.key}.`),
                  h('span', null, opt.latex),
                ),
              ),
            ),
            h(
              'div',
              { className: 'btn-row no-print' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-ghost',
                  onClick: () => setReveal((v) => !v),
                },
                reveal ? t(lang, 'hideAnswer') : t(lang, 'showAnswer'),
              ),
              h(
                'button',
                { type: 'button', className: 'btn btn-ghost', onClick: handleCopy },
                copied ? t(lang, 'copied') : t(lang, 'copyLatex'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-ghost',
                  onClick: () => window.print(),
                },
                t(lang, 'print'),
              ),
            ),
            reveal &&
              h(
                'div',
                { className: 'reveal' },
                h('h3', null, t(lang, 'correctAnswer')),
                h('div', { className: 'answer-badge' }, item.correct_key),
                h('h3', null, t(lang, 'smartSolution')),
                h('div', { className: 'solution math-block' }, item.smart_solution_latex),
                Array.isArray(item.common_traps) &&
                  item.common_traps.length > 0 &&
                  h(
                    React.Fragment,
                    null,
                    h('h3', { style: { marginTop: '1rem' } }, t(lang, 'traps')),
                    h(
                      'div',
                      { className: 'traps' },
                      ...item.common_traps.map((trap, i) =>
                        h('div', { key: i }, `• ${trap}`),
                      ),
                    ),
                  ),
              ),
          ),
      ),
    ),
  );
}

const rootEl = document.getElementById('root');
createRoot(rootEl).render(h(App));
