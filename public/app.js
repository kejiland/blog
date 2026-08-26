/* ============================================================================
 * Qingyu'Blog · 前端逻辑（app.js）
 * ----------------------------------------------------------------------------
 * 包含：列表 / 详情 / 写作 / 搜索 / 标签 / 归档 / 评论 / TOC / 代码高亮 / 统计
 * 版本 v2.1.0 ｜ 侧边导航已集成 ｜ 2026-08-22
 * ============================================================================ */
'use strict';

var BLOG_VERSION = '2.4.2';

/* ---------- 全局缓存 ---------- */
var _searchOpen = false;   // 顶部导航搜索是否展开
var _searchDocBound = false;   // document 级外部点击监听是否已绑定
var _commentsCache = {};
var _statsCache = {};
var _routeTimer = null;

/* ---------- 基础工具 ---------- */
/* ---------- main theme (dark / light) ---------- */
function themeKey() { return 'qingyu.theme'; }
function getTheme() {
  try { var v = localStorage.getItem(themeKey()); if (v === 'light' || v === 'dark') return v; } catch (e) {}
  try { if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'; } catch (e) {}
  return 'light';
}
function applyTheme(t) {
  if (t !== 'dark') t = 'light';
  try { document.documentElement.setAttribute('data-theme', t); } catch (e) {}
}
function setTheme(t) { applyTheme(t); try { localStorage.setItem(themeKey(), t); } catch (e) {} }
function toggleTheme() { var n = getTheme() === 'dark' ? 'light' : 'dark'; setTheme(n); refreshThemeIcon(); return n; }
/* 统一 SVG 图标：currentColor 描边，自动继承文字色、hover 变主题色 */
function svgIcon(name, size) {
  size = size || 18;
  var s = 'width="' + size + '" height="' + size + '"';
  var c = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  var I = {
    sun: '<svg ' + s + ' ' + c + '><circle cx="12" cy="12" r="4"/><path d="M12 2.4v2.4M12 19.2v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.4 12h2.4M19.2 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"/></svg>',
    moon: '<svg ' + s + ' ' + c + '><path d="M20.5 13.2A8.5 8.5 0 1 1 11 3.5a6.6 6.6 0 0 0 9.5 9.7z"/></svg>',
    pin: '<svg ' + s + ' ' + c + '><path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>',
    lock: '<svg ' + s + ' ' + c + '><rect x="5" y="11" width="14" height="9" rx="1.6"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    eye: '<svg ' + s + ' ' + c + '><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/></svg>',
    heart: '<svg ' + s + ' ' + c + '><path d="M12 20s-7-4.6-7-9.3A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.7C19 15.4 12 20 12 20z"/></svg>',
    cloud: '<svg ' + s + ' ' + c + '><path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.3A3.5 3.5 0 0 1 17.5 18z"/><path d="M12 13v5M9.5 15.5 12 13l2.5 2.5"/></svg>',
    save: '<svg ' + s + ' ' + c + '><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/></svg>',
    external: '<svg ' + s + ' ' + c + '><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    download: '<svg ' + s + ' ' + c + '><path d="M12 4v10M8 11l4 4 4-4M5 19h14"/></svg>',
    upload: '<svg ' + s + ' ' + c + '><path d="M12 20V10M8 13l4-4 4 4M5 5h14"/></svg>',
    file: '<svg ' + s + ' ' + c + '><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
    rss: '<svg ' + s + ' ' + c + '><circle cx="5" cy="18" r="1"/><path d="M4 11a9 9 0 0 1 9 9M4 5a15 15 0 0 1 15 15"/></svg>',
    sitemap: '<svg ' + s + ' ' + c + '><rect x="3" y="4" width="7" height="5" rx="1"/><rect x="14" y="4" width="7" height="5" rx="1"/><rect x="9" y="15" width="7" height="5" rx="1"/><path d="M6.5 9v3h11V9M12.5 12v3"/></svg>',
    spinner: '<svg class="spin-icon" ' + s + ' ' + c + '><path d="M12 3a9 9 0 1 0 9 9" /></svg>',
    question: '<svg ' + s + ' ' + c + '><circle cx="12" cy="12" r="9"/><path d="M9.2 9.6a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2-2.6 3.6M12 17h.01"/></svg>',
    doc: '<svg ' + s + ' ' + c + '><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h5M9.5 15h5"/></svg>',
    top: '<svg ' + s + ' ' + c + '><path d="M12 20V6"/><path d="M6 11.5 12 5.5l6 6"/></svg>',
    pen: '<svg ' + s + ' ' + c + '><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    logout: '<svg ' + s + ' ' + c + '><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
    trash: '<svg ' + s + ' ' + c + '><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6"/></svg>',
    link: '<svg ' + s + ' ' + c + '><path d="M10 14a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 10a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>',
    image: '<svg ' + s + ' ' + c + '><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5 18l4.5-4.5 3 3L16 13l4 4"/></svg>',
    quote: '<svg ' + s + ' ' + c + '><path d="M10 7H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2v-4H6"/><path d="M20 7h-4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2v-4h-2"/></svg>',
    tag: '<svg ' + s + ' ' + c + '><path d="M3 3h7l11 11-7 7L3 10V3z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
    list: '<svg ' + s + ' ' + c + '><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    check: '<svg ' + s + ' ' + c + '><path d="M4 12.5l5 5L20 6.5"/></svg>'
  };
  return I[name] || '';
}
function themeIcon() { return getTheme() === 'dark' ? svgIcon('sun', 18) : svgIcon('moon', 18); }
function refreshThemeIcon() {
  document.querySelectorAll('#themeToggle, #themeToggleSide').forEach(function (b) {
    b.innerHTML = themeIcon();
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function stripMd(md) {
  var s = String(md || '');
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]*)`/g, '$1');
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  s = s.replace(/^#{1,6}\s*/gm, '');
  s = s.replace(/^\s*[-*+]\s+/gm, '');
  s = s.replace(/^\s*\d+\.\s+/gm, '');
  s = s.replace(/^>\s*/gm, '');
  s = s.replace(/[*_~`]/g, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function htmlToText(html) {
  return String(html || '').replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function sortPosts(a, b) {
  if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
  if (a.date === b.date) return (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
  return (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
}

function normalizeTags(p) {
  if (Array.isArray(p && p.tags)) return p.tags.map(function (t) { return String(t).trim(); }).filter(Boolean);
  return String((p && p.tags) || '').split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean);
}

function parseMdFile(text, filename) {
  var src = String(text || '');
  var meta = {};
  var body = src;
  if (/^---\r?\n/.test(src)) {
    var end = src.indexOf('\n---', 3);
    if (end > 0) {
      var block = src.slice(3, end);
      body = src.slice(end + 4).replace(/^\r?\n/, '');
      block.split(/\r?\n/).forEach(function (line) {
        var m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
        if (m) meta[m[1].toLowerCase()] = m[2].trim();
      });
    }
  }
  var base = String(filename || '').replace(/\.md$/i, '').replace(/^.*[\\\/]/, '');
  var id = slugify(meta.id || base || 'post-' + Date.now());
  return {
    id: id,
    title: meta.title || base || t('post.defaultTitle'),
    date: meta.date || new Date().toISOString().slice(0, 10),
    tags: meta.tags || '',
    excerpt: meta.excerpt || '',
    password: meta.password || '',
    content: body.trim()
  };
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'post';
}

/* ---------- Markdown 渲染器 ---------- */
function normalizeCodeLanguage(lang) {
  var s = String(lang || '').trim().toLowerCase();
  var aliases = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    html: 'xml',
    htm: 'xml',
    vue: 'xml',
    'c++': 'cpp',
    cc: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    'c#': 'csharp',
    yml: 'yaml',
    rb: 'ruby',
    rs: 'rust',
    kt: 'kotlin'
  };
  return aliases[s] || s;
}

function tokenizeCode(lang, code) {
  var language = normalizeCodeLanguage(lang);
  var raw = String(code == null ? '' : code);

  var keywords = {
    javascript: 'break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null return static super switch this throw true try typeof var void while with yield async await of from',
    typescript: 'break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null return static super switch this throw true try typeof var void while with yield async await interface type enum namespace implements public private protected readonly abstract keyof infer unknown never any string number boolean declare module as satisfies',
    python: 'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield match case',
    java: 'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null record sealed permits var yield',
    c: 'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while',
    cpp: 'alignas alignof and and_eq asm auto bitand bitor bool break case catch char char8_t char16_t char32_t class compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq',
    csharp: 'abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while async await record var dynamic get set init',
    go: 'break default func interface select case defer go map struct chan else goto package switch const fallthrough if range type continue for import return var true false nil',
    rust: 'as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while async await dyn',
    bash: 'if then else elif fi for while until do done case esac function select in time coproc echo printf export cd exit return local readonly source alias unalias set unset shift getopts',
    sql: 'select from where insert into update delete create alter drop table database index view join inner left right full outer cross on group by order having limit offset union all distinct as and or not null is in exists between like case when then else end values set primary foreign key references constraint begin commit rollback grant revoke with recursive asc desc true false',
    json: 'true false null',
    css: 'display position color background margin padding border width height min-width max-width min-height max-height font opacity flex grid gap top right bottom left transform transition animation overflow z-index align-items justify-content box-shadow border-radius',
    kotlin: 'as break class continue do else false for fun if in interface is null object package return super this throw true try typealias typeof val var when while by catch constructor data enum final import inline internal open operator override private protected public sealed suspend',
    ruby: 'BEGIN END alias and begin break case class def defined do else elsif end ensure false for if in module next nil not or redo rescue retry return self super then true undef unless until when while yield',
    yaml: 'true false null yes no on off'
  };

  var lineComments = {
    javascript: ['//'], typescript: ['//'], java: ['//'],
    c: ['//'], cpp: ['//'], csharp: ['//'], go: ['//'], rust: ['//'],
    python: ['#'], bash: ['#'], ruby: ['#'], yaml: ['#'], sql: ['--']
  };

  var blockComments = {
    javascript: [['/*', '*/']], typescript: [['/*', '*/']],
    java: [['/*', '*/']], c: [['/*', '*/']], cpp: [['/*', '*/']],
    csharp: [['/*', '*/']], go: [['/*', '*/']], rust: [['/*', '*/']],
    css: [['/*', '*/']], sql: [['/*', '*/']]
  };

  var set = Object.create(null);
  String(keywords[language] || '').split(/\s+/).forEach(function (w) {
    if (w) set[w] = true;
  });

  function span(cls, s) {
    return '<span class="' + cls + '">' + esc(s) + '</span>';
  }

  function startsAt(pos, token) {
    return raw.slice(pos, pos + token.length) === token;
  }

  if (language === 'xml') {
    var htmlOut = '';
    var hi = 0;
    while (hi < raw.length) {
      if (startsAt(hi, '<!--')) {
        var hc = raw.indexOf('-->', hi + 4);
        if (hc < 0) hc = raw.length - 3;
        var hEnd = Math.min(raw.length, hc + 3);
        htmlOut += span('tok-com', raw.slice(hi, hEnd));
        hi = hEnd;
        continue;
      }
      if (raw[hi] === '<') {
        var gt = raw.indexOf('>', hi + 1);
        if (gt < 0) gt = raw.length - 1;
        htmlOut += span('tok-kw', raw.slice(hi, gt + 1));
        hi = gt + 1;
        continue;
      }
      htmlOut += esc(raw[hi]);
      hi++;
    }
    return htmlOut;
  }

  var out = '';
  var i = 0;

  while (i < raw.length) {
    var matched = false;

    var blocks = blockComments[language] || [];
    for (var bi = 0; bi < blocks.length; bi++) {
      var open = blocks[bi][0];
      var close = blocks[bi][1];
      if (startsAt(i, open)) {
        var bend = raw.indexOf(close, i + open.length);
        if (bend < 0) bend = raw.length - close.length;
        bend = Math.min(raw.length, bend + close.length);
        out += span('tok-com', raw.slice(i, bend));
        i = bend;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    var lines = lineComments[language] || [];
    for (var li = 0; li < lines.length; li++) {
      var lc = lines[li];
      if (startsAt(i, lc)) {
        var lend = raw.indexOf('\n', i + lc.length);
        if (lend < 0) lend = raw.length;
        out += span('tok-com', raw.slice(i, lend));
        i = lend;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    var ch = raw[i];
    var allowBacktick = language === 'javascript' || language === 'typescript';

    if (ch === '"' || ch === "'" || (allowBacktick && ch === '`')) {
      var quote = ch;
      var si = i + 1;
      var escaped = false;
      while (si < raw.length) {
        var sc = raw[si];
        if (escaped) {
          escaped = false;
          si++;
          continue;
        }
        if (sc === '\\') {
          escaped = true;
          si++;
          continue;
        }
        si++;
        if (sc === quote) break;
      }
      out += span('tok-str', raw.slice(i, si));
      i = si;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      var nm = raw.slice(i).match(
        /^(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)[fFdDlL]?/
      );
      if (nm) {
        out += span('tok-num', nm[0]);
        i += nm[0].length;
        continue;
      }
    }

    if (/[A-Za-z_$]/.test(ch)) {
      var wm = raw.slice(i).match(/^[A-Za-z_$][A-Za-z0-9_$-]*/);
      if (wm) {
        var word = wm[0];
        out += set[word] ? span('tok-kw', word) : esc(word);
        i += word.length;
        continue;
      }
    }

    out += esc(ch);
    i++;
  }

  return out;
}

function renderMarkdown(md) {
  var src = String(md || '');
  var tocCount = 0;
  var lines = src.split(/\r?\n/);
  var html = '';
  var i = 0;

  // 逐块解析
  while (i < lines.length) {
    var line = lines[i];

    // 代码块
    if (/^\s*```/.test(line)) {
      var lang = line.replace(/^\s*```/, '').trim();
      var codeLines = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // 跳过 ```
      html += '<pre class="code-block"><code class="lang-' + esc(lang) + '">' + tokenizeCode(lang, codeLines.join('\n')) + '</code></pre>\n';
      continue;
    }

    // 标题
    var hm = line.match(/^(#{1,6})\s+(.*)$/);
    if (hm) {
      var lvl = hm[1].length;
      var txt = hm[2].trim();
      tocCount++;
      html += '<h' + lvl + ' id="toc-' + tocCount + '">' + inlineMd(txt) + '</h' + lvl + '>\n';
      i++;
      continue;
    }

    // 空行
    if (/^\s*$/.test(line)) { i++; continue; }

    // 表格
    if (i + 1 < lines.length && /\|/.test(line) && /^\s*\|?[\s:-]+\|[\s|:-]+\|?\s*$/.test(lines[i+1])) {
      var headerRow = line;
      var sepRow = lines[i+1];
      var headerCells = headerRow.replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
      i += 2;
      var rows = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== '') {
        var cells = lines[i].replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
        rows.push(cells);
        i++;
      }
      html += '<table><thead><tr>' + headerCells.map(function (c) { return '<th>' + inlineMd(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      rows.forEach(function (r) {
        html += '<tr>' + r.map(function (c) { return '<td>' + inlineMd(c) + '</td>'; }).join('') + '</tr>';
      });
      html += '</tbody></table>\n';
      continue;
    }

    // 引用
    if (/^>\s?/.test(line)) {
      var quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html += '<blockquote><p>' + inlineMd(quoteLines.join(' ')) + '</p></blockquote>\n';
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      html += '<ul>\n';
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        html += '<li>' + inlineMd(lines[i].replace(/^\s*[-*+]\s+/, '')) + '</li>\n';
        i++;
      }
      html += '</ul>\n';
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      html += '<ol>\n';
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        html += '<li>' + inlineMd(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>\n';
        i++;
      }
      html += '</ol>\n';
      continue;
    }

    // 分割线
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      html += '<hr>\n';
      i++;
      continue;
    }

    // 普通段落（聚合到空行）
    var para = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^```/.test(lines[i]) && !/^#{1,6}\s+/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i]) && !/^>\s?/.test(lines[i]) && !/^\s*(---+|\*\*\*+|___+)\s*$/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    html += '<p>' + inlineMd(para.join(' ')) + '</p>\n';
  }

  return html;
}

function inlineMd(s) {
  var t = esc(String(s || ""));
  t = t.replace(/\\\\([*_`~\\[\\]])/g, '\u0001$1');
  // 行内代码
  t = t.replace(/`([^`]*)`/g, '<code class="inline-code">$1</code>');
  // 斜体
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  // 加粗
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // 删除线
  t = t.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  // 图片（过滤 javascript:/data: 等危险协议）
  t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function (m, alt, src) {
    if (/^\s*(javascript|data|vbscript):/i.test(String(src).trim())) return m;
    return '<img src="' + src + '" alt="' + alt + '">';
  });
  // 链接（过滤 javascript:/data: 等危险协议）
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (m, txt, url) {
    if (/^\s*(javascript|data|vbscript):/i.test(String(url).trim())) return m;
    return '<a href="' + url + '">' + txt + '</a>';
  });
  // 恢复遮罩
  t = t.replace(/\u0001([*_`~\[\]])/g, '$1');
  return t;
}

function buildToc(html) {
  var sections = [];
  var re = /<h([1-6]) id="(toc-(\d+))">([\s\S]*?)<\/h[1-6]>/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    sections.push({ lvl: Number(m[1]), id: m[2], order: Number(m[3]), text: htmlToText(m[4]) });
  }
  if (sections.length < 2) return { html: '', headings: sections };
  // 多级有序编号：1 / 1.1 / 1.2 / 2 / 2.1 …
  var counts = [0, 0, 0, 0, 0, 0, 0]; // 索引 1..6 对应层
  sections.forEach(function (s) {
    counts[s.lvl]++;
    for (var k = s.lvl + 1; k <= 6; k++) counts[k] = 0;
    var parts = [];
    for (var j = 1; j <= s.lvl; j++) if (counts[j]) parts.push(counts[j]);
    s.num = parts.join('.');
  });
  var hs = sections.map(function (s) {
    return '<a href="#' + s.id + '" data-toc="' + s.id + '" style="padding-left:' + ((s.lvl - 1) * 14) + 'px"><span class="toc-num">' + esc(s.num) + '</span>' + esc(s.text) + '</a>';
  }).join('');
  return {
    headings: sections,
    html: '<details class="toc"><summary>' + svgIcon('list', 14) + ' ' + t('toc.title') + '</summary><div class="toc-list">' + hs + '</div></details>'
  };
}

/** 给正文标题前插入编号（与目录一致），便于「标题为有序」 */
function stampHeadingNumbers(headings) {
  if (!headings || !document) return;
  headings.forEach(function (s) {
    try {
      var el = (typeof document.getElementById === 'function') ? document.getElementById(s.id) : document.querySelector('#' + s.id);
      if (!el || typeof el.insertBefore !== 'function' || typeof el.firstChild === 'undefined') return;
      var span = document.createElement('span');
      if (!span) return;
      span.className = 'toc-num';
      span.textContent = s.num;
      el.insertBefore(span, el.firstChild);
    } catch (e) { /* 编号标注失败不应影响正文渲染 */ }
  });
}

/* ---------- 配置与数据 ---------- */
function getConfig() {
  var cfg = (typeof window !== 'undefined' && window.BLOG_CONFIG) || {};
  return {
    mode: cfg.mode || 'auto',
    apiBase: cfg.apiBase || '',
    siteUrl: cfg.siteUrl || (typeof location !== 'undefined' ? location.origin : ''),
    writeToken: cfg.writeToken || '',
    adminPwd: cfg.adminPwd || '',
    pageSize: (typeof cfg.pageSize === 'number' && cfg.pageSize >= 0) ? cfg.pageSize : 8,
    nav: Array.isArray(cfg.nav) ? cfg.nav : [],
    footer: cfg.footer || {},
    ads: cfg.ads || {}
  };
}

function getStaticPosts() {
  return (typeof window !== 'undefined' && Array.isArray(window.BLOG_POSTS)) ? window.BLOG_POSTS : [];
}

function slug(s) { return String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64); }

function apiBase() {
  var cfg = getConfig();
  if (cfg.apiBase) return cfg.apiBase.replace(/\/+$/, '');
  return '';
}

async function apiFetch(url, opts) {
  var cfg = getConfig();
  var base = apiBase();
  // 统一拼绝对地址：避免在子路径页面（如 /posts/<别名>/）下，
  // 相对路径 api/... 被浏览器解析成 /posts/<别名>/api/... 而打错。
  var path = String(url).replace(/^\/+/, '');
  var originOk = typeof location !== 'undefined' && /^https?:$/.test(String(location.protocol || ''));
  var full = /^https?:/i.test(path)
    ? path
    : (base ? base.replace(/\/+$/, '') + '/' : (originOk ? location.origin + '/' : '')) + path;
  var headers = (opts && opts.headers) || {};
  // 云端会话 token（登录后由 /api/admin/login 签发并存入 localStorage）
  var session = _sessionToken();
  if (session) headers['Authorization'] = 'Bearer ' + session;
  else if (cfg.writeToken) headers['Authorization'] = 'Bearer ' + cfg.writeToken;
  // 仅写请求（或显式带 body）才设置 Content-Type：GET 设置它会在跨域时多一次 OPTIONS 预检
  var method = String((opts && opts.method) || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' || (opts && opts.body)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  // 超时兜底：网络慢/挂起时（如 Workers 冷启动、弱网）8s 后 abort，
  // 避免页面无限等待（boot 探测失败会回退静态模式）
  var ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = ac ? setTimeout(function () { ac.abort(); }, 8000) : null;
  var merged = Object.assign({}, opts, { headers: headers });
  if (ac) merged.signal = ac.signal;
  var res;
  try {
    res = await fetch(full, merged);
  } catch (e) {
    if (timer) clearTimeout(timer);
    throw e;
  }
  if (timer) clearTimeout(timer);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

function sortPagePosts(posts) {
  return (posts || []).slice().sort(sortPosts);
}

/* ---------- 搜索 ---------- */
function globalSearch(query, limit) {
  var q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  var posts = sortPagePosts(getStaticPosts());
  var hits = [];
  posts.forEach(function (p) {
    var hay = (p.search ? p.search + ' ' : '') + (p.title || '') + ' ' + (p.excerpt || '') + ' ' + (p.content || '') + ' ' + (p.tags || []).join(' ');
    if (hay.toLowerCase().indexOf(q) >= 0) hits.push(p);
  });
  return hits.slice(0, limit || 8);
}

function searchSnippet(post, query) {
  var q = String(query || '').trim();
  if (!q) return '';
  var body = stripMd(post.content || '');
  var idx = body.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) idx = (post.excerpt || '').toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) idx = (post.title || '').toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return '';
  var start = Math.max(0, idx - 30);
  var end = Math.min(body.length, idx + q.length + 40);
  return (start > 0 ? '…' : '') + body.slice(start, end) + (end < body.length ? '…' : '');
}



/* ---------- 评论 ----------
 * 云端模式：走 D1 后端（/api/posts/:id/comments，跨用户共享）；
 * 静态模式：本地 localStorage。
 */
function commentKey(id) { return 'qingyu.comments.' + id; }
function commentApi(id) { return 'api/posts/' + encodeURIComponent(String(id || '')) + '/comments'; }

async function loadComments(postId) {
  var id = String(postId || '');
  if (_cloudOn()) {
    // 云端评论实时共享，不命中本地缓存
    try {
      var data = await apiFetch(commentApi(id));
      var arr = (data && Array.isArray(data.comments)) ? data.comments : [];
      _commentsCache[id] = arr;
      return arr;
    } catch (e) { return []; }
  }
  if (_commentsCache[id]) return _commentsCache[id];
  var raw = '';
  try { raw = localStorage.getItem(commentKey(id)) || ''; } catch (e) {}
  var arr = [];
  try { arr = raw ? JSON.parse(raw) : []; } catch (e) { arr = []; }
  _commentsCache[id] = arr;
  return arr;
}

async function saveComment(postId, author, content, parentId) {
  var id = String(postId || '');
  author = String(author || '').trim().slice(0, 30);
  content = String(content || '').trim().slice(0, 1000);
  parentId = parentId || null;
  if (!author || !content) return null;
  if (_cloudOn()) {
    try {
      var data = await apiFetch(commentApi(id), {
        method: 'POST',
        body: JSON.stringify({ author: author, content: content, parent_id: parentId })
      });
      var c = (data && data.comment) || null;
      if (c) { try { delete _commentsCache[id]; } catch (e) {} }
      return c;
    } catch (e) { return null; }
  }
  var list = await loadComments(id);
  var comment = {
    id: 'c-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    author: author,
    content: content,
    date: new Date().toISOString().slice(0, 10),
    parent_id: parentId
  };
  if (list.length >= 300) list.shift();
  list.push(comment);
  _commentsCache[id] = list;
  try { localStorage.setItem(commentKey(id), JSON.stringify(list)); } catch (e) {}
  return comment;
}

async function deleteComment(postId, cid) {
  var id = String(postId || '');
  if (_cloudOn()) {
    // 云端删除需管理员会话（apiFetch 自动携带 Bearer token）
    try {
      await apiFetch(commentApi(id) + '/' + encodeURIComponent(String(cid || '')), { method: 'DELETE', body: '{}' });
      try { delete _commentsCache[id]; } catch (e) {}
      return await loadComments(id);
    } catch (e) { return _commentsCache[id] || []; }
  }
  var list = await loadComments(id);
  var next = list.filter(function (c) { return c.id !== cid; });
  _commentsCache[id] = next;
  try { localStorage.setItem(commentKey(id), JSON.stringify(next)); } catch (e) {}
  return next;
}

/* ---------- 统计 ----------
 * 云端模式：走 D1 后端（/api/posts/:id/stats，跨用户共享）；
 * 静态模式：本地 localStorage。
 */
function statKey(id) { return 'qingyu.stats.' + id; }
function statApi(id) { return 'api/posts/' + encodeURIComponent(String(id || '')) + '/stats'; }

async function loadStats(postId) {
  var id = String(postId || '');
  if (_cloudOn()) {
    try {
      var data = await apiFetch(statApi(id));
      var s = (data && data.stats) || { views: 0, likes: 0 };
      _statsCache[id] = s;
      return s;
    } catch (e) { return { views: 0, likes: 0 }; }
  }
  if (_statsCache[id]) return _statsCache[id];
  var s = { views: 0, likes: 0 };
  try {
    var raw = localStorage.getItem(statKey(id));
    if (raw) { var parsed = JSON.parse(raw); s = { views: Number(parsed.views) || 0, likes: Number(parsed.likes) || 0 }; }
  } catch (e) {}
  _statsCache[id] = s;
  return s;
}

async function incView(postId) {
  // 同会话去重：避免刷新 / 后退 / SWR 重渲染把同一篇阅读数反复 +1
  try {
    if (sessionStorage.getItem('qingyu.viewed.' + postId) === '1') {
      return _statsCache[postId] || await loadStats(postId);
    }
    sessionStorage.setItem('qingyu.viewed.' + postId, '1');
  } catch (e) {}
  if (_cloudOn()) {
    try {
      var data = await apiFetch(statApi(postId), { method: 'POST', body: JSON.stringify({ action: 'views' }) });
      var s = (data && data.stats) || { views: 0, likes: 0 };
      _statsCache[postId] = s;
      return s;
    } catch (e) { return _statsCache[postId] || { views: 0, likes: 0 }; }
  }
  var s = await loadStats(postId);
  s.views = Math.min(s.views + 1, 9999999);
  _statsCache[postId] = s;
  try { localStorage.setItem(statKey(postId), JSON.stringify(s)); } catch (e) {}
  return s;
}

/** 是否已点过赞（本地记录，防刷） */
function likedKey(id) { return 'qingyu.liked.' + String(id || ''); }
function wasLiked(postId) {
  try { return localStorage.getItem(likedKey(postId)) === '1'; } catch (e) { return false; }
}
function markLiked(postId) {
  try { localStorage.setItem(likedKey(postId), '1'); } catch (e) {}
}

async function likePost(postId) {
  if (wasLiked(postId)) return null;   // 已赞，防重复
  if (_cloudOn()) {
    try {
      var data = await apiFetch(statApi(postId), { method: 'POST', body: JSON.stringify({ action: 'like' }) });
      markLiked(postId);
      var s = (data && data.stats) || { views: 0, likes: 0 };
      _statsCache[postId] = s;
      return s;
    } catch (e) { return null; }
  }
  var s = await loadStats(postId);
  s.likes = Math.min(s.likes + 1, 9999999);
  markLiked(postId);
  _statsCache[postId] = s;
  try { localStorage.setItem(statKey(postId), JSON.stringify(s)); } catch (e) {}
  return s;
}

/* ---------- 精选文章 ----------
 * 按 点赞×3 + 浏览×1 + 评论×5 综合得分排序，取前 2 篇。
 * 云端模式：从 API 批量拉取；静态模式：从本地数据计算。
 */
var _featuredCache = null;
async function getFeaturedPosts(excludeId, count) {
  if (_featuredCache) return _featuredCache.filter(function (p) { return p.id !== excludeId; }).slice(0, count || 2);
  var posts = (typeof getStaticPosts === 'function') ? getStaticPosts() : [];
  if (_cloudOn()) {
    try {
      var d = await apiFetch('api/posts');
      if (d && d.posts && d.posts.length) posts = d.posts;
    } catch (e) {}
  }
  // 过滤：排除当前文章
  posts = posts.filter(function (p) { return p.id !== excludeId && (p.status || 'published') !== 'draft'; });
  // 并行拉取每篇文章的统计和评论数
  var scored = await Promise.all(posts.map(async function (p) {
    var views = 0, likes = 0, comments = 0;
    try {
      if (_cloudOn()) {
        var sd = await apiFetch('api/posts/' + encodeURIComponent(p.id) + '/stats');
        if (sd && sd.stats) { views = sd.stats.views || 0; likes = sd.stats.likes || 0; }
      } else {
        var raw = localStorage.getItem('qingyu.stats.' + p.id);
        if (raw) { var ps = JSON.parse(raw); views = ps.views || 0; likes = ps.likes || 0; }
      }
    } catch (e) {}
    try {
      if (_cloudOn()) {
        var cd = await apiFetch('api/posts/' + encodeURIComponent(p.id) + '/comments');
        if (cd && cd.comments) comments = cd.comments.length;
      } else {
        var cl = localStorage.getItem('qingyu.comments.' + p.id);
        if (cl) comments = JSON.parse(cl).length;
      }
    } catch (e) {}
    return { id: p.id, title: p.title || t('post.untitled'), score: likes * 3 + views + comments * 5, views: views, likes: likes, comments: comments };
  }));
  scored.sort(function (a, b) { return b.score - a.score; });
  _featuredCache = scored;
  return scored.filter(function (p) { return p.id !== excludeId; }).slice(0, count || 2);
}
function renderFeaturedHtml(excludeId) {
  return '<div class="featured-posts" id="featuredPosts"><div class="featured-title">' + svgIcon('pin', 16) + ' ' + t('featured.title') + '</div><div class="featured-grid" id="featuredGrid"><div class="featured-loading">' + t('site.loading') + '…</div></div></div>';
}
function loadFeaturedPosts(excludeId) {
  _featuredCache = null; // 每次进入新文章清缓存，确保过滤当前文章
  getFeaturedPosts(excludeId, 2).then(function (items) {
    var wrap = document.querySelector('#featuredPosts');
    var grid = document.querySelector('#featuredGrid');
    if (!grid) return;
    if (!items.length) { if (wrap) wrap.style.display = 'none'; return; }
    grid.innerHTML = items.map(function (p, idx) {
      return '<div class="featured-card" data-idx="' + idx + '">'
        + '<div class="featured-card-title">' + esc(p.title) + '</div>'
        + '<div class="featured-card-meta">' + svgIcon('eye', 12) + ' ' + p.views + ' · ' + svgIcon('heart', 12) + ' ' + p.likes + ' · ' + svgIcon('quote', 12) + ' ' + p.comments
        + '</div></div>';
    }).join('');
    // 用 div + click 直接跳转
    grid.querySelectorAll('.featured-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var idx = parseInt(card.getAttribute('data-idx'), 10);
        if (!items[idx]) return;
        var targetId = items[idx].id;
        // 相同文章直接滚动到顶部
        if (targetId === excludeId) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        // SPA 路由跳转（兼容 file:// hash 模式和 http history 模式）
        navigate(postUrl(targetId));
      });
    });
  }).catch(function () {
    var wrap = document.querySelector('#featuredPosts');
    if (wrap) wrap.style.display = 'none';
  });
}

/* ---------- 管理员门禁 ----------
 * 云端模式（API 可用）：密码存 Cloudflare KV，前端只持有会话 token。
 *   登录 POST /api/admin/login → token 存 localStorage('qingyu.token')。
 * 静态模式（file:// 或纯静态托管）：保留本地密码门禁（防君子）。
 */
function _cfgPwd() { return getConfig().adminPwd; }
function _localPwd() { try { return localStorage.getItem('qingyu.admin.pwd') || ''; } catch (e) { return ''; } }
function _setLocalPwd(v) { try { localStorage.setItem('qingyu.admin.pwd', String(v)); } catch (e) {} }
function _adminSession() { try { return localStorage.getItem('qingyu.admin.ok') === '1'; } catch (e) { return false; } }
function _setAdminSession(v) { try { localStorage.setItem('qingyu.admin.ok', v ? '1' : '0'); } catch (e) {} }
/** 简单 SHA-256 哈希（前端 PBKDF2 不需要，用轻量版即可） */
async function _hashLocalPwd(pwd) {
  var enc = new TextEncoder();
  var buf = await crypto.subtle.digest('SHA-256', enc.encode(String(pwd)));
  return 'sha256:' + Array.from(new Uint8Array(buf), function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}
/* 云端会话 token */
function _sessionToken() { try { return localStorage.getItem('qingyu.token') || ''; } catch (e) { return ''; } }
function _setSessionToken(t) {
  try { if (t) localStorage.setItem('qingyu.token', t); else localStorage.removeItem('qingyu.token'); } catch (e) {}
}
/* 云模式判定：配置为 api，或 boot 已成功拉到云端文章 */
function _cloudOn() {
  var cfg = getConfig();
  return cfg.mode === 'api' || (cfg.mode === 'auto' && _cloudDetected);
}

var _cloudDetected = false;   // boot 时置位：/api/posts 拉取成功 = 云端在线

function needAdminSetup() {
  return !_cfgPwd() && !_localPwd();
}
function adminOk() {
  // 云端：有会话 token 即视为已登录（有效性由服务端鉴权兜底）
  if (_cloudOn()) return !!_sessionToken();
  return _adminSession();
}
async function setupAdmin(pwd) {
  pwd = String(pwd || '');
  if (pwd.length < 4) return false;
  var hashed = await _hashLocalPwd(pwd);
  _setLocalPwd(hashed);
  _setAdminSession(true);
  return true;
}
async function tryAdmin(pwd) {
  var target = _cfgPwd() || _localPwd();
  if (!target) return false;
  // 兼容旧版明文密码（无 sha256: 前缀）
  if (target.indexOf('sha256:') !== 0) {
    if (String(pwd || '') === target) {
      // 升级为哈希存储
      var hashed = await _hashLocalPwd(pwd);
      _setLocalPwd(hashed);
      _setAdminSession(true);
      return true;
    }
    return false;
  }
  var hashed = await _hashLocalPwd(pwd);
  if (hashed === target) { _setAdminSession(true); return true; }
  return false;
}
/** 云端登录：POST /api/admin/login，成功存 token；返回 { ok, message, mustChange, defaultPassword } */
async function cloudLogin(pwd) {
  try {
    var data = await apiFetch('api/admin/login', { method: 'POST', body: JSON.stringify({ password: String(pwd || '') }) });
    if (!data || !data.token) return { ok: false, message: (data && data.error) || t('admin.loginFail') };
    _setSessionToken(data.token);
    _setAdminSession(true);
    return { ok: true, mustChange: !!data.mustChange, defaultPassword: data.defaultPassword || '' };
  } catch (e) {
    return { ok: false, message: t('admin.loginFail') + '（HTTP ' + (e && e.message ? e.message.replace('HTTP ', '') : '') + '）' };
  }
}
/** 云端登出：调用 /api/admin/logout 并清除本地 token */
async function cloudLogout() {
  var t = _sessionToken();
  _setSessionToken('');
  _setAdminSession(false);
  if (_cloudOn() && t) {
    try { await apiFetch('api/admin/logout', { method: 'POST', body: '{}' }); } catch (e) {}
  }
}
function adminLogout() {
  if (_cloudOn()) { cloudLogout(); }
  else { _setAdminSession(false); }
}

/* ---------- 导出 ---------- */
function buildPostsJs() {
  var drafts = [];
  try { drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) { drafts = []; }
  var all = getStaticPosts().slice();
  drafts.forEach(function (d) {
    if (!d || !d.id) return;
    var idx = all.findIndex(function (p) { return p.id === d.id; });
    var item = {
      id: d.id,
      title: d.title || '',
      date: d.date || new Date().toISOString().slice(0, 10),
      tags: normalizeTags(d),
      excerpt: d.excerpt || '',
      pinned: !!d.pinned,
      content: d.content || ''
    };
    if (idx >= 0) all[idx] = item; else all.push(item);
  });
  all.sort(sortPosts);
  var out = '/* ============================================================\n * Qingyu\'Blog · 文章数据（由「导出 posts.js」生成）\n * 下载本文件后覆盖博客目录下的 posts.js 即可发布。\n * ============================================================ */\nwindow.BLOG_POSTS = ' + JSON.stringify(all, null, 2) + ';\n';
  return out;
}

/** 读取草稿：key='__new' 返回最近一次「保存/发布文章」的条目（总是 push 到最后），
 *  其余返回指定 id 的条目；找不到返回 null */
function loadDraftFromStore(key) {
  try {
    var arr = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]');
    if (!Array.isArray(arr)) return null;
    if (key === '__new') return arr.length ? arr[arr.length - 1] : null;
    return arr.find(function (d) { return d && d.id === key; }) || null;
  } catch (e) { return null; }
}

function saveDraftToStore(key, val) {
  try {
    var keyS = String(key || '');
    var existing = [];
    try { existing = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) { existing = []; }
    if (keyS === '__new') {
      existing = existing.filter(function (d) { return d && d.id !== (val && val.id); });
      if (val && val.id) existing.push(val);
    } else {
      var idx = existing.findIndex(function (d) { return d && d.id === keyS; });
      if (idx >= 0) existing[idx] = Object.assign({}, existing[idx], val || {});
      else if (val) existing.push(Object.assign({ id: keyS }, val));
    }
    localStorage.setItem('qingyu.drafts', JSON.stringify(existing));
  } catch (e) {}
}

function buildFeedXmlClient(posts, maxItems) {
  var cfg = getConfig();
  var base = cfg.siteUrl || (typeof location !== 'undefined' ? location.origin : '');
  base = String(base || '').replace(/\/+$/, '');
  var list = (posts || []).slice().sort(sortPosts).slice(0, maxItems || 20);
  var items = list.map(function (p) {
    var link = base + postUrl(p.id);
    // description 输出渲染后的 HTML（而非 Markdown 源码），阅读器直接显示富文本
    var content = renderMarkdown(p.content || '').replace(/\]\]>/g, ']]&gt;');
    return '<item>\n      <title>' + esc(p.title) + '</title>\n      <link>' + esc(link) + '</link>\n      <guid isPermaLink="false">' + esc(p.id) + '</guid>\n      <pubDate>' + rfc822(p.date) + '</pubDate>\n      <description><![CDATA[' + content + ']]></description>\n    </item>';
  }).join('\n    ');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>' + esc(cfg.title || 'Qingyu\'Blog') + '</title>\n    <link>' + esc(base || 'https://blog.example') + '</link>\n    <description>' + esc(cfg.description || t('site.desc')) + '</description>\n    <language>zh-CN</language>\n    <lastBuildDate>' + new Date().toUTCString() + '</lastBuildDate>\n    ' + items + '\n  </channel>\n</rss>\n';
}
function rfc822(dateStr) {
  try {
    var s = String(dateStr || '').trim();
    var d;
    if (s.length <= 10) {
      // 纯日期 "YYYY-MM-DD"：按 UTC 解析，pubDate 日期不跨天（避免 +8 时区显示前一天）
      d = new Date(s.slice(0, 10) + 'T00:00:00Z');
    } else {
      // "YYYY-MM-DD HH:mm"：按本地时区解析为 UTC 输出
      d = new Date(s.slice(0, 10) + 'T' + (s.slice(11, 16) || '00:00') + ':00');
    }
    return isNaN(d.getTime()) ? new Date().toUTCString() : d.toUTCString();
  } catch (e) { return new Date().toUTCString(); }
}

/* ---------- 保存文件 ---------- */
async function saveFileFriendly(name, content, doneText, failText) {
  var b = new Blob([content], { type: 'application/octet-stream' });
  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    try {
      var handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: '', accept: {} }] });
      var writable = await handle.createWritable();
      await writable.write(b);
      await writable.close();
      return true;
    } catch (e) { return false; }
  }
  var a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
  return false;
}

/* ============================================================
 * 页面渲染
 * ============================================================ */
function app() { return document.querySelector('#app'); }

  /** 翻译导航项的 text 字段（config.js 中的原始文本会被翻译） */
  var _navTextMap = {
    '首页': 'nav.home', '标签': 'nav.tags', '归档': 'nav.archive',
    '关于': 'nav.about', '写作后台': 'nav.admin'
  };
  function tNav(text) {
    if (!text) return text;
    var key = _navTextMap[text];
    return key ? t(key) : text;
  }

  function renderNav(active) {
  var cfg = getConfig();
  var navs = cfg.nav.length ? cfg.nav : [
    { text: t('nav.home'), url: '/', path: '/' },
    { text: t('nav.tags'), url: '/tags', path: '/tags' },
    { text: t('nav.archive'), url: '/archive', path: '/archive' },
    { text: t('nav.about'), url: '/about', path: '/about' }
  ];
  // 如果 nav 来自 config.js，翻译已知的中文文本
  if (cfg.nav.length) {
    navs = navs.map(function (n) {
      var item = { text: tNav(n.text), url: n.url, path: n.path };
      if (n.children && n.children.length) {
        item.children = n.children.map(function (c) {
          return { text: tNav(c.text), url: c.url };
        });
      }
      return item;
    });
  }
  var links = navs.map(function (n) {
    var raw = n.url || '/';
    var pathKey = n.path || (/^#\//.test(raw) ? raw.slice(1) : (/^\//.test(raw) ? raw : null));
    var url = (/^#\//.test(raw)) ? href(raw.slice(1)) : (/^\//.test(raw) ? href(raw) : raw);
    var cls = (pathKey && pathKey === active) ? 'nav-link active' : 'nav-link';
    var isChildPath = n.children && n.children.length;
    if (isChildPath) {
      var kids = n.children.map(function (c) {
        var cRaw = c.url || '/';
        var cUrl = (/^#\//.test(cRaw)) ? href(cRaw.slice(1)) : (/^\//.test(cRaw) ? href(cRaw) : cRaw);
        var tgt = cUrl && /^https?:|^\/\//.test(cUrl) ? ' target="_blank" rel="noopener"' : '';
        return '<a href="' + esc(cUrl) + '" class="nav-link"' + tgt + '>' + esc(c.text || '') + '</a>';
      }).join('');
      return '<div class="nav-item has-sub"><a href="' + esc(url) + '" class="' + cls + '">' + esc(n.text || '') + '</a><div class="sub-menu">' + kids + '</div></div>';
    }
    var ext = url && /^https?:|^\/\//.test(url) ? ' target="_blank" rel="noopener"' : '';
    return '<div class="nav-item"><a href="' + esc(url) + '" class="' + cls + '"' + ext + '>' + esc(n.text || '') + '</a></div>';
  }).join('');

  var langSwitch = '<select id="langSwitch" class="lang-switch" onchange="window.__i18n.loadLocale(this.value).then(function(){ route(); })"></select>';
  var themeBtn = '<button class="icon-btn" id="themeToggle" aria-label="' + t('theme.toggle') + '" title="' + t('theme.toggle') + '">' + themeIcon() + '</button>';
  var searchBtn = '<button class="icon-btn search-toggle" id="searchToggle" aria-label="' + t('search.toggle') + '" title="' + t('search.toggle') + '">' + searchIconSvg() + '</button>';
  // mobile sidebar must use unique ids
  var sideLangSwitch = '<select id="langSwitchSide" class="lang-switch" onchange="window.__i18n.loadLocale(this.value).then(function(){ route(); })"></select>';
  var sideSup = '<button class="icon-btn" id="themeToggleSide" aria-label="' + t('theme.toggle') + '" title="' + t('theme.toggle') + '">' + themeIcon() + '</button>';
  var sideSearchBtn = '<button class="icon-btn search-toggle" id="searchToggleSide" aria-label="' + t('search.toggle') + '" title="' + t('search.toggle') + '">' + searchIconSvg() + '</button>';
  var hamburger = '<button class="hamburger-btn" id="hamburgerBtn" aria-label="' + t('nav.toggle') + '"><span></span><span></span><span></span></button>';

  // 侧边栏导航项（移动端用）
  var sidebarLinks = navs.map(function (n) {
    var raw = n.url || '/';
    var pathKey = n.path || (/^#\//.test(raw) ? raw.slice(1) : (/^\//.test(raw) ? raw : null));
    var url = (/^#\//.test(raw)) ? href(raw.slice(1)) : (/^\//.test(raw) ? href(raw) : raw);
    var cls = (pathKey && pathKey === active) ? 'sidebar-link active' : 'sidebar-link';
    var ext = url && /^https?:|^\/\//.test(url) ? ' target="_blank" rel="noopener"' : '';
    return '<a href="' + esc(url) + '" class="' + cls + '"' + ext + '>' + esc(n.text || '') + '</a>';
  }).join('');

  // 侧栏：品牌名 + 主题切换 + 导航链接 + 语言切换
  var sidebar = '<div class="sidebar-overlay" id="sidebarOverlay"></div>'
    + '<aside class="mobile-sidebar" id="mobileSidebar">'
    + '<div class="sidebar-header"><span class="sidebar-brand">Qingyu\'Blog</span>'
    + '<button class="icon-btn sidebar-theme" id="themeToggleSide" aria-label="' + t('theme.toggle') + '" title="' + t('theme.toggle') + '">' + themeIcon() + '</button>'
    + '<button class="sidebar-close" id="sidebarClose" aria-label="' + t('search.close') + '">✕</button></div>'
    + '<nav class="sidebar-nav">' + sidebarLinks + '</nav>'
    + '<div class="sidebar-footer">'
    + '<div class="sidebar-actions">' + sideSearchBtn + sideLangSwitch + sideSup + '</div>'
    + '</div>'
    + '</aside>';

  var searchForm = '<form class="topbar-search" id="topbarSearch" role="search" onsubmit="return false">'
    + '<span class="ts-icon">' + searchIconSvg() + '</span>'
    + '<input id="globalSearchInput" type="search" placeholder="' + t('search.placeholder') + '" autocomplete="off" aria-label="' + t('search.toggle') + '">'
    + '<button type="button" class="ts-close" id="searchClose" aria-label="' + t('search.close') + '">✕</button>'
    + '</form>';
  // 汉堡在 topbar-left 前面，与品牌/搜索同行
  return sidebar
    + '<header class="topbar' + (active && _searchOpen ? ' searching' : '') + '">'
    + '<div class="container topbar-inner">'
    + '<div class="topbar-left">' + hamburger + '<a class="brand" href="' + esc(href('/')) + '">Qingyu\'Blog</a></div>'
    + '<nav class="main-nav">' + links + '</nav>'
    + '<div class="topbar-actions">' + searchBtn + langSwitch + themeBtn + '</div>'
    + searchForm
    + '</div>'
    + '<div class="search-panel" id="searchPanel"></div>'
    + '</header>';
}

function renderFooter() {
  var cfg = getConfig();
  var f = cfg.footer || {};
  var year = new Date().getFullYear();
  var startYear = Number(f.startYear) || 2019;
  var copyRange = (startYear && startYear < year) ? (startYear + '-' + year) : ('' + year);
  var site = f.copyrightName || cfg.title || 'Qingyu\'Blog';
  // 页脚导航行：写作后台仅管理员显示；RSS 仅普通用户显示（互斥，避免导航过长）
  var nav = [
    { text: t('nav.home'), url: '/' },
    { text: t('nav.tags'), url: '/tags' },
    { text: t('nav.archive'), url: '/archive' },
    { text: t('nav.about'), url: '/about' }
  ];
  if (adminOk()) nav.push({ text: t('nav.admin'), url: '/admin' });
  function l(x) {
    var u = x.url || '/';
    if (/^#\//.test(u)) u = href(u.slice(1));
    else if (/^\//.test(u)) u = href(u);
    return '<a href="' + esc(u) + '">' + esc(x.text || '') + '</a>';
  }
  var navHtml = nav.map(l).join('<span class="footer-dot">·</span>');
  // RSS：仅非管理员显示（管理员有写作后台入口）。云端模式指向动态
  // /api/feed.xml（含全部云端文章、自动取站点域名）；file:// 直开时同目录；
  // 其余静态托管用根路径 feed.xml
  if (!adminOk()) {
    var rssHref = _cloudOn() ? '/api/feed.xml' : (useHashMode() ? 'feed.xml' : '/feed.xml');
    navHtml += '<span class="footer-dot footer-rss">·</span><a class="footer-rss" href="' + esc(rssHref) + '">RSS</a>';
  }
  // 电脑端专属区块：自定义文字 / 站点声明 / 联系方式 / 友情链接
  var extra = '';
  if (f.text) extra += '<p class="footer-text">' + esc(f.text) + '</p>';
  if (f.decl) extra += '<p class="footer-decl">' + t('footer.declPrefix') + esc(f.decl) + '</p>';
  if (f.email) extra += '<p class="footer-contact">' + t('footer.contactPrefix') + '<a href="mailto:' + esc(f.email) + '">' + esc(f.email) + '</a></p>';
  var friends = (f.links || []).map(l).join('');
  if (friends) extra += '<p class="footer-friends">' + t('footer.friends') + friends + '</p>';
  // 版权行（移动端仅显示此行，备案号在移动端隐藏）
  var copy = 'Copyright ©' + copyRange + ' ' + esc(site);
  var icp = f.icp ? ' <span class="footer-icp">' + esc(f.icp) + '</span>' : '';
  return '<footer><div class="container footer-inner">'
    + '<div class="footer-nav">' + navHtml + '</div>'
    + (extra ? '<div class="footer-extra">' + extra + '</div>' : '')
    + '<div class="footer-copy">' + copy + icp + '</div>'
    + '</div>'
    // 返回顶部：固定悬浮右下角，所有页面共用（点击仅滚回当前页顶部）
    + '<button class="btn-top" id="backTop" aria-label="' + t('footer.backTop') + '" title="' + t('footer.backTop') + '">' + svgIcon('top', 18) + '</button>'
    + '</footer>';
}

function homePageSize() {
  var n = Number(getConfig().pageSize);
  return (n && n > 0) ? n : 0;   // 0 = 不分页，全部显示
}

/* 计算当前分页并渲染「卡片列表 + 翻页器」 */
function homeListHtml(filtered, ads, adsEnabled, page, pageSize, emptyMsg) {
  var total = filtered.length;
  var totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  var pageItems = pageSize > 0 ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;
  var list = renderCardList(pageItems, ads, adsEnabled);
  if (!pageItems.length) list = '<div class="empty"><div class="big">' + svgIcon('doc', 36) + '</div><p>' + (emptyMsg || t('home.noPosts')) + '</p></div>';
  return { html: '<div id="listContainer">' + list + '</div>' + pagerHtml(page, totalPages), page: page, totalPages: totalPages };
}

/* 翻页器：上一页 / 下一页，保留当前标签与页码（query 形式，链接可前进/后退）。
 * 仅在第 1 页时显示「下一页」，末页时显示「上一页」，单页则不显示翻页器。 */
function pagerHtml(page, totalPages) {
  if (totalPages <= 1) return '';
  var tag = (currentRoute().query.tag) || '';
  var prevHref = href('/', tag ? { tag: tag, page: page - 1 } : { page: page - 1 });
  var nextHref = href('/', tag ? { tag: tag, page: page + 1 } : { page: page + 1 });
  var parts = [];
  if (page > 1) parts.push('<a class="pager-btn" href="' + esc(prevHref) + '">' + t('pagination.prev') + '</a>');
  parts.push('<span class="pager-info">' + t('pagination.page', { current: page, total: totalPages }) + '</span>');
  if (page < totalPages) parts.push('<a class="pager-btn" href="' + esc(nextHref) + '">' + t('pagination.next') + '</a>');
  return '<div class="pager">' + parts.join('') + '</div>';
}

function renderHome() {
  var cfg = getConfig();
  var posts = sortPagePosts(getStaticPosts());
  var cur = currentRoute();
  var tag = cur.query.tag || '';
  var ads = cfg.ads || {};
  var adsEnabled = !!ads.enabled;
  var pageSize = homePageSize();
  var page = parseInt(cur.query.page, 10) || 1;
  var html = renderNav(cur.path);
  html += '<main class="container page-fade"><div class="list-head"><h2 class="page-title">' + t('home.latest') + '</h2></div>';
  if (tag) {
    html += '<div class="current-tag"><span class="tag-chip">' + esc(tag) + ' <a class="tag-clear" href="' + esc(href('/')) + '">✕</a></span></div>';
  }
  html += renderHomeTagRow(posts, tag);
  if (adsEnabled && ads.belowSearch) html += '<div class="ad-slot"><span class="ad-label">' + t('ad.label') + '</span>' + ads.belowSearch + '</div>';
  var filtered = tag ? posts.filter(function (p) { return (p.tags || []).indexOf(tag) >= 0; }) : posts;
  var body = homeListHtml(filtered, ads, adsEnabled, page, pageSize);
  html += '<div id="homeBody">' + body.html + '</div>';
  html += '</main>';
  html += renderFooter();
  return html;
}

function searchIconSvg() {
  return '<svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"></circle><circle class="search-dot" cx="15.2" cy="15.2" r="1.6"></circle></svg>';
}

/* 首页标签分类行：位于「最新发布」标题下方、卡片列表上方 */
function renderHomeTagRow(posts, activeTag) {
  var counts = {};
  var order = [];
  posts.forEach(function (p) {
    normalizeTags(p).forEach(function (t) {
      if (!counts[t]) { counts[t] = 0; order.push(t); }
      counts[t]++;
    });
  });
  if (!order.length) return '';
  var html = '<div class="home-tags">';
  html += '<span class="home-tags-label">' + t('home.categoryLabel') + '</span>';
  order.forEach(function (t) {
    var on = t === activeTag;
    html += '<a class="home-tag' + (on ? ' active' : '') + '" href="' + esc(href('/', { tag: t })) + '" data-home-tag>' + esc(t) + '<span class="home-tag-count">' + counts[t] + '</span></a>';
  });
  html += '</div>';
  return html;
}

/* 渲染卡片（可含广告位），供首页初始及搜索实时过滤复用 */
function renderCardList(plist, ads, adsEnabled) {
  var every = Number(ads.betweenEvery) || 3;
  var out = '';
  plist.forEach(function (p, idx) {
    if (adsEnabled && ads.between && idx > 0 && idx % every === 0) out += '<div class="ad-slot"><span class="ad-label">' + t('ad.label') + '</span>' + ads.between + '</div>';
    out += renderCard(p);
  });
  return out;
}

function renderCard(p) {
  var badges = '';
  if (p.pinned) badges += '<span class="pin">' + svgIcon('pin', 13) + ' ' + t('post.pin') + '</span>';
  var tags = normalizeTags(p).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
  var excerpt = p.excerpt || stripMd(p.content || '').slice(0, 100);
  return '<a class="post-card" href="' + esc(href(postUrl(p.id))) + '">'
    + '<div class="post-card-main">'
    + '<div class="meta"><span class="date">' + esc(p.date || '') + '</span>' + badges + '</div>'
    + '<h2>' + esc(p.title || '') + '</h2>'
    + '<div class="excerpt">' + esc(excerpt) + '</div>'
    + (tags ? '<div class="mini-tags">' + tags + '</div>' : '')
    + '</div>'
    + renderPostThumb(p)
    + '</a>';
}

/** 文章缩略图：优先 cover 字段，其次正文第一张图；有图仅显示图，无图显示主题渐变占位（中性图片图标） */
function renderPostThumb(p) {
  var url = String((p && p.cover) || '').trim() || firstImageFrom(p && p.content);
  var title = (p && p.title) || '';
  if (url) {
    return '<span class="post-thumb has-img"><img src="' + esc(url) + '" alt="' + esc(title || t('post.thumbnailAlt')) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></span>';
  }
  return '<span class="post-thumb ph"><span class="post-thumb-ph">' + svgIcon('image', 26) + '</span></span>';
}

/** 从正文 Markdown 提取第一张图片 URL（![alt](url) 或 <img src="url">） */
function firstImageFrom(content) {
  var s = String(content || '');
  var m = s.match(/!\[[^\]]*\]\(\s*(https?:[^)\s]+)\s*\)/i);
  if (m) return m[1];
  var m2 = s.match(/<img[^>]+src=["'](https?:[^"']+)["']/i);
  return m2 ? m2[1] : '';
}

/* ---------- 文章详情本地缓存 ----------
 * 云端正文（content）缓存到 localStorage：首次点击拉取后存入；
 * 再次点击先显示缓存（秒开），同时后台重新拉取最新数据（SWR），
 * 内容有更新则刷新缓存并自动重渲染为最新正文。 */
function postCacheKey(id) { return 'qingyu.postCache.' + id; }
function readPostCache(id) {
  try {
    var raw = localStorage.getItem(postCacheKey(id));
    if (!raw) return null;
    var o = JSON.parse(raw);
    return (o && o.post && typeof o.post.content === 'string') ? o.post : null;
  } catch (e) { return null; }
}
function writePostCache(id, post) {
  try {
    localStorage.setItem(postCacheKey(id), JSON.stringify({ post: { content: post.content || '' }, ts: Date.now() }));
  } catch (e) { /* 容量满/不可用：忽略，下次重新拉取 */ }
}
function clearPostCache(id) {
  try { localStorage.removeItem(postCacheKey(id)); } catch (e) {}
}

async function renderPost(id) {
  var cur = currentRoute();
  var html = renderNav(cur.path);
  var posts = getStaticPosts();
  var post = posts.find(function (p) { return p.id === id; });
  html += '<main class="container page-fade"><div class="post-body">';
  if (!post) {
    html += '<div class="empty"><div class="big">' + svgIcon('question', 36) + '</div><p>' + t('post.notFound') + '</p><p><a href="' + esc(href('/')) + '">' + t('post.backHome') + '</a></p></div></div></main>';
    html += renderFooter();
    app().innerHTML = html;
    return;
  }

  if (_cloudOn()) {
    // 正文加载：优先本地缓存（首次拉取后存入，再次进入秒开）；
    // 每次进入都后台重新拉取最新正文（SWR），有更新则刷新缓存并重渲染
    var hasContent = !!post.content;
    var fromCache = false;
    if (!hasContent) {
      var cachedPost = readPostCache(post.id);
      if (cachedPost && cachedPost.content) {
        post.content = cachedPost.content;
        post._fullLoaded = true;
        fromCache = true;
      }
    }
    if (!hasContent && !post.content) {
      html += '<div class="empty"><div class="big">' + svgIcon('spinner', 26) + '</div><p>' + t('site.loading') + '…</p></div>';
      html += '</div></main>' + renderFooter();
      app().innerHTML = html;
    }
    // 超时保护：10 秒拿不到正文就放弃加载态，避免“一直加载中”
    var settled = false;
    function finish(data) {
      if (settled) return;
      settled = true;
      var full = (data && data.post) || null;
      if (!full) {
        post._fullLoaded = true;
        if (!hasContent && !fromCache) route();   // 无缓存且拉取失败：结束加载态
        return;
      }
      var changed = full.content !== undefined && full.content !== post.content;
      if (full.content !== undefined) post.content = full.content;
      if (full.content) writePostCache(post.id, full);
      post._fullLoaded = true;
      if (changed || (!hasContent && !fromCache)) route();
    }
    apiFetch('api/posts/' + encodeURIComponent(post.id))
      .then(function (data) { finish(data); })
      .catch(function () { finish(null); });
    setTimeout(function () { finish(null); }, 10000);
    if (!post.content) return;   // 无内容（含无缓存）：等待拉取后重渲染
    // 有内容（缓存或已加载）：继续渲染正文，后台拉取完成后若有更新会重渲染
  }
  var content = post.content || '';
  var bodyHtml = renderMarkdown(content || '');
  var tocRes = buildToc(bodyHtml);
  var toc = tocRes.html;
  var tocHeadings = tocRes.headings;
  var tags = normalizeTags(post).map(function (t) { return '<a href="' + esc(href('/', { tag: t })) + '" data-tag-link>' + esc(t) + '</a>'; }).join('');
  var minutes = Math.max(1, Math.ceil((stripMd(content || '').length / 400)));
  html += '<div class="post-header"><h1>' + esc(post.title || '') + '</h1><div class="meta"><span class="meta-date">' + esc(post.date || '') + '</span><span class="meta-dot">·</span><span>' + minutes + ' ' + t('post.minRead') + '</span><span class="meta-dot">·</span><span class="meta-views">' + svgIcon('eye', 14) + ' <span id="viewCount">0</span> ' + t('post.views') + '</span>' + (post.pinned ? '<span class="pin">' + svgIcon('pin', 13) + ' ' + t('post.pin') + '</span>' : '') + '</div></div>';
  html += toc;
  html += '<article class="article">' + bodyHtml + '</article>';
  // 点赞：正文尾部，水平居中
  html += '<div class="like-bar"><button class="btn like-btn" id="likeBtn">' + svgIcon('heart', 15) + ' <span id="likeCount">0</span></button></div>';
  // 底部：左标签、右复制链接(+编辑)
  var afEdit = adminOk()
    ? '<a class="btn" href="' + esc(href(postUrl(post.id) + 'edit')) + '">' + svgIcon('pen', 13) + ' ' + t('post.edit') + '</a>'
    : '';
  html += '<div class="article-footer"><div class="af-tags">' + (tags || '') + '</div><div class="af-actions">' + afEdit + '<button class="btn" id="btnCopyLink">' + svgIcon('link', 14) + ' ' + t('post.copyLink') + '</button></div></div>';

  // prev / next
  var sorted = posts.slice().sort(sortPosts);
  var idx = sorted.findIndex(function (p) { return p.id === id; });
  var prev = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  var next = idx > 0 ? sorted[idx - 1] : null;
  html += '<div class="pn-nav">';
  if (prev && next) {
    // 两个都有：左右排列
    html += '<a class="pn-item" href="' + esc(href(postUrl(prev.id))) + '"><span class="pn-dir">' + t('post.prev') + '</span><span class="pn-title">' + esc(prev.title || '') + '</span></a>';
    html += '<a class="pn-item" href="' + esc(href(postUrl(next.id))) + '"><span class="pn-dir">' + t('post.next') + '</span><span class="pn-title">' + esc(next.title || '') + '</span></a>';
  } else if (prev) {
    // 只有上一篇：独占一行左对齐
    html += '<a class="pn-item pn-single" href="' + esc(href(postUrl(prev.id))) + '"><span class="pn-dir">' + t('post.prev') + '</span><span class="pn-title">' + esc(prev.title || '') + '</span></a>';
  } else if (next) {
    // 只有下一篇：独占一行右对齐
    html += '<a class="pn-item pn-single" href="' + esc(href(postUrl(next.id))) + '"><span class="pn-dir">' + t('post.next') + '</span><span class="pn-title">' + esc(next.title || '') + '</span></a>';
  }
  html += '</div>';

  // comments
  html += '<div class="comments"><h3>' + t('comment.title') + ' <span class="comment-count" id="commentCount">' + '0' + '</span></h3>';
  html += '<p class="comment-hint">' + t('comment.hint') + '</p>';
  html += '<div class="reply-indicator" id="replyIndicator" style="display:none"><span id="replyTo"></span><button class="reply-cancel" id="replyCancel">✕</button></div>';
  html += '<div class="comment-form"><input type="text" id="commentAuthor" maxlength="30" placeholder="' + t('comment.authorPlaceholder') + '"><textarea id="commentContent" rows="2" maxlength="1000" placeholder="' + t('comment.contentPlaceholder') + '"></textarea><div class="comment-submit-row"><button class="btn btn-primary" id="commentSubmit">' + t('comment.submit') + '</button><span class="c-status" id="commentStatus"></span></div></div>';
  html += '<ul class="comment-list" id="commentList"></ul></div>';

  // 精选文章（评论区下方）
  html += renderFeaturedHtml(post.id);

  var adCfg = getConfig().ads || {};
  if (adCfg.enabled && adCfg.content) html += '<div class="ad-slot"><span class="ad-label">' + t('ad.label') + '</span>' + adCfg.content + '</div>';

  html += '</div></main>' + renderFooter();
  app().innerHTML = html;
  stampHeadingNumbers(tocHeadings);

  // stats load
  loadStats(post.id).then(function (s) {
    var v = document.querySelector('#viewCount'); if (v) v.textContent = String(s.views);
    var l = document.querySelector('#likeCount'); if (l) l.textContent = String(s.likes);
  });
  // 精选文章异步加载
  loadFeaturedPosts(post.id);
  incView(post.id).then(function (s) {
    var v = document.querySelector('#viewCount'); if (v && s) v.textContent = String(s.views);
  });
  var likeBtn = document.querySelector('#likeBtn');
  if (likeBtn) {
    if (wasLiked(post.id)) { likeBtn.classList.add('liked'); likeBtn.disabled = true; }
    likeBtn.addEventListener('click', function () {
      likePost(post.id).then(function (s) {
        var l = document.querySelector('#likeCount');
        if (s && l) l.textContent = String(s.likes);
        likeBtn.classList.add('liked');
        likeBtn.disabled = true;
      });
    });
  }

  var copyBtn = document.querySelector('#btnCopyLink');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    var url = location.origin + appRoot() + postUrl(post.id);
    navigator.clipboard && navigator.clipboard.writeText(url) && (copyBtn.textContent = t('post.copied'));
  });

  // load comments
  loadComments(post.id).then(function (list) {
    var ul = document.querySelector('#commentList');
    var cnt = document.querySelector('#commentCount');
    if (cnt) cnt.textContent = String(list.length);
    if (!ul) return;
    var canDel = !_cloudOn() || adminOk();
    if (!list.length) { ul.innerHTML = '<li class="comment-empty">' + t('comment.noComments') + '</li>'; return; }
    // 构建评论树
    var roots = [], childMap = {};
    list.forEach(function (c) { childMap[c.id] = []; });
    list.forEach(function (c) {
      if (c.parent_id && childMap[c.parent_id]) { childMap[c.parent_id].push(c); }
      else if (c.parent_id) { roots.push(c); }
      else { roots.push(c); }
    });
    function renderComment(c, depth) {
      var replies = childMap[c.id] || [];
      var replyBtn = '<button class="comment-reply-btn" data-reply-id="' + esc(c.id) + '" data-reply-author="' + esc(c.author) + '">' + t('comment.reply') + '</button>';
      var delBtn = canDel ? '<button class="comment-del" data-cid="' + esc(c.id) + '">' + t('comment.delete') + '</button>' : '';
      var childrenHtml = replies.length ? '<ul class="comment-children">' + replies.map(function (r) { return renderComment(r, depth + 1); }).join('') + '</ul>' : '';
      return '<li class="comment" data-id="' + esc(c.id) + '"><div class="comment-head">'
        + '<span class="comment-author">' + esc(c.author) + '</span>'
        + '<span class="comment-date">' + esc(c.date || '') + '</span>'
        + (depth < 3 ? replyBtn : '')
        + delBtn
        + '</div><div class="comment-content">' + esc(c.content) + '</div>' + childrenHtml + '</li>';
    }
    ul.innerHTML = roots.map(function (c) { return renderComment(c, 0); }).join('');
    // 删除按钮
    ul.querySelectorAll('.comment-del').forEach(function (b) {
      b.addEventListener('click', function () { deleteComment(post.id, b.getAttribute('data-cid')).then(renderCommentsList); });
    });
    // 回复按钮
    ul.querySelectorAll('.comment-reply-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var indicator = document.querySelector('#replyIndicator');
        var replyTo = document.querySelector('#replyTo');
        var contentInput = document.querySelector('#commentContent');
        if (indicator && replyTo) {
          indicator.style.display = 'flex';
          replyTo.textContent = t('comment.replyTo', { author: b.getAttribute('data-reply-author') });
          indicator.setAttribute('data-reply-id', b.getAttribute('data-reply-id'));
          if (contentInput) contentInput.focus();
        }
      });
    });
  });

  // 取消回复
  var replyCancel = document.querySelector('#replyCancel');
  if (replyCancel) replyCancel.addEventListener('click', function () {
    var indicator = document.querySelector('#replyIndicator');
    if (indicator) { indicator.style.display = 'none'; indicator.removeAttribute('data-reply-id'); }
  });

  var submit = document.querySelector('#commentSubmit');
  if (submit) submit.addEventListener('click', async function () {
    var a = document.querySelector('#commentAuthor');
    var c = document.querySelector('#commentContent');
    var st = document.querySelector('#commentStatus');
    var indicator = document.querySelector('#replyIndicator');
    if (!a || !c) return;
    if (!a.value.trim() || !c.value.trim()) { if (st) st.textContent = t('comment.fillBoth'); return; }
    var parentId = (indicator && indicator.getAttribute('data-reply-id')) || null;
    submit.disabled = true;
    try {
      await saveComment(post.id, a.value, c.value, parentId);
      if (st) st.textContent = t('comment.posted');
      if (c) c.value = '';
      if (indicator) { indicator.style.display = 'none'; indicator.removeAttribute('data-reply-id'); }
      loadComments(post.id).then(renderCommentsList);
    } finally {
      submit.disabled = false;
    }
  });

  function renderCommentsList(list) {
    var ul = document.querySelector('#commentList');
    var cnt = document.querySelector('#commentCount');
    if (cnt) cnt.textContent = String(list.length);
    if (!ul) return;
    var canDel = !_cloudOn() || adminOk();
    if (!list.length) { ul.innerHTML = '<li class="comment-empty">' + t('comment.noComments') + '</li>'; return; }
    ul.innerHTML = list.map(function (c) {
      return '<li class="comment"><div class="comment-head"><span class="comment-author">' + esc(c.author) + '</span><span class="comment-date">' + esc(c.date || '') + '</span>' + (canDel ? '<button class="comment-del" data-cid="' + esc(c.id) + '">' + t('comment.delete') + '</button>' : '') + '</div><div class="comment-content">' + esc(c.content) + '</div></li>';
    }).join('');
    ul.querySelectorAll('.comment-del').forEach(function (b) {
      b.addEventListener('click', function () { deleteComment(post.id, b.getAttribute('data-cid')).then(renderCommentsList); });
    });
  }
}

function renderArchive() {
  var posts = sortPagePosts(getStaticPosts());
  var byYear = {};
  posts.forEach(function (p) {
    var yr = (p.date || '').slice(0, 4) || t('archive.unknown');
    var mo = Number((p.date || '').slice(5, 7) || 0);
    if (!byYear[yr]) byYear[yr] = {};
    if (!byYear[yr][mo]) byYear[yr][mo] = [];
    byYear[yr][mo].push(p);
  });
  var html = renderNav(currentRoute().path);
  html += '<main class="container page-fade"><h2 class="page-title">' + t('archive.title') + '</h2>';
  Object.keys(byYear).sort().reverse().forEach(function (yr) {
    html += '<div class="archive-year"><h2>' + esc(yr) + ' ' + t('archive.year') + '</h2>';
    Object.keys(byYear[yr]).sort(function (a, b) { return Number(b) - Number(a); }).forEach(function (mo) {
      var list = byYear[yr][mo];
      html += '<div class="archive-month"><h3>' + esc(mo) + ' ' + t('archive.month') + ' <span class="count">' + list.length + ' ' + t('archive.count') + '</span></h3><ul>';
      list.forEach(function (p) {
        html += '<li><a href="' + esc(href(postUrl(p.id))) + '">' + esc(p.title || '') + '</a></li>';
      });
      html += '</ul></div>';
    });
    html += '</div>';
  });
  html += '</main>' + renderFooter();
  return html;
}

function renderAbout() {
  var posts = getStaticPosts();
  var tags = {};
  var totalWords = 0;
  var latest = '';
  posts.forEach(function (p) {
    normalizeTags(p).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; });
    totalWords += stripMd(p.content || '').length;
    if (!latest || p.date > latest) latest = p.date;
  });
  var cfg = getConfig();
  var html = renderNav(currentRoute().path);
  html += '<main class="container page-fade"><h2 class="page-title">' + t('about.title') + '</h2><div class="about-card card">';
  // 站点简介：渲染「Qingyu'Blog：一个可以双击打开的原生 JS 博客」文章正文
  var intro = (posts || []).find(function (p) { return p.id === 'qingyu-blog-intro'; });
  if (intro && intro.content) {
    html += '<div class="article about-intro">' + renderMarkdown(intro.content) + '</div>';
  } else {
    html += '<h3>Qingyu\'Blog</h3><p>' + t('about.desc') + '</p>';
  }
  html += '<hr class="about-sep">';
  html += '<div class="stat-grid"><div class="stat"><b>' + posts.length + '</b><span>' + t('about.posts') + '</span></div><div class="stat"><b>' + Object.keys(tags).length + '</b><span>' + t('about.tags') + '</span></div><div class="stat"><b>' + totalWords + '</b><span>' + t('about.totalWords') + '</span></div><div class="stat"><b>' + esc(latest || '-') + '</b><span>' + t('about.latestUpdate') + '</span></div></div>';
  html += '<h3>' + t('about.version') + '</h3><p>v' + esc(BLOG_VERSION) + '</p><h3>' + t('about.dataMode') + '</h3><p>' + (_cloudOn() ? t('about.cloudMode') : t('about.staticMode')) + '</p><h3>' + t('about.firstUse') + '</h3><p>' + t('about.firstUseHint') + '</p>';
  html += '</div></main>' + renderFooter();
  return html;
}

function renderTags() {
  var posts = getStaticPosts();
  var counts = {};
  posts.forEach(function (p) {
    normalizeTags(p).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
  });
  var html = renderNav(currentRoute().path);
  html += '<main class="container page-fade"><h2 class="page-title">' + svgIcon('tag', 20) + ' ' + t('tags.title') + '</h2><div class="tag-cloud">';
  Object.keys(counts).sort().forEach(function (t) {
    html += '<a class="cloud-chip" href="' + esc(href('/', { tag: t })) + '">' + esc(t) + '<span class="cloud-count">' + counts[t] + '</span></a>';
  });
  html += '</div></main>' + renderFooter();
  return html;
}

/* ---------- 管理后台辅助函数 ---------- */
function adminRoute() {
  var path = currentRoute().path;
  if (path === '/write' || path === '/admin' || path === '/admin/write') return 'write';
  if (path === '/admin/posts') return 'posts';
  if (/^\/admin\/posts\/[^\/]+\/edit$/.test(path)) return 'edit';
  return 'write';
}

function getEditIdFromRoute() {
  var path = currentRoute().path;
  var match = path.match(/^\/admin\/posts\/([^\/]+)\/edit$/);
  if (!match) return null;
  // location.pathname 对中文/特殊字符 id 是百分号编码形式，必须解码后
  // 才能与 window.BLOG_POSTS 里的原始 id 匹配、并避免 apiFetch 二次编码 404
  try { return decodeURIComponent(match[1]); } catch (e) { return match[1]; }
}

function renderAdminSidebar(active) {
  var postCount = (getStaticPosts() || []).length;
  var isEdit = active === 'edit';
  return '<aside class="admin-sidebar">'
    + '<div class="admin-sidebar-brand">'
    + '<span class="admin-brand-badge">' + svgIcon('pen', 15) + '</span>'
    + '<span class="admin-brand-text">' + t('admin.brand') + '<span class="admin-sidebar-ver">v' + esc(BLOG_VERSION) + '</span></span>'
    + '</div>'
    + '<nav class="admin-sidebar-nav">'
    + '<div class="admin-nav-group">' + svgIcon('doc', 12) + ' ' + t('admin.nav.content') + '</div>'
    + '<a href="' + esc(href('/admin/posts')) + '" class="admin-nav-item' + (active === 'posts' || isEdit ? ' active' : '') + '">' + svgIcon('doc', 15) + '<span>' + t('admin.sidebar.allPosts') + '</span><span class="admin-nav-count">' + postCount + '</span></a>'
    + '<div class="admin-nav-group">' + svgIcon('pen', 12) + ' ' + t('admin.nav.write') + '</div>'
    + '<a href="' + esc(href('/admin/write')) + '" class="admin-nav-item' + (active === 'write' ? ' active' : '') + '">' + svgIcon('pen', 15) + '<span>' + t('editor.title') + '</span></a>'
    + '</nav>'
    + '<div class="admin-sidebar-footer">'
    + '<div class="admin-sidebar-mode">' + (_cloudOn() ? svgIcon('cloud', 12) + ' ' + t('editor.cloudMode') : svgIcon('file', 12) + ' ' + t('editor.localMode')) + '</div>'
    + '<button class="btn btn-ghost btn-logout" id="btnLogoutSidebar">' + svgIcon('logout', 14) + ' ' + t('admin.sidebar.logout') + '</button>'
    + '</div>'
    + '</aside>';
}

function renderPostList() {
  var posts = getStaticPosts();
  if (!posts || !posts.length) {
    return '<div class="admin-posts-header">'
      + '<div class="admin-head-titles"><h2>' + svgIcon('doc', 20) + ' ' + t('admin.postList.title') + '</h2><p class="admin-head-sub">' + t('admin.postList.emptyHint') + ' <a href="' + esc(href('/admin/write')) + '">' + t('editor.newPost') + '</a></p></div>'
      + '</div>';
  }
  var pinnedCount = posts.filter(function (p) { return p.pinned; }).length;
  var html = '<div class="admin-posts-header">'
    + '<div class="admin-head-titles"><h2>' + svgIcon('doc', 20) + ' ' + t('admin.postList.title') + '</h2><p class="admin-head-sub">' + t('admin.postList.desc') + '</p></div>'
    + '<a class="btn btn-primary btn-new-post" href="' + esc(href('/admin/write')) + '">' + svgIcon('pen', 14) + ' ' + t('editor.newPost') + '</a>'
    + '</div>';
  html += '<div class="admin-stats">'
    + '<div class="admin-stat"><span class="admin-stat-num">' + posts.length + '</span><span class="admin-stat-label">' + t('admin.postList.allStatus') + '</span></div>'
    + '<div class="admin-stat"><span class="admin-stat-num">' + pinnedCount + '</span><span class="admin-stat-label">' + t('admin.postList.pin') + '</span></div>'
    + '</div>';
  html += '<table class="admin-posts-table"><thead><tr><th>' + t('admin.postList.colTitle') + '</th><th>' + t('admin.postList.colDate') + '</th><th>' + t('admin.postList.colStatus') + '</th><th>' + t('admin.postList.colActions') + '</th></tr></thead><tbody>';
  posts.forEach(function (p) {
    var status = p.pinned ? svgIcon('pin', 12) + ' ' + t('admin.postList.pin') : t('post.published');
    var title = p.title || t('admin.postList.noTitle');
    html += '<tr>'
      + '<td class="post-title-cell"><a class="post-title-link" href="' + esc(href('/admin/posts/' + encodeURIComponent(p.id) + '/edit')) + '">' + esc(title) + svgIcon('external', 12) + '</a></td>'
      + '<td class="post-date-cell">' + esc(p.date || '') + '</td>'
      + '<td><span class="status-badge' + (p.pinned ? ' pinned' : '') + '">' + status + '</span></td>'
      + '<td><div class="post-actions">'
      + '<a href="' + esc(href('/admin/posts/' + encodeURIComponent(p.id) + '/edit')) + '" class="btn btn-sm">' + svgIcon('pen', 13) + ' ' + t('admin.postList.edit') + '</a>'
      + '<button class="btn btn-sm' + (p.pinned ? ' btn-on' : '') + '" data-pin-id="' + esc(p.id) + '" title="' + (p.pinned ? t('admin.postList.unpin') : t('admin.postList.pin')) + '">' + svgIcon('pin', 13) + ' ' + (p.pinned ? t('admin.postList.unpin') : t('admin.postList.pin')) + '</button>'
      + '<button class="btn btn-sm btn-danger" data-post-id="' + esc(p.id) + '" data-post-title="' + esc(title) + '">' + svgIcon('trash', 13) + ' ' + t('post.delete') + '</button>'
      + '</div></td>'
      + '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

/* ---------- 文章列表：置顶 ---------- */

/** 从本地列表取文章对象（含完整数据） */
function findPostForUpdate(id) {
  var arr = Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS : [];
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] && arr[i].id === id) return arr[i];
  }
  return null;
}

/** 云端：拉取文章详情（列表摘要不含 content/enc） */
async function fetchPostDetail(id) {
  var data = await apiFetch('api/posts/' + encodeURIComponent(id));
  return (data && data.post) ? data.post : null;
}

/** 云端：PUT 更新单篇。必须带全字段，否则 PUT 会以缺省值覆盖内容/密文/标签 */
async function savePostToCloud(post) {
  var body = {
    id: post.id,
    title: post.title || '',
    date: post.date || '',
    excerpt: post.excerpt || '',
    cover: post.cover || '',
    tags: Array.isArray(post.tags) ? post.tags : [],
    pinned: !!post.pinned,
    content: post.content || ''
  };
  await apiFetch('api/posts/' + encodeURIComponent(post.id), { method: 'PUT', body: JSON.stringify(body) });
}

/** 更新本地列表项；静态模式导出新 posts.js 供覆盖发布 */
function upsertLocalPost(post, exportStatic) {
  var arr = (Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS : []).slice();
  var idx = arr.findIndex(function (p) { return p && p.id === post.id; });
  if (idx >= 0) arr[idx] = post; else arr.push(post);
  window.BLOG_POSTS = arr;
  if (exportStatic) {
    var blob = new Blob(['window.BLOG_POSTS=' + JSON.stringify(arr, null, 2) + ';'], { type: 'application/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'posts.js';
    a.click();
    setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 3000);
  }
}

/** 列表页：切换置顶（云端 PUT / 静态改本地并导出） */
async function togglePinFromList(id) {
  var post = findPostForUpdate(id);
  if (!post) { alert(t('toast.notFound')); return; }
  var target = !post.pinned;
  try {
    if (_cloudOn()) {
      var full = await fetchPostDetail(id);   // 以云端详情为准（含最新内容/密文）
      if (full) post = full;
    }
  } catch (e) {
    alert(t('toast.networkError'));
    return;
  }
  post.pinned = target;
  if (_cloudOn()) {
    try {
      await savePostToCloud(post);
      upsertLocalPost(post, false);
      alert(target ? t('toast.pinnedCloud') : t('toast.unpinnedCloud'));
    } catch (e) {
      alert(t('toast.networkError'));
      return;
    }
  } else {
    upsertLocalPost(post, true);
    alert(target ? t('toast.pinnedLocal') : t('toast.unpinnedLocal'));
  }
  route();
}




function renderEditorBody() {
  var _editId = currentEditId();
  var _editPost = _editId ? getStaticPosts().find(function (p) { return p.id === _editId; }) : null;
  // 如果路由是编辑模式，使用路由中的 ID 覆盖
  if (adminRoute() === 'edit') {
    var routeId = getEditIdFromRoute();
    if (routeId) {
      _editId = routeId;
      _editPost = getStaticPosts().find(function (p) { return p.id === _editId; });
    }
  }
  var body = '';
  body += '<div class="write-head">'
    + '<h2 class="page-title wh-title">' + svgIcon('pen', 20) + ' ' + t('editor.title') + '</h2>'
    + (_cloudOn()
        ? '<span class="mode-chip cloud">' + svgIcon('cloud', 12) + ' ' + t('editor.cloudMode') + '</span>'
        : '<span class="mode-chip local">' + svgIcon('file', 12) + ' ' + t('editor.localMode') + '</span>')
    + (_editId ? '<span class="mode-chip editing" id="writeTitleHint">' + (_editPost ? esc(t('editor.editing') + '：' + (_editPost.title || '')) : t('editor.newPost')) + '</span>' : '')
    + '</div>';
  body += '<div class="card editor-meta"><div class="editor-grid">'
    + '<div class="field field-full"><label>' + t('editor.titlePlaceholder') + '</label><input type="text" id="titleInput" placeholder="' + t('editor.titlePlaceholder') + '"></div>'
    + '<div class="field"><label>' + t('editor.datePlaceholder') + '</label><div style="display:flex;gap:8px;align-items:center;"><input type="datetime-local" id="dateInput" style="flex:1;"><button class="btn btn-sm btn-ghost" id="btnToday" title="' + t('editor.setNow') + '" style="flex-shrink:0;padding:5px 10px;font-size:12px;">' + t('editor.today') + '</button></div></div>'
    + '<div class="field"><label>' + t('editor.tagsPlaceholder') + '</label><input type="text" id="tagInput" placeholder="' + t('editor.tagsExample') + '"></div>'
    + '<div class="field field-full"><label>' + t('editor.excerptPlaceholder') + '</label><input type="text" id="excerptInput" placeholder="' + t('editor.excerptHint') + '"></div>'
    + '<div class="field field-full"><label>' + t('editor.coverPlaceholder') + '</label><input type="text" id="coverInput" placeholder="' + t('editor.coverHint') + '"></div>'
    + '<div class="field check-label"><label><input type="checkbox" id="pinnedInput"> ' + svgIcon('pin', 13) + ' ' + t('editor.pin') + '</label></div>'
    + '</div></div>';
  body += '<div class="editor-wrap">'
    + '<section class="editor-pane"><div class="pane-head">' + svgIcon('pen', 13) + ' ' + t('editor.editing') + '<span class="pane-note">Markdown</span></div><div id="toolbar" class="toolbar">' + toolbarHtml() + '</div><textarea id="mdInput" class="md-input" rows="18" placeholder="' + t('editor.writeHint') + '"></textarea></section>'
    + '<section class="editor-pane preview-pane"><div class="pane-head">' + svgIcon('eye', 13) + ' ' + t('editor.preview') + '<span class="pane-note">' + t('editor.realtimeRender') + '</span></div><div class="write-preview article preview-body" id="previewPane"></div></section>'
    + '</div>';
  body += '<div class="editor-actions actions-bar">'
    + (_cloudOn() ? '<button class="btn btn-primary" id="btnCloud">' + svgIcon('cloud', 15) + ' ' + t('editor.cloudPublish') + '</button>' : '')
    + '<button class="btn btn-primary" id="btnSave">' + svgIcon('save', 15) + ' ' + t('editor.savePost') + '</button>'
    + '<span class="action-sep"></span>'
    + '<button class="btn" id="btnSaveDraft">' + svgIcon('upload', 15) + ' ' + t('editor.saveDraft') + '</button>'
    + '<button class="btn" id="btnImport">' + svgIcon('file', 15) + ' ' + t('editor.importMd') + '</button>'
    + '<input type="file" id="mdFileInput" accept=".md,.markdown" hidden>'
    + '<button class="btn" id="btnOpenMdEditor">' + svgIcon('external', 15) + ' ' + t('editor.officialEditor') + '</button>'
    + '<span class="action-sep"></span>'
    + '<button class="btn" id="btnExport">' + svgIcon('download', 15) + ' ' + t('editor.exportPosts') + '</button>'
    + '<button class="btn" id="btnExportAll" title="' + t('editor.exportAllTitle') + '">' + svgIcon('save', 15) + ' ' + t('editor.exportAll') + '</button>'
    + '<button class="btn" id="btnRss">' + svgIcon('rss', 15) + ' RSS</button>'
    + '<button class="btn" id="btnSitemap">' + svgIcon('sitemap', 15) + ' Sitemap</button>'
    + '<span class="actions-right"><span class="word-count" id="wordCount"></span><span class="save-status" id="saveStatus"></span>'
    + '<button class="btn btn-outline-danger btn-logout" id="btnClearData" title="' + t('editor.clearDataTitle') + '">' + svgIcon('trash', 14) + ' ' + t('editor.cleanData') + '</button>'
    + '<button class="btn btn-ghost btn-logout" id="btnLogout">' + svgIcon('logout', 15) + ' ' + t('editor.exitLogin') + '</button></span>'
    + '</div>';
  body += '<p class="keys-hint"><kbd>Ctrl</kbd>+<kbd>S</kbd> ' + t('editor.saveDraft') + ' · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> ' + t('editor.savePost') + '</p>';
  body += '<h3 class="draft-hint"><b>' + t('editor.exportAll') + ':</b> ' + t('editor.exportHint') + '</h3>';
  return body;
}

function renderWrite() {
  var html = renderNav(currentRoute().path);
  html += '<main class="container page-fade write-page">';
  if (!adminOk()) {
    if (_cloudOn()) {
      // 云端模式：密码校验于 Cloudflare D1 后端，此页只做登录（token 已存则直接进入编辑）
      html += '<div class="card gate-card">'
        + '<div class="gate-badge">' + svgIcon('lock', 26) + '</div>'
        + '<h3 class="gate-title">' + t('admin.login') + '</h3>'
        + '<p class="gate-sub">' + t('admin.loginHint') + '</p>'
        + '<div class="gate-form"><input type="password" id="gatePwd" placeholder="' + t('admin.pwdLabel') + '" autocomplete="current-password"><button class="btn btn-primary" id="btnGate">' + svgIcon('logout', 15) + ' ' + t('admin.loginBtn') + '</button></div>'
        + '<div class="gate-msg alert-strip" id="gateMsg"></div>'
        + '<div class="gate-foot"><a href="' + esc(href('/')) + '">' + t('admin.backHome') + '</a></div>'
        + '</div>';
    } else if (needAdminSetup()) {
      html += '<div class="card gate-card">'
        + '<div class="gate-badge">' + svgIcon('lock', 26) + '</div>'
        + '<h3 class="gate-title">' + t('admin.setupPwd') + '</h3>'
        + '<p class="gate-sub">' + t('admin.setupHint') + '</p>'
        + '<div class="gate-form"><input type="password" id="setupPwd" placeholder="' + t('admin.pwdLabel') + '" autocomplete="new-password"><button class="btn btn-primary" id="btnSetup">' + t('admin.setupBtn') + '</button></div>'
        + '<div class="gate-msg alert-strip" id="gateMsg"></div>'
        + '</div>';
    } else {
      html += '<div class="card gate-card">'
        + '<div class="gate-badge">' + svgIcon('lock', 26) + '</div>'
        + '<h3 class="gate-title">' + t('admin.loginTitle') + '</h3>'
        + '<p class="gate-sub">' + t('admin.loginDesc') + '</p>'
        + '<div class="gate-form"><input type="password" id="gatePwd" placeholder="' + t('admin.pwdLabel') + '" autocomplete="current-password"><button class="btn btn-primary" id="btnGate">' + t('admin.enterBtn') + '</button></div>'
        + '<div class="gate-msg alert-strip" id="gateMsg"></div>'
        + '<div class="gate-foot"><a href="' + esc(href('/')) + '">' + t('admin.backHome') + '</a></div>'
        + '<p class="gate-hint">' + t('admin.hint') + '</p>'
        + '</div>';
    }
    html += '</main>' + renderFooter();
    app().innerHTML = html;
    var btnSetup = document.querySelector('#btnSetup');
    if (btnSetup) btnSetup.addEventListener('click', async function () {
      var inp = document.querySelector('#setupPwd');
      var msg = document.querySelector('#gateMsg');
      if (!inp) return;
      if (await setupAdmin(inp.value)) { route(); }
      else if (msg) msg.textContent = t('admin.pwdTooShort');
    });
    var btnGate = document.querySelector('#btnGate');
    if (btnGate) btnGate.addEventListener('click', async function () {
      var inp = document.querySelector('#gatePwd');
      var msg = document.querySelector('#gateMsg');
      if (!inp || !inp.value) { if (msg) msg.textContent = t('admin.pwdRequired'); return; }
      if (_cloudOn()) {
        // 加载态：防重复提交，spinner 反馈
        var orig = btnGate.innerHTML;
        btnGate.disabled = true;
        btnGate.innerHTML = svgIcon('spinner', 14) + ' ' + t('admin.logging');
        cloudLogin(inp.value).then(function (r) {
          btnGate.disabled = false;
          btnGate.innerHTML = orig;
          if (r.ok) {
            if (r.mustChange) {
              // 首次部署自动初始化：显示默认密码 + 跳转强制改密
              if (r.defaultPassword) {
                if (msg) { msg.className = 'gate-msg alert-strip ok'; msg.textContent = t('admin.defaultPwdHint') + r.defaultPassword + t('admin.changeHint'); }
              }
              setTimeout(function () { route(); }, 800);
            } else {
              route();
            }
          }
          else {
            if (msg) msg.textContent = r.message || t('admin.wrongPwd');
            try { inp.focus(); inp.select(); } catch (e2) {}
          }
        });
      } else if (await tryAdmin(inp.value)) { route(); }
      else if (msg) msg.textContent = t('admin.wrongPwd');
    });
    // 回车即提交 + 自动聚焦密码框
    [['#setupPwd', '#btnSetup'], ['#gatePwd', '#btnGate']].forEach(function (pair) {
      var inp = document.querySelector(pair[0]);
      var btn = document.querySelector(pair[1]);
      if (inp && btn) {
        inp.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter') { ev.preventDefault(); btn.click(); }
        });
        try { inp.focus(); } catch (e) {}
      }
    });
    return;
  }
  var _editId = currentEditId();
  var _editPost = _editId ? getStaticPosts().find(function (p) { return p.id === _editId; }) : null;
  // 顶栏：页面标题 + 模式徽章 + 编辑状态，层次一目了然
  // 复用 renderEditorBody（与 /admin 后台编辑器同源，避免两份模板漂移）
  html += renderEditorBody();
  html += '</main>' + renderFooter();
  app().innerHTML = html;

  var editId = currentEditId();
  if (editId) {
    var post = getStaticPosts().find(function (p) { return p.id === editId; });
    if (post) {
      var title = document.querySelector('#titleInput'); if (title) title.value = post.title || '';
      var date = document.querySelector('#dateInput'); if (date) date.value = toDateTimeLocal(post.date || '');
      var tags = document.querySelector('#tagInput'); if (tags) tags.value = (post.tags || []).join(', ');
      var excerpt = document.querySelector('#excerptInput'); if (excerpt) excerpt.value = post.excerpt || '';
      var cover = document.querySelector('#coverInput'); if (cover) cover.value = post.cover || '';
      var pin = document.querySelector('#pinnedInput'); if (pin) pin.checked = !!post.pinned;
      var md = document.querySelector('#mdInput');
      if (md) {
        if (_cloudOn()) {
          // 云端模式：始终以云端最新正文为准（本地静态旧正文不算数），先占位再由 loadEditContent 拉取覆盖
          md.value = '';
          md.placeholder = t('editor.loadingCloud');
        } else {
          md.value = post.content || '';
        }
      }
      var st = document.querySelector('#saveStatus'); if (st) st.textContent = t('editor.editingStatus') + (post.title || '');
      // also update page title for tests
      var hTitle = document.querySelector('#writeTitleHint'); if (hTitle) hTitle.textContent = t('editor.editingStatus') + (post.title || '');
      updatePreview();
      loadEditContent(post, editId);
    }
  }
  // else：新建文章 —— 保持干净的空白页，不自动恢复历史草稿/上次发布内容
  updatePreview();
  bindWriteEvents();
}
function toolbarHtml() {
  return ['bold', 'italic', 'code', 'h2', 'link', 'img', 'quote', 'ul', 'ol', 'fence'].map(function (cmd) {
    var icons = { bold: 'B', italic: 'I', code: '<>', h2: 'H2', link: svgIcon('link', 13), img: svgIcon('image', 13), quote: svgIcon('quote', 13), ul: '•', ol: '1.', fence: '```' };
    return '<button type="button" class="tb-btn" data-cmd="' + cmd + '" title="' + cmd + '">' + (icons[cmd] || cmd) + '</button>';
  }).join('');
}

/** 当前编辑的文章别名：来自路由 /posts/<别名>/edit 或 ?edit= */
function currentEditId() {
  var r = currentRoute();
  if (r.path.indexOf('/posts/') === 0) {
    var seg = r.path.slice('/posts/'.length).split('/');
    if (seg[1] === 'edit' && seg[0]) {
      try { return decodeURIComponent(seg[0]); } catch (e) { return seg[0]; }
    }
  }
  var q = r.query;
  return (q && q.edit) || '';
}

function autoGrowMd() {
  var md = document.querySelector('#mdInput');
  if (!md) return;
  try {
    md.style.height = 'auto';
    var max = Math.max(window.innerHeight ? Math.floor(window.innerHeight * 0.7) : 600, 360);
    md.style.height = Math.min(md.scrollHeight, max) + 'px';
  } catch (e) {}
}

function updatePreview() {
  var md = document.querySelector('#mdInput');
  var pv = document.querySelector('#previewPane');
  if (!md || !pv) return;
  pv.innerHTML = renderMarkdown(md.value || '');
  var wc = document.querySelector('#wordCount');
  if (wc) wc.textContent = stripMd(md.value || '').length + ' ' + t('editor.wordUnit');
  autoGrowMd();
}

/** 云端模式编辑：/api/posts 列表只返回摘要（无 content），编辑时须按 id 拉取云端全文。
 *  云端是权威数据源：即使本地静态 posts.js 有旧正文，也一律用云端最新内容覆盖（拉取失败才保留本地）。 */
function loadEditContent(post, editId) {
  if (!post || !_cloudOn()) return;
  var st = document.querySelector('#saveStatus');
  if (st) st.textContent = t('editor.loadingCloud');
  apiFetch('api/posts/' + encodeURIComponent(editId))
    .then(function (data) {
      var full = (data && data.post) || null;
      if (full) {
        if (full.content !== undefined) post.content = full.content;
      }
      var md = document.querySelector('#mdInput');
      if (md) { md.value = post.content || ''; md.placeholder = ''; }
      updatePreview();
      if (st) st.textContent = t('editor.editingStatus') + (post.title || '');
    })
    .catch(function () {
      // 拉取失败：回退到本地静态内容（如有），避免编辑器空白
      var md = document.querySelector('#mdInput');
      if (md && !md.value) { md.value = post.content || ''; md.placeholder = ''; }
      updatePreview();
      if (st) st.textContent = t('editor.loadFailLocal');
    });
}

function bindWriteEvents() {
  var md = document.querySelector('#mdInput');
  if (md) md.addEventListener('input', function () {
    updatePreview();
    autoGrowMd();
    var st = document.querySelector('#saveStatus');
    if (st) st.textContent = t('editor.unsaved');
  });

  // “用官方编辑器”辅助按钮：新标签打开 markdown.com.cn 编辑器（跨域无法内嵌同步）
  var btnMd = document.querySelector('#btnOpenMdEditor');
  if (btnMd) btnMd.addEventListener('click', function () {
    try {
      var mdInput = document.querySelector('#mdInput');
      var u = 'https://markdown.com.cn/editor/';
      var q = encodeURIComponent((mdInput && mdInput.value) || '');
      if (q) u += '?md=' + q;
      window.open(u, '_blank');
    } catch (e) {}
  });

  document.querySelectorAll('#toolbar [data-cmd]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cmd = btn.getAttribute('data-cmd');
      var ta = document.querySelector('#mdInput');
      if (!ta) return;
      var selStart = ta.selectionStart || 0;
      var selEnd = ta.selectionEnd || 0;
      var val = ta.value;
      var selected = val.slice(selStart, selEnd) || t('editor.textBtn');
      var insert = '';
      var offset = 0;
      switch (cmd) {
        case 'bold': insert = '**' + selected + '**'; offset = 2; break;
        case 'italic': insert = '*' + selected + '*'; offset = 1; break;
        case 'code': insert = '`' + selected + '`'; offset = 1; break;
        case 'h2': insert = '## ' + selected; offset = 3; break;
        case 'link': insert = '[' + selected + '](https://)'; offset = selected.length + 1; break;
        case 'img': insert = '![' + selected + '](https://)'; offset = selected.length + 2; break;
        case 'quote': insert = '> ' + selected; offset = 2; break;
        case 'ul': insert = '- ' + selected; offset = 2; break;
        case 'ol': insert = '1. ' + selected; offset = 3; break;
        case 'fence': insert = '\n```\n' + selected + '\n```\n'; offset = 4; break;
        default: insert = selected;
      }
      var newVal = val.slice(0, selStart) + insert + val.slice(selEnd);
      ta.value = newVal;
      ta.focus();
      var pos = selStart + offset;
      ta.setSelectionRange(pos, pos + selected.length);
      updatePreview();
      var st = document.querySelector('#saveStatus');
      if (st) st.textContent = t('editor.unsaved');
    });
  });

  var btnSave = document.querySelector('#btnSave');
  if (btnSave) btnSave.addEventListener('click', function () { saveStaticArticle(); });

  var btnCloud = document.querySelector('#btnCloud');
  if (btnCloud) btnCloud.addEventListener('click', function () { cloudPublish(); });

  var btnExport = document.querySelector('#btnExport');
  if (btnExport) btnExport.addEventListener('click', function () {
    saveFileFriendly('posts.js', buildPostsJs(), t('export.exported') + ' posts.js', t('export.downloaded') + ' posts.js');
  });

  var btnRss = document.querySelector('#btnRss');
  if (btnRss) btnRss.addEventListener('click', function () {
    saveFileFriendly('feed.xml', buildFeedXmlClient(getStaticPosts(), 20), t('export.exported') + ' feed.xml', t('export.downloaded') + ' feed.xml');
  });

  var btnSitemap = document.querySelector('#btnSitemap');
  if (btnSitemap) btnSitemap.addEventListener('click', function () {
    saveFileFriendly('sitemap.xml', buildSitemapClient(), t('export.exported') + ' sitemap.xml', t('export.downloaded') + ' sitemap.xml');
  });

  // 一键导出全部：posts.js + feed.xml + sitemap.xml 三件套一次导出（静态发布只需覆盖这三个文件）
  var btnExportAll = document.querySelector('#btnExportAll');
  if (btnExportAll) btnExportAll.addEventListener('click', function () {
    saveFileFriendly('posts.js', buildPostsJs(), t('export.exported') + ' posts.js', t('export.downloaded') + ' posts.js');
    saveFileFriendly('feed.xml', buildFeedXmlClient(getStaticPosts(), 20), t('export.exported') + ' feed.xml', t('export.downloaded') + ' feed.xml');
    saveFileFriendly('sitemap.xml', buildSitemapClient(), t('export.exported') + ' sitemap.xml', t('export.downloaded') + ' sitemap.xml');
  });

  // 退出登录：清除本地会话（云端同时撤销服务端 token），回到登录门
  var btnLogout = document.querySelector('#btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', async function () {
    await adminLogout();
    route();
  });

  var btnClearData = document.querySelector('#btnClearData');
  if (btnClearData) btnClearData.addEventListener('click', function () {
    if (!confirm(t('editor.clearConfirm'))) return;
    // 仅清空编辑器表单，保留登录态和所有存储数据
    var title = document.querySelector('#titleInput');
    var date = document.querySelector('#dateInput');
    var tags = document.querySelector('#tagInput');
    var excerpt = document.querySelector('#excerptInput');
    var md = document.querySelector('#mdInput');
    var preview = document.querySelector('#previewPane');
    var wordCount = document.querySelector('#wordCount');
    var hint = document.querySelector('#writeTitleHint');
    if (title) title.value = '';
    if (date) date.value = '';
    if (tags) tags.value = '';
    if (excerpt) excerpt.value = '';
    if (md) { md.value = ''; md.dispatchEvent(new Event('input')); }
    if (preview) preview.innerHTML = '';
    if (wordCount) wordCount.textContent = '0 ' + t('editor.wordUnit');
    if (hint) hint.textContent = t('editor.newPost');
    // 清除当前编辑 id（如有），重置为新文章状态
    localStorage.removeItem('qingyu.edit.id');
  });

  var btnToday = document.querySelector('#btnToday');
  if (btnToday) {
    btnToday.addEventListener('click', function () {
      var input = document.querySelector('#dateInput');
      if (!input) return;
      var now = new Date();
      var year = now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, '0');
      var day = String(now.getDate()).padStart(2, '0');
      var hours = String(now.getHours()).padStart(2, '0');
      var minutes = String(now.getMinutes()).padStart(2, '0');
      input.value = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
      // 同步触发预览更新（如果有）
      if (typeof previewContent === 'function') previewContent();
    });
  }

  var btnDraft = document.querySelector('#btnSaveDraft');
  if (btnDraft) btnDraft.addEventListener('click', function () { saveDraft(); });

  var btnImport = document.querySelector('#btnImport');
  var fileInput = document.querySelector('#mdFileInput');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var parsed = parseMdFile(String(e.target.result || ''), file.name);
        var title = document.querySelector('#titleInput'); if (title) title.value = parsed.title;
        var date = document.querySelector('#dateInput'); if (date) date.value = parsed.date;
        var tags = document.querySelector('#tagInput'); if (tags) tags.value = parsed.tags.join(', ');
        var excerpt = document.querySelector('#excerptInput'); if (excerpt) excerpt.value = parsed.excerpt || '';
        var md2 = document.querySelector('#mdInput'); if (md2) md2.value = parsed.content;
        updatePreview();
      };
      reader.readAsText(file);
    });
  }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveStaticArticle(); }
  });
}

/* ---------- 管理后台：侧边栏 + 文章列表 ---------- */
function renderAdmin() {
  var html = renderNav(currentRoute().path);
  html += '<main class="container page-fade write-page">';
  
  if (!adminOk()) {
    // 未登录：复用 renderWrite 的登录逻辑
    renderWrite();
    return;
  }
  
  var route = adminRoute();
  var sidebar = renderAdminSidebar(route);
  html += '<div class="admin-layout">' + sidebar + '<div class="admin-content">';
  
  if (route === 'posts') {
    html += renderPostList();
  } else {
    html += renderEditorBody();
  }
  
  html += '</div></div>';
  html += '</main>' + renderFooter();
  app().innerHTML = html;
  
  // --- 绑定编辑器事件（与 renderWrite 保持一致） ---
  var btnClearData = document.querySelector('#btnClearData');
  if (btnClearData) btnClearData.addEventListener('click', function () {
    if (!confirm(t('editor.clearConfirm'))) return;
    var title = document.querySelector('#titleInput');
    var date = document.querySelector('#dateInput');
    var tags = document.querySelector('#tagInput');
    var excerpt = document.querySelector('#excerptInput');
    var md = document.querySelector('#mdInput');
    var preview = document.querySelector('#previewPane');
    var wordCount = document.querySelector('#wordCount');
    var hint = document.querySelector('#writeTitleHint');
    if (title) title.value = '';
    if (date) date.value = '';
    if (tags) tags.value = '';
    if (excerpt) excerpt.value = '';
    if (md) { md.value = ''; md.dispatchEvent(new Event('input')); }
    if (preview) preview.innerHTML = '';
    if (wordCount) wordCount.textContent = '0 ' + t('editor.wordUnit');
    if (hint) hint.textContent = t('editor.newPost');
    localStorage.removeItem('qingyu.edit.id');
  });

  var btnToday = document.querySelector('#btnToday');
  if (btnToday) {
    btnToday.addEventListener('click', function () {
      var input = document.querySelector('#dateInput');
      if (!input) return;
      var now = new Date();
      var year = now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, '0');
      var day = String(now.getDate()).padStart(2, '0');
      var hours = String(now.getHours()).padStart(2, '0');
      var minutes = String(now.getMinutes()).padStart(2, '0');
      input.value = year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
      if (typeof previewContent === 'function') previewContent();
    });
  }

  var btnDraft = document.querySelector('#btnSaveDraft');
  if (btnDraft) btnDraft.addEventListener('click', function () { saveDraft(); });

  var btnImport = document.querySelector('#btnImport');
  var fileInput = document.querySelector('#mdFileInput');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var parsed = parseMdFile(String(e.target.result || ''), file.name);
        var title = document.querySelector('#titleInput'); if (title) title.value = parsed.title;
        var date = document.querySelector('#dateInput'); if (date) date.value = parsed.date;
        var tags = document.querySelector('#tagInput'); if (tags) tags.value = parsed.tags.join(', ');
        var excerpt = document.querySelector('#excerptInput'); if (excerpt) excerpt.value = parsed.excerpt || '';
        var md2 = document.querySelector('#mdInput'); if (md2) md2.value = parsed.content;
        updatePreview();
      };
      reader.readAsText(file);
    });
  }

  var btnSave = document.querySelector('#btnSave');
  if (btnSave) btnSave.addEventListener('click', function () { saveStaticArticle(); });

  var btnCloud = document.querySelector('#btnCloud');
  if (btnCloud) btnCloud.addEventListener('click', function () { cloudPublish(); });

  var btnExport = document.querySelector('#btnExport');
  if (btnExport) btnExport.addEventListener('click', function () {
    saveFileFriendly('posts.js', buildPostsJs(), t('export.exported') + ' posts.js', t('export.downloaded') + ' posts.js');
  });

  var btnRss = document.querySelector('#btnRss');
  if (btnRss) btnRss.addEventListener('click', function () {
    saveFileFriendly('feed.xml', buildFeedXmlClient(getStaticPosts(), 20), t('export.exported') + ' feed.xml', t('export.downloaded') + ' feed.xml');
  });

  var btnSitemap = document.querySelector('#btnSitemap');
  if (btnSitemap) btnSitemap.addEventListener('click', function () {
    saveFileFriendly('sitemap.xml', buildSitemapClient(), t('export.exported') + ' sitemap.xml', t('export.downloaded') + ' sitemap.xml');
  });

  // 一键导出全部：posts.js + feed.xml + sitemap.xml 三件套一次导出（静态发布只需覆盖这三个文件）
  var btnExportAll = document.querySelector('#btnExportAll');
  if (btnExportAll) btnExportAll.addEventListener('click', function () {
    saveFileFriendly('posts.js', buildPostsJs(), t('export.exported') + ' posts.js', t('export.downloaded') + ' posts.js');
    saveFileFriendly('feed.xml', buildFeedXmlClient(getStaticPosts(), 20), t('export.exported') + ' feed.xml', t('export.downloaded') + ' feed.xml');
    saveFileFriendly('sitemap.xml', buildSitemapClient(), t('export.exported') + ' sitemap.xml', t('export.downloaded') + ' sitemap.xml');
  });

  var btnLogout = document.querySelector('#btnLogout');
  if (btnLogout) btnLogout.addEventListener('click', async function () {
    await adminLogout();
    route();
  });

  // 侧边栏退出按钮
  var btnLogoutSidebar = document.querySelector('#btnLogoutSidebar');
  if (btnLogoutSidebar) btnLogoutSidebar.addEventListener('click', async function () {
    await adminLogout();
    route();
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDraft(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveStaticArticle(); }
  });

  // 文章列表操作按钮（事件委托）：置顶、删除
  var content = document.querySelector('.admin-content');
  if (content) {
    content.addEventListener('click', function (e) {
      var pinBtn = e.target.closest('[data-pin-id]');
      if (pinBtn) { togglePinFromList(pinBtn.dataset.pinId); return; }
      var btn = e.target.closest('.btn-danger[data-post-id]');
      if (!btn) return;
      var id = btn.dataset.postId;
      var title = btn.dataset.postTitle || t('admin.postList.noTitle');
      if (!confirm(t('admin.postList.deleteConfirm', { title: title }))) return;
      if (_cloudOn()) {
        // 删除走 /api/posts/:id 的 DELETE（携带会话 token；旧代码误用 /api/admin/posts/:id 返回 404）
        apiFetch('api/posts/' + encodeURIComponent(id), { method: 'DELETE', body: '{}' }).then(function (res) {
          if (res && res.ok) {
            // 同步移除本地列表项，删除后列表立即生效（无需刷新）
            clearPostCache(id);   // 已删除：清除详情缓存
            var arr = window.BLOG_POSTS;
            if (Array.isArray(arr)) {
              window.BLOG_POSTS = arr.filter(function (p) { return p && p.id !== id; });
            }
            alert(t('admin.postList.deletedOk'));
            route();
          } else {
            alert(t('admin.postList.deleteFailRetry'));
          }
        }).catch(function () {
          alert(t('admin.postList.deleteFailNetwork'));
        });
      } else {
        var posts = getStaticPosts();
        var idx = posts.findIndex(function (p) { return p.id === id; });
        if (idx >= 0) {
          posts.splice(idx, 1);
          clearPostCache(id);   // 已删除：清除详情缓存
          var blob = new Blob(['window.BLOG_POSTS=' + JSON.stringify(posts, null, 2) + ';'], { type: 'application/javascript' });
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'posts.js';
          a.click();
          // 延迟释放 URL：立即 revoke 会让部分浏览器（尤其 file://）取消下载，导致「删了却导出不了」
          setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 3000);
          alert(t('admin.postList.deleteSuccessLocal'));
          route();
        } else {
          alert(t('toast.notFound'));
        }
      }
    });
  }

  // 加载编辑数据（/admin/posts/:id/edit 路由下 currentEditId() 解析不到，需用 getEditIdFromRoute 兜底）
  var editId = currentEditId() || getEditIdFromRoute();
  if (editId) {
    var post = getStaticPosts().find(function (p) { return p.id === editId; });
    if (post) {
      var title = document.querySelector('#titleInput'); if (title) title.value = post.title || '';
      var date = document.querySelector('#dateInput'); if (date) date.value = toDateTimeLocal(post.date || '');
      var tags = document.querySelector('#tagInput'); if (tags) tags.value = (post.tags || []).join(', ');
      var excerpt = document.querySelector('#excerptInput'); if (excerpt) excerpt.value = post.excerpt || '';
      var cover = document.querySelector('#coverInput'); if (cover) cover.value = post.cover || '';
      var pin = document.querySelector('#pinnedInput'); if (pin) pin.checked = !!post.pinned;
      var md = document.querySelector('#mdInput');
      if (md) {
        if (_cloudOn()) {
          // 云端模式：始终以云端最新正文为准，先占位再由 loadEditContent 拉取覆盖
          md.value = '';
          md.placeholder = t('editor.loadingCloud');
        } else {
          md.value = post.content || '';
        }
      }
      var st = document.querySelector('#saveStatus'); if (st) st.textContent = t('editor.editingStatus') + (post.title || '');
      var hTitle = document.querySelector('#writeTitleHint'); if (hTitle) hTitle.textContent = t('editor.editingStatus') + (post.title || '');
      updatePreview();
      loadEditContent(post, editId);
    }
  }
  // else：新建文章 —— 保持干净的空白页，不自动恢复历史草稿/上次发布内容
  // 绑定编辑器交互：正文实时预览、工具栏插入语法、官方编辑器按钮
  // （renderWrite 在内部调用，这里必须补上，否则后台编辑器无响应）
  bindWriteEvents();
}

/** 把库内日期（YYYY-MM-DD 或 YYYY-MM-DD HH:mm）转为 datetime-local 值（YYYY-MM-DDTHH:mm） */
function toDateTimeLocal(v) {
  var s = String(v || '').trim();
  var m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (m) return m[1] + 'T' + (m[2] ? (m[2].length === 1 ? '0' + m[2] : m[2]) + ':' + m[3] : '00:00');
  return s;
}

function collectEditor() {
  var title = document.querySelector('#titleInput'); if (!title) return null;
  var date = document.querySelector('#dateInput');
  var tags = document.querySelector('#tagInput');
  var excerpt = document.querySelector('#excerptInput');
  var cover = document.querySelector('#coverInput');
  var pin = document.querySelector('#pinnedInput');
  var md = document.querySelector('#mdInput');
  // 日期：datetime-local 值形如 "2025-01-01T08:30"；存库统一 "YYYY-MM-DD HH:mm"
  var dv = String((date && date.value) || '').replace('T', ' ');
  if (!dv) {
    // 未填写时用本地时间（toISOString 是 UTC，东八区凌晨会错到前一天）
    var now = new Date();
    var pad2 = function (n) { return String(n).padStart(2, '0'); };
    dv = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate()) + ' '
      + pad2(now.getHours()) + ':' + pad2(now.getMinutes());
  }
  return {
    title: title.value || t('admin.postList.noTitle'),
    date: dv,
    tags: String((tags && tags.value) || '').split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean),
    excerpt: (excerpt && excerpt.value) || '',
    cover: String((cover && cover.value) || '').trim(),
    pinned: !!(pin && pin.checked),
    content: md ? md.value : ''
  };
}




function saveDraft() {
  var d = collectEditor();
  if (!d) return;
  var editId = currentEditId();
  var id = editId || (d.title ? slugify(d.title) : 'draft');
  saveDraftToStore(id, d);
  var st = document.querySelector('#saveStatus');
  if (st) st.textContent = t('editor.savedDraft');
}

function saveStaticArticle() {
  var d = collectEditor();
  if (!d) return;
  var editId = currentEditId();
  var id = editId || (d.title ? slugify(d.title) : 'draft');
  d.id = id;
  saveDraftToStore('__new', d);
  var st2 = document.querySelector('#saveStatus');
  if (st2) st2.textContent = t('editor.savedLocal');
}

/** 云端发布（新建 POST / 编辑 PUT），成功后同步本地列表（首页无需刷新即可见）。
 *  /write、/posts/:id/edit、/admin、/admin/posts/:id/edit 共用。 */
async function cloudPublish() {
  var d = collectEditor();
  if (!d) return;
  // /admin/posts/:id/edit 下 currentEditId() 解析不到，需 getEditIdFromRoute 兜底，否则误用 POST 报 409
  var editId = currentEditId() || getEditIdFromRoute();
  var id = editId || (d.title ? slugify(d.title) : 'draft');
  d.id = id;
  var st = document.querySelector('#saveStatus');
  if (st) st.textContent = t('editor.publishing');
  try {
    // 新建用 POST，编辑用 PUT（幂等）
    var method = editId ? 'PUT' : 'POST';
    await apiFetch('api/posts' + (editId ? '/' + encodeURIComponent(editId) : ''), {
      method: method,
      body: JSON.stringify(d)
    });
    // 发布成功后回填文章并同步本地列表（首页立即可见）
    clearPostCache(d.id);   // 内容已更新：清掉旧缓存，下次进入直接拉新
    saveDraftToStore('__new', d);
    var arr = (Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS : []).slice();
    var idx = arr.findIndex(function (p) { return p && p.id === d.id; });
    if (idx >= 0) arr[idx] = d; else arr.push(d);
    window.BLOG_POSTS = arr;
    if (st) st.innerHTML = svgIcon('check', 14) + ' ' + t('editor.publishedCloud');
  } catch (e) {
    var em = (e && e.message) || t('editor.unknownError');
    // 会话过期/无效：清掉本地旧 token，跳回登录页重新拿新令牌
    if (/401/.test(em)) {
      _setSessionToken('');
      _setAdminSession(false);
      if (st) st.textContent = t('editor.loginExpired');
      setTimeout(function () { route(); }, 900);
      return;
    }
    if (st) st.textContent = t('editor.saveFail') + '：' + em;
  }
}

/* 注：云端 feed.xml / sitemap.xml 由 /api/feed.xml、/api/sitemap.xml 实时从 D1 生成，
 * 前端不再需要回传产物到 site_files（原 syncSiteFilesToCloud 已移除，避免无用的 D1 写入）。 */

function buildSitemapClient() {
  var cfg = getConfig();
  var base = cfg.siteUrl || (typeof location !== 'undefined' ? location.origin : '');
  base = String(base || '').replace(/\/+$/, '');
  var posts = sortPagePosts(getStaticPosts());
  var lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  lines.push('  <url><loc>' + esc(base + '/') + '</loc></url>');
  lines.push('  <url><loc>' + esc(base + '/about') + '</loc></url>');
  lines.push('  <url><loc>' + esc(base + '/archive') + '</loc></url>');
  posts.forEach(function (p) {
    lines.push('  <url><loc>' + esc(base + postUrl(p.id)) + '</loc><lastmod>' + esc(p.date || '') + '</lastmod></url>');
  });
  lines.push('</urlset>', '');
  return lines.join('\n');
}

/* ---------- 路由 ----------
 * 干净路径路由（history 模式，无 hash）：
 *   /                首页
 *   /archive         归档
 *   /about           关于
 *   /tags            标签
 *   /admin / /write  写作后台
 *   /posts/<别名>/    文章详情（带尾斜杠）
 *   /posts/<别名>/edit  编辑该文章（写作后台）
 * 本地 file:// 打开时退化为 hash 模式（#/…），双击 index.html 仍可用。
 */
function appRoot() {
  // 历史（干净路径）模式一律部署在站点根，返回 ''。
  // 若确实要挂在子路径（如 /blog ），请在此返回 '/blog' 并确保服务器相应回退。
  return '';
}
function useHashMode() {
  // 本地 file:// 直开 index.html 时走 hash 路由（无服务器回退干净路径）
  return typeof location !== 'undefined' && location.protocol === 'file:';
}
/** 解析当前路由：history 模式读 pathname+search，hash 模式读 location.hash */
function currentRoute() {
  var raw = '';
  if (useHashMode()) {
    var h = String(location.hash || '#/').replace(/^#/, '');
    raw = h || '/';
  } else {
    raw = ((location.pathname || '/') + (location.search || '')).slice((appRoot() || '').length) || '/';
  }
  var parts = String(raw).split('?');
  var path = parts[0] || '/';
  if (path.length > 1 && path.charAt(path.length - 1) === '/') path = path.slice(0, -1); // 去尾斜杠
  if (!path) path = '/';
  var query = {};
  if (parts[1]) {
    parts[1].split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) { try { query[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } catch (e) {} }
    });
  }
  return { path: path, query: query };
}
/** 生成可放入 <a href> 的站内地址 */
function href(path, query) {
  var q = '';
  if (query) {
    var kv = Object.keys(query).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]); });
    if (kv.length) q = '?' + kv.join('&');
  }
  if (useHashMode()) return '#/' + String(path).replace(/^\//, '') + q;
  return appRoot() + String(path) + q;
}
/** 文章地址：统一 /posts/<别名>/ 形式（带尾斜杠） */
function postUrl(id) {
  return '/posts/' + encodeURIComponent(id) + '/';
}
/** 跳转：history 模式用 pushState，hash 模式用 hash 赋值 */
function navigate(path, query) {
  // 去掉任何残留的 ?查询 / #片段，避免路径出现双重 ?（如 #/?page=2?）
  path = String(path || '/').replace(/[?#].*$/, '');
  if (useHashMode()) {
    location.hash = '#/' + path.replace(/^\//, '') + (query ? serializeQuery(query) : '');
  } else {
    try {
      history.pushState({}, '', appRoot() + path + (query ? serializeQuery(query) : ''));
    } catch (e) {}
  }
  route();
}
function serializeQuery(query) {
  var kv = Object.keys(query || {}).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(query[k]); });
  return kv.length ? '?' + kv.join('&') : '';
}
/** 旧 hash 里解析查询（编辑文章等），兼容两种情况 */
function parseQuery(source) {
  var q = {};
  var str = String(source != null ? source : (useHashMode() ? location.hash : location.search));
  var m = str.match(/[?&]([^=]+)=([^&]*)/g);
  if (m) m.forEach(function (kv) {
    var p = kv.replace(/^[?&]/, '').split('=');
    try { q[decodeURIComponent(p[0])] = decodeURIComponent(p[1]); } catch (e) {}
  });
  return q;
}

var _i18nReady = false;
async function route() {
  _searchOpen = false;   // 进入新页面时收起顶部搜索
  _featuredCache = null; // 清除精选缓存，确保每页重新计算
  // 首次路由时加载语言文件（同步读 localStorage，异步加载 JSON）
  if (!_i18nReady && window.__i18n && window.__i18n.loadLocale) {
    await window.__i18n.loadLocale(window.__i18n.getLocale());
    _i18nReady = true;
  }
  var r = currentRoute();
  var path = r.path;
  var q = r.query;

  if (path === '/') { app().innerHTML = renderHome(); }
  else if (path.indexOf('/posts/') === 0) {
    // /posts/<别名>/  或  /posts/<别名>/edit
    var rest = path.slice('/posts/'.length); // 已去尾斜杠
    var seg = rest.split('/');
    var id = '';
    var editing = false;
    if (seg[0] === 'edit') { id = ''; editing = true; }
    else if (seg.length >= 1) {
      try { id = decodeURIComponent(seg[0] || ''); } catch (e) { id = seg[0] || ''; }
      editing = seg[1] === 'edit';
    }
    if (editing) {
      // 编辑文章：交给新版后台管理 UI（存在时）；否则回退旧编辑器
      if (window.QingyuAdmin && window.QingyuAdmin.mount) {
        window.QingyuAdmin.mount(app(), id ? '/posts/' + encodeURIComponent(id) + '/edit' : '/admin/posts/new');
      } else {
        renderWrite(id);
      }
    } else {
      await renderPost(id);
    }
  }
  else if (path === '/write' || path === '/admin' || path.indexOf('/admin/') === 0) {
    // 后台管理 UI：交给新版模块（存在时）；否则回退旧 admin 渲染，保证逻辑不变
    if (window.QingyuAdmin && window.QingyuAdmin.mount) {
      window.QingyuAdmin.mount(app(), path);
    } else {
      renderAdmin();
    }
  }
  else if (path === '/archive') { app().innerHTML = renderArchive(); }
  else if (path === '/about') { app().innerHTML = renderAbout(); }
  else if (path === '/tags') { app().innerHTML = renderTags(); }
  else {
    app().innerHTML = renderNav(path) + '<main class="container page-fade"><div class="empty"><div class="big">' + svgIcon('question', 36) + '</div><p>' + t('post.notFound') + '</p><p><a href="' + esc(href('/')) + '">' + t('post.backHome') + '</a></p></div></main>' + renderFooter();
  }
  bindGlobal();
}

function bindGlobal() {
  // 主题切换：顶栏
  var tb = document.querySelector('#themeToggle');
  if (tb) tb.addEventListener('click', function () { toggleTheme(); });
  bindTocScroll();
  bindSearch();
  bindBackTop();
  populateLangSwitch();
  bindMobileSidebar();
}

function bindMobileSidebar() {
  var overlay = document.querySelector('#sidebarOverlay');
  var sidebar = document.querySelector('#mobileSidebar');
  var hamburger = document.querySelector('#hamburgerBtn');
  var closeBtn = document.querySelector('#sidebarClose');
  if (!sidebar) return;
  function openSidebar() {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    if (hamburger) hamburger.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
    if (hamburger) hamburger.classList.remove('open');
  }
  if (hamburger) hamburger.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);
  // 点击侧边栏链接后自动关闭
  sidebar.querySelectorAll('.sidebar-link').forEach(function (a) {
    a.addEventListener('click', closeSidebar);
  });
  // 侧边栏内的主题切换（独立 ID，与顶栏不冲突）
  var sideTheme = document.querySelector('#themeToggleSide');
  if (sideTheme) sideTheme.addEventListener('click', function () { toggleTheme(); });
  // 侧栏内语言切换
  var sideLang = sidebar.querySelector('.lang-switch');
  if (sideLang && !sideLang.dataset.bound) {
    sideLang.dataset.bound = '1';
    sideLang.addEventListener('change', function () {
      window.__i18n.loadLocale(sideLang.value).then(function () { route(); });
    });
  }
}

function populateLangSwitch() {
  var sels = document.querySelectorAll('.lang-switch');
  if (!sels.length || !window.__i18n || typeof window.__i18n.getLanguages !== 'function') return;
  var langs = window.__i18n.getLanguages();
  var current = window.__i18n.getLocale ? window.__i18n.getLocale() : 'zh-CN';
  sels.forEach(function (sel) {
    sel.innerHTML = '';
    langs.forEach(function (lang) {
      var opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = lang.flag + ' ' + lang.name;
      if (lang.code === current) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}
/* 返回顶部悬浮按钮：滚动超过一屏出现，点击平滑滚回当前页顶部（不跳转页面） */
var _backTopScrollBound = false;
function bindBackTop() {
  if (!_backTopScrollBound && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    _backTopScrollBound = true;
    window.addEventListener('scroll', function () { updateBackTop(); }, { passive: true });
  }
  var bt = document.querySelector('#backTop');
  if (bt && bt.addEventListener) bt.addEventListener('click', function () {
    if (typeof window.scrollTo === 'function') {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
      catch (e) { window.scrollTo(0, 0); }
    }
  });
  updateBackTop();
}
function updateBackTop() {
  var bt = document.querySelector('#backTop');
  if (!bt || !bt.classList || !bt.classList.add) return;
  var y = (typeof window !== 'undefined' && typeof window.scrollY === 'number')
    ? window.scrollY
    : ((typeof document !== 'undefined' && document.documentElement && document.documentElement.scrollTop) || 0);
  if (y > 300) bt.classList.add('show'); else bt.classList.remove('show');
}

/* 站内链接点击拦截：history 模式用 pushState，避免整页刷新 */
var _navClickBound = false;
function bindNavClicks() {
  if (_navClickBound) return;
  _navClickBound = true;
  if (typeof document === 'undefined') return;
  document.addEventListener('click', function (e) {
    try {
      var a = e.target;
      while (a && a.tagName !== 'A') a = a.parentNode;
      if (!a || !a.getAttribute) return;
      var hrefAttr = a.getAttribute('href') || '';
      if (!hrefAttr) return;
      // 外链 / 带 target / 静态资源（feed.xml 等）不拦截
      if (a.target || /^https?:|^\/\//i.test(hrefAttr)) return;
      if (/^(feed\.xml|sitemap\.xml|posts\.js|config\.js|app\.js|style\.css|favicon)/.test(hrefAttr)) return;
      // API 路径（/api/feed.xml、/api/sitemap.xml、/api/...）与带文件扩展名的路径
      // （/feed.xml、/robots.txt、图片等）不拦截：交给浏览器直接请求，SPA 路由不接管
      var hrefNoQuery = String(hrefAttr).split('?')[0];
      if (/^\/api\//.test(hrefNoQuery) || /\.[a-zA-Z0-9]{1,8}$/.test(hrefNoQuery)) return;
      // 纯 '#' 或站内锚点（#toc-1）不拦截，留给默认滚动
      if (hrefAttr.charAt(0) === '#' && hrefAttr.charAt(1) !== '/') return;
      e.preventDefault();
      var raw = hrefAttr;
      var qobj = {};
      var path = raw;
      if (raw.charAt(0) === '#') {            // hash 模式（file:// 直开）：#/posts/x → 去掉 '#'
        path = raw.slice(1);
      } else if (!useHashMode()) {            // 干净路径模式：去掉 appRoot 前缀
        var root = appRoot(); // ''（根）或 '/public'
        if (root && raw.indexOf(root) === 0) path = raw.slice(root.length);
      }
      // 注意：必须在去掉 '#' 之后的 path 上取 '?' 下标，否则与 raw 错位一位
      var qi = path.indexOf('?');
      if (qi >= 0) {
        (path.slice(qi + 1)).split('&').forEach(function (kv) {
          var p = kv.split('=');
          if (p[0]) { try { qobj[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); } catch (e) {} }
        });
        path = path.slice(0, qi);
      }
      navigate(path, qobj);
      }
      catch (err) {}
  }, true);
}

/* 目录点击：平滑滚动到正文对应标题，避免改变 location.hash 触发 hash 路由 */
function bindTocScroll() {
  var links = document.querySelectorAll('a[data-toc]');
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      var el = (typeof document.getElementById === 'function') ? document.getElementById(id.slice(1)) : document.querySelector(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // 若找不到目标，则恢复 router innerHTML 的行为：不阻止默认（可能跳到 404），故此处无默认跳转
    });
  });
}

/* 顶部导航搜索：点击搜索图标 → 隐藏导航、显示搜索框；输入实时出结果下拉面板 */
function bindSearch() {
  var toggles = document.querySelectorAll('#searchToggle, #searchToggleSide');
  var close = document.querySelector('#searchClose');
  var form = document.querySelector('#topbarSearch');
  var input = document.querySelector('#globalSearchInput');
  var panel = document.querySelector('#searchPanel');

  function openSearch() {
    var sidebar = document.querySelector('#mobileSidebar');
    var overlay = document.querySelector('#sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
    var bar = document.querySelector('.topbar');
    if (bar && bar.classList.contains('searching')) { if (close) close.click(); return; }
    _searchOpen = true;
    if (bar) bar.classList.add('searching');
    if (input) { input.focus(); if (input.select) input.select(); }
  }

  toggles.forEach(function (toggle) {
    toggle.addEventListener('click', function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      openSearch();
    });
  });

  if (close) close.addEventListener('click', function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    _searchOpen = false;
    var bar = document.querySelector('.topbar');
    if (bar) bar.classList.remove('searching');
    if (input) input.value = '';
    if (panel) { panel.innerHTML = ''; panel.classList.remove('open'); }
  });

  if (input) {
    input.addEventListener('input', function () { renderSearchPanel(input.value); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape' && close) close.click(); });
  }
  if (form) form.addEventListener('click', function (e) { e.stopPropagation(); });
  if (panel) panel.addEventListener('click', function (e) { e.stopPropagation(); });

  if (!_searchDocBound && typeof document !== 'undefined' && document.addEventListener) {
    _searchDocBound = true;
    document.addEventListener('click', function (e) {
      var bar = document.querySelector('.topbar');
      if (!bar || !bar.classList.contains('searching')) return;
      var t = e.target;
      while (t && t !== document) {
        if (t.id === 'topbarSearch' || t.id === 'searchPanel' || t.id === 'searchToggle' || t.id === 'searchToggleSide') return;
        t = t.parentNode;
      }
      var c = document.querySelector('#searchClose');
      if (c) c.click();
    });
  }
}
/* 渲染搜索结果下拉面板（跨全部文章，非当前页过滤） */
function renderSearchPanel(query) {
  var panel = document.querySelector('#searchPanel');
  if (!panel) return;
  var q = String(query || '').trim();
  if (!q) { panel.innerHTML = ''; panel.classList.remove('open'); return; }
  var hits = globalSearch(q, 20);
  if (!hits.length) {
    panel.innerHTML = '<div class="search-empty">' + t('search.noMatch') + '</div>';
  } else {
    panel.innerHTML = hits.map(function (p) {
      var snip = searchSnippet(p, q);
      return '<a class="search-hit" href="' + esc(href(postUrl(p.id))) + '">'
        + '<div class="sh-title">' + esc(p.title || '') + '</div>'
        + (snip ? '<div class="sh-snip">' + esc(snip) + '</div>' : '')
        + '</a>';
    }).join('');
  }
  panel.classList.add('open');
}

/* ---------- 启动引导 ----------
 * 首屏渲染不等待网络：先用静态/本地数据立即渲染，云端探测（/api/posts）
 * 异步完成后再合并数据并重渲染一次，切换为云端模式 UI。
 * 避免 API 慢（Workers 冷启动 / 弱网）时整页白屏等待。 */
window.__bootPromise = (async function () {
  var cfg = getConfig();
  applyTheme(getTheme());
  bindNavClicks();

  // 确保 i18n 翻译数据在首次渲染前加载完成
  if (window.__i18n && window.__i18n.loadLocale && !window.__i18n.isReady()) {
    await window.__i18n.loadLocale(window.__i18n.getLocale());
    _i18nReady = true;
  }

  route();
  window.addEventListener('hashchange', function () { route(); });
  window.addEventListener('popstate', function () { route(); });

  if (cfg.mode === 'api' || cfg.mode === 'auto') {
    try {
      var resp = await apiFetch('api/posts');
      var data = resp || {};
      if (data && Array.isArray(data.posts)) {
        var wasCloud = _cloudDetected;
        _cloudDetected = true;   // 云端在线：后续登录用 /api/admin/*
        if (data.posts.length) {
          var existing = (Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS : []);
          var byId = {};
          existing.forEach(function (p) { byId[p.id] = p; });
          data.posts.forEach(function (p) {
            var old = byId[p.id];
            if (old) {
              // 云端列表是摘要（不含 content/enc）：仅覆盖已返回字段，保留静态正文与摘要，
              // 避免首页卡片摘要被清空、全文搜索失效
              var merged = {};
              Object.keys(p).forEach(function (k) { if (p[k] !== undefined) merged[k] = p[k]; });
              byId[p.id] = Object.assign({}, old, merged);
            } else {
              byId[p.id] = p;
            }
          });
          window.BLOG_POSTS = Object.keys(byId).map(function (k) { return byId[k]; });
        }
        // 探测成功：模式或数据有变化则重渲染一次（切换云端 UI、刷新列表数据）
        if (!wasCloud || data.posts.length) route();
      }
    } catch (e) { /* 超时/失败 → 保持静态模式 */ }
  }
})();
