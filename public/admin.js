/* ============================================================
 * 轻语博客 · 后台管理 UI（响应式：PC 固定侧栏 / 移动端抽屉）
 * ------------------------------------------------------------
 * 纯原生 JS，无框架；复用前台 app.js 的全局能力（apiFetch / adminOk /
 * esc / svgIcon / renderMarkdown / navigate / getConfig 等）。
 * 通过 window.QingyuAdmin.mount(root, path) 由 app.js 路由挂载，
 * 前台 reader 逻辑完全不受影响（前提逻辑不变）。
 *
 * 路由（均在 /admin 命名空间下）：
 *   /admin                 仪表盘
 *   /admin/posts           全部文章
 *   /admin/posts/new       写新文章
 *   /admin/posts/:id/edit  编辑文章
 *   /admin/categories      分类管理
 *   /admin/tags            标签管理
 *   /admin/comments        全部评论
 *   /admin/comments/pending 待审核评论
 *   /admin/media           媒体资源
 *   /admin/settings        博客设置
 * （/write 与 /posts/:id/edit 也跳转至此编辑器）
 * ============================================================ */
(function () {
  'use strict';

  /* ----------------------- 工具函数 ----------------------- */
  function esc(s) { return window.esc ? window.esc(s) : String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function icon(name, size) { return window.svgIcon ? window.svgIcon(name, size) : ''; }
  function cfg() { return window.getConfig ? window.getConfig() : (window.BLOG_CONFIG || {}); }
  function cloudOn() { return typeof window._cloudOn === 'function' ? window._cloudOn() : false; }
  function isAdmin() { return typeof window.adminOk === 'function' ? window.adminOk() : false; }
  function go(path) { if (window.navigate) window.navigate(path); }
  function link(path) { return window.href ? window.href(path) : path; }

  function fmtDate(s) {
    s = String(s || '');
    if (!s) return '';
    return s.slice(0, 10);
  }
  function fmtSize(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }
  function slug(s) {
    if (window.slug) return window.slug(s);
    return String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || ('p' + Date.now().toString(36));
  }
  async function api(url, opts) {
    if (!window.apiFetch) throw new Error(t('admin.error.apiFetchUnavailable'));
    return await window.apiFetch(url, opts || {});
  }
  function toast(msg, type) {
    var wrap = document.querySelector('.ab-toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'ab-toast-wrap'; document.body.appendChild(wrap); }
    var t = document.createElement('div');
    t.className = 'ab-toast ' + (type || '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 300); }, 2400);
  }
  function confirmModal(title, bodyHtml, onOk, okText) {
    var mask = document.createElement('div');
    mask.className = 'ab-modal-mask';
    mask.innerHTML =
      '<div class="ab-modal">' +
      '<h3>' + esc(title) + '</h3>' +
      (bodyHtml || '') +
      '<div class="ab-modal-actions">' +
      '<button class="ab-btn ghost" data-act="cancel">' + t('confirm.cancel') + '</button>' +
      '<button class="ab-btn danger" data-act="ok">' + esc(okText || t('confirm.yes')) + '</button>' +
      '</div></div>';
    document.body.appendChild(mask);
    function close() { mask.remove(); }
    mask.addEventListener('click', function (e) {
      if (e.target === mask || e.target.getAttribute('data-act') === 'cancel') close();
      else if (e.target.getAttribute('data-act') === 'ok') { close(); onOk && onOk(); }
    });
    return close;
  }

  /* ----------------------- 数据访问（兼容云端 / 静态） ----------------------- */
  var _localWritable = null;

  async function localWritable() {
    if (cloudOn()) return false;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return false;
    if (_localWritable !== null) return _localWritable;
    try {
      var r = await fetch('/local-api/status', { cache: 'no-store' });
      var ct = (r.headers.get('content-type') || '').toLowerCase();
      if (!r.ok || ct.indexOf('application/json') < 0) {
        _localWritable = false;
        return false;
      }
      var d = await r.json();
      _localWritable = !!(d && d.writable === true);
      return _localWritable;
    } catch (e) {
      _localWritable = false;
      return false;
    }
  }

  async function localApi(url, opts) {
    var o = opts || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, o.headers || {});
    var r = await fetch(url, Object.assign({}, o, { headers: headers, cache: 'no-store' }));
    var ct = (r.headers.get('content-type') || '').toLowerCase();
    var d = ct.indexOf('application/json') >= 0 ? await r.json() : null;
    if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
    return d || { ok: true };
  }

  function syncMemoryPost(post) {
    if (!post || !post.id) return;
    var arr = Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS.slice() : [];
    var idx = arr.findIndex(function (p) { return p && p.id === post.id; });
    if (idx >= 0) arr[idx] = post; else arr.unshift(post);
    window.BLOG_POSTS = arr;
    try {
      var drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]');
      if (Array.isArray(drafts)) {
        drafts = drafts.filter(function (p) { return p && p.id !== post.id; });
        localStorage.setItem('qingyu.drafts', JSON.stringify(drafts));
      }
    } catch (e) {}
  }

  function removeMemoryPost(id) {
    var arr = Array.isArray(window.BLOG_POSTS) ? window.BLOG_POSTS : [];
    window.BLOG_POSTS = arr.filter(function (p) { return p && p.id !== id; });
    try {
      var drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]');
      if (Array.isArray(drafts)) {
        drafts = drafts.filter(function (p) { return p && p.id !== id; });
        localStorage.setItem('qingyu.drafts', JSON.stringify(drafts));
      }
    } catch (e) {}
  }

  async function listPosts() {
    if (cloudOn()) {
      var d = await api('api/posts');
      return (d && d.posts) || [];
    }

    if (await localWritable()) {
      var ld = await localApi('/local-api/posts');
      return (ld && ld.posts) || [];
    }

    var base = (window.getStaticPosts ? window.getStaticPosts() : []) || [];
    var drafts = [];
    try { drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) {}
    var map = {};
    base.forEach(function (p) { if (p && p.id) map[p.id] = p; });
    drafts.forEach(function (p) { if (p && p.id) map[p.id] = p; });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  async function getPost(id) {
    if (cloudOn()) {
      try { var d = await api('api/posts/' + encodeURIComponent(id)); return d && d.post; } catch (e) { return null; }
    }

    if (await localWritable()) {
      try {
        var ld = await localApi('/local-api/posts/' + encodeURIComponent(id));
        return ld && ld.post;
      } catch (e) {
        return null;
      }
    }

    var all = await listPosts();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function saveStaticPost(post) {
    var drafts = [];
    try { drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) {}
    var idx = -1;
    for (var i = 0; i < drafts.length; i++) if (drafts[i] && drafts[i].id === post.id) idx = i;
    var item = { id: post.id, title: post.title, date: post.date, tags: post.tags || [], excerpt: post.excerpt || '',
      cover: post.cover || '', category: post.category || '', status: post.status || 'published',
      pinned: !!post.pinned, content: post.content || '' };
    if (idx >= 0) drafts[idx] = item; else drafts.push(item);
    localStorage.setItem('qingyu.drafts', JSON.stringify(drafts));
  }

  async function savePost(post, isNew) {
    if (cloudOn()) {
      if (isNew) return await api('api/posts', { method: 'POST', body: JSON.stringify(post) });
      return await api('api/posts/' + encodeURIComponent(post.id), { method: 'PUT', body: JSON.stringify(post) });
    }

    if (await localWritable()) {
      var url = isNew ? '/local-api/posts' : '/local-api/posts/' + encodeURIComponent(post.id);
      var r = await localApi(url, {
        method: isNew ? 'POST' : 'PUT',
        body: JSON.stringify(post)
      });
      syncMemoryPost((r && r.post) || post);
      return r;
    }

    saveStaticPost(post);
    return { ok: true };
  }

  async function deletePost(id) {
    if (cloudOn()) return await api('api/posts/' + encodeURIComponent(id), { method: 'DELETE' });

    if (await localWritable()) {
      var r = await localApi('/local-api/posts/' + encodeURIComponent(id), { method: 'DELETE' });
      removeMemoryPost(id);
      return r;
    }

    var drafts = [];
    try { drafts = JSON.parse(localStorage.getItem('qingyu.drafts') || '[]'); } catch (e) {}
    drafts = drafts.filter(function (p) { return p.id !== id; });
    localStorage.setItem('qingyu.drafts', JSON.stringify(drafts));
    return { ok: true };
  }

  function downloadPostsJs() {
    if (!window.buildPostsJs) { toast(t('admin.toast.exportNotSupported'), 'err'); return; }
    // posts.js
    var txt = window.buildPostsJs();
    var blob = new Blob([txt], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'posts.js';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast(t('admin.toast.exportedPostsJs'), 'ok');
  }
  /** 一键导出全部：posts.js + feed.xml + sitemap.xml（静态模式发布三件套） */
  function downloadAllStatic() {
    downloadPostsJs();
    if (window.buildFeedXmlClient) {
      setTimeout(function () {
        var fb = new Blob([window.buildFeedXmlClient(window.getStaticPosts ? window.getStaticPosts() : [], 20)], { type: 'application/xml' });
        var fa = document.createElement('a'); fa.href = URL.createObjectURL(fb); fa.download = 'feed.xml'; fa.click();
        setTimeout(function () { URL.revokeObjectURL(fa.href); }, 1000);
      }, 200);
    }
    if (window.buildSitemapClient) {
      setTimeout(function () {
        var sb = new Blob([window.buildSitemapClient()], { type: 'application/xml' });
        var sa = document.createElement('a'); sa.href = URL.createObjectURL(sb); sa.download = 'sitemap.xml'; sa.click();
        setTimeout(function () { URL.revokeObjectURL(sa.href); }, 1000);
      }, 400);
    }
    toast(t('admin.toast.exportedAll'), 'ok');
  }

  /* ----------------------- 登录门禁 ----------------------- */
  function renderGate(root) {
    var head = '', form = '', hint = '';
    if (cloudOn()) {
      head = '<h2>' + t('admin.login') + '</h2><p>' + t('admin.loginHint') + '</p>';
      form =
        '<input class="ab-input" type="password" id="abGatePwd" placeholder="' + t('admin.pwdLabel') + '" autocomplete="current-password">' +
        '<button class="ab-btn primary" id="abGateBtn">' + t('admin.loginBtn') + '</button>';
      hint = '<p class="ab-hint" style="margin-top:14px">' + t('admin.defaultPwdHint') + '</p>';
    } else if (window.needAdminSetup && window.needAdminSetup()) {
      head = '<h2>' + t('admin.setupPwd') + '</h2><p>' + t('admin.loginHint') + '</p>';
      form =
        '<input class="ab-input" type="password" id="abGatePwd" placeholder="' + t('admin.setupPwd') + '" autocomplete="new-password">' +
        '<button class="ab-btn primary" id="abGateBtn">' + t('admin.setupBtn') + '</button>';
    } else {
      head = '<h2>' + t('admin.login') + '</h2><p>' + t('admin.loginHint') + '</p>';
      form =
        '<input class="ab-input" type="password" id="abGatePwd" placeholder="' + t('admin.pwdLabel') + '" autocomplete="current-password">' +
        '<button class="ab-btn primary" id="abGateBtn">' + t('admin.loginBtn') + '</button>';
    }
    root.innerHTML =
      '<div class="ab-gate">' +
      '<div class="ab-gate-card">' +
      '<div class="ab-gate-logo">青</div>' + head +
      form + hint +
      '</div></div>';

    var btn = root.querySelector('#abGateBtn');
    var inp = root.querySelector('#abGatePwd');
    async function submit() {
      var pwd = inp.value || '';
      if (!pwd) { toast(t('admin.pwdRequired'), 'err'); return; }
      btn.disabled = true;
      try {
        if (cloudOn()) {
          var r = await window.cloudLogin(pwd);
          if (r && r.ok) {
            if (r.mustChange) {
              // 首次部署自动初始化：显示默认密码 + 强制改密
              var msg = r.defaultPassword ? '（' + t('admin.defaultPwdHint') + r.defaultPassword + '）' : '';
              toast(t('admin.logging') + msg, 'ok');
              go('/admin');
              setTimeout(function () { openPasswordModal(); }, 500);
            } else {
              toast(t('admin.logging'), 'ok'); go('/admin');
            }
          }
          else { toast((r && r.message) || t('admin.wrongPwd'), 'err'); btn.disabled = false; }
        } else if (window.needAdminSetup && window.needAdminSetup()) {
          if (await window.setupAdmin(pwd)) { toast(t('admin.logging'), 'ok'); go('/admin'); }
          else { toast(t('admin.pwdTooShort'), 'err'); btn.disabled = false; }
        } else {
          if (await window.tryAdmin(pwd)) { toast(t('admin.logging'), 'ok'); go('/admin'); }
          else { toast(t('admin.wrongPwd'), 'err'); btn.disabled = false; }
        }
      } catch (e) { toast(t('admin.wrongPwd') + (e && e.message || e), 'err'); btn.disabled = false; }
    }
    btn.addEventListener('click', submit);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    inp.focus();
  }

  /* ----------------------- 侧边栏菜单 ----------------------- */
  /* NAV 改为函数，每次调用时重新执行 t()，语言切换后自动更新 */
  function getNav() {
    return [
      { group: t('admin.sidebar.overview'), items: [{ key: 'dashboard', label: t('admin.sidebar.dashboard'), icon: 'sitemap', href: '/admin' }] },
      { group: t('admin.sidebar.postManage'), items: [
        { key: 'posts', label: t('admin.sidebar.allPosts'), icon: 'list', href: '/admin/posts' },
        { key: 'write', label: t('admin.sidebar.writeNew'), icon: 'pen', href: '/admin/posts/new' },
        { key: 'categories', label: t('admin.sidebar.catManage'), icon: 'tag', href: '/admin/categories' },
        { key: 'tags', label: t('admin.sidebar.tagManage'), icon: 'tag', href: '/admin/tags' }
      ] },
      { group: t('admin.sidebar.commentManage'), items: [
        { key: 'comments', label: t('admin.sidebar.allComments'), icon: 'quote', href: '/admin/comments' },
        { key: 'comments-pending', label: t('admin.sidebar.pendingComments'), icon: 'lock', href: '/admin/comments/pending', badge: 'pending' }
      ] },
      { group: t('admin.sidebar.contentSettings'), items: [
        { key: 'media', label: t('admin.sidebar.media'), icon: 'image', href: '/admin/media' },
        { key: 'settings', label: t('admin.sidebar.settings'), icon: 'sitemap', href: '/admin/settings' }
      ] }
    ];
  }

  function renderSider(activeKey, pendingCount) {
    var NAV = getNav();
    var groups = NAV.map(function (g) {
      var items = g.items.map(function (it) {
        var badge = (it.badge === 'pending' && pendingCount > 0) ? '<span class="ab-nav-count">' + pendingCount + '</span>' : '';
        return '<a class="ab-nav-item ' + (it.key === activeKey ? 'active' : '') + '" data-link="' + esc(it.href) + '">' +
          icon(it.icon, 17) + '<span class="ab-nav-text">' + esc(it.label) + '</span>' + badge + '</a>';
      }).join('');
      return '<div class="ab-nav-group"><div class="ab-nav-group-title">' + esc(g.group) + '</div>' + items + '</div>';
    }).join('');

    var adminName = (cfg().footer && cfg().footer.copyrightName) || t('admin.sidebar.admin');
    var langOpts = '<select id="adminLangSwitch" class="ab-lang-switch">' +
      '<option value="zh-CN">🇨🇳 中文</option><option value="en">🇬🇧 English</option><option value="ja">🇯🇵 日本語</option><option value="ko">🇰🇷 한국어</option><option value="hi">🇮🇳 हिन्दी</option></select>';
    return (
      '<aside class="ab-sider" id="abSider">' +
        '<div class="ab-sider-header">' +
          '<div class="ab-logo">青</div>' +
          '<div class="ab-sider-title">' + esc(adminName) + '</div>' +
          langOpts +
        '</div>' +
        '<nav class="ab-nav">' + groups + '</nav>' +
        '<div class="ab-sider-footer">' +
          '<div class="ab-avatar">A</div>' +
          '<div class="ab-sider-footer-text"><b>' + esc(adminName) + '</b><span>' + t('admin.sidebar.adminDesc') + '</span></div>' +
          '<button class="ab-btn-icon" id="abSiderLogout" title="' + t('admin.sidebar.logout') + '">' + icon('logout', 17) + '</button>' +
        '</div>' +
      '</aside>' +
      '<div class="ab-sider-mask" id="abSiderMask"></div>'
    );
  }

  /* ----------------------- 顶栏 ----------------------- */
  function renderHeader(crumbs) {
    var crumbHtml = crumbs.map(function (c, i) {
      if (i === crumbs.length - 1) return '<b>' + esc(c) + '</b>';
      return '<span class="ab-hide-sm">' + esc(c) + '</span><span class="sep ab-hide-sm">/</span>';
    }).join(' ');
    return (
      '<header class="ab-header">' +
        '<button class="ab-btn-icon" id="abMenuBtn" title="' + t('admin.header.toggleMenu') + '">' + icon('list', 18) + '</button>' +
        '<div class="ab-breadcrumb">' + crumbHtml + '</div>' +
        '<div class="ab-header-spacer"></div>' +
        '<div class="ab-header-right">' +
          '<button class="ab-header-btn" id="abPreview" title="' + t('admin.header.preview') + '">' + icon('external', 16) + '<span class="ab-hide-sm">' + t('admin.header.preview') + '</span></button>' +
          '<div class="ab-dropdown">' +
            '<button class="ab-btn-icon ab-bell" id="abBell" title="' + t('admin.header.newComment') + '">' + icon('quote', 18) + '<span class="ab-badge" id="abBellBadge" style="display:none">0</span></button>' +
            '<div class="ab-menu" id="abBellMenu"><div class="ab-menu-item" style="color:var(--ab-muted);cursor:default">' + t('admin.header.noNewComment') + '</div></div>' +
          '</div>' +
          '<div class="ab-dropdown">' +
            '<button class="ab-btn-icon" id="abAvatarBtn" title="' + t('admin.header.account') + '">' + icon('lock', 18) + '</button>' +
            '<div class="ab-menu" id="abAvatarMenu">' +
              '<div class="ab-menu-item" data-act="profile">' + icon('pen', 16) + t('admin.header.profile') + '</div>' +
              '<div class="ab-menu-item" data-act="password">' + icon('lock', 16) + t('admin.header.changePwd') + '</div>' +
              '<div class="ab-menu-sep"></div>' +
              '<div class="ab-menu-item danger" data-act="logout">' + icon('logout', 16) + t('admin.sidebar.logout') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  /* ----------------------- 路由解析 ----------------------- */
  function parseRoute(path) {
    path = String(path || '/');
    if (path === '/write' || path === '/admin/write' || path === '/admin/posts/new') return { key: 'write', page: 'editor', id: null, isNew: true };
    var m = path.match(/^\/admin\/posts\/([^/]+)\/edit$/);
    if (m) return { key: 'write', page: 'editor', id: decodeURIComponent(m[1]), isNew: false };
    m = path.match(/^\/posts\/([^/]+)\/edit$/);
    if (m) return { key: 'write', page: 'editor', id: decodeURIComponent(m[1]), isNew: false };
    if (path === '/admin' || path === '/admin/') return { key: 'dashboard', page: 'dashboard' };
    if (path === '/admin/posts') return { key: 'posts', page: 'posts' };
    if (path === '/admin/categories') return { key: 'categories', page: 'categories' };
    if (path === '/admin/tags') return { key: 'tags', page: 'tags' };
    if (path === '/admin/comments') return { key: 'comments', page: 'comments', filter: 'all' };
    if (path === '/admin/comments/pending') return { key: 'comments-pending', page: 'comments', filter: 'pending' };
    if (path === '/admin/media') return { key: 'media', page: 'media' };
    if (path === '/admin/settings') return { key: 'settings', page: 'settings' };
    return { key: 'dashboard', page: 'dashboard' };
  }
  function crumbsFor(route) {
    var NAV = getNav();
    for (var i = 0; i < NAV.length; i++) {
      for (var j = 0; j < NAV[i].items.length; j++) {
        if (NAV[i].items[j].key === route.key) {
          if (NAV[i].group === t('admin.sidebar.overview')) return [NAV[i].items[j].label];
          return [NAV[i].group, NAV[i].items[j].label];
        }
      }
    }
    return [t('admin.sidebar.dashboard')];
  }

  /* ----------------------- 装载入口 ----------------------- */
  var siderCollapsed = false;

  function mount(root, path) {
    if (!isAdmin()) { renderGate(root); return; }
    // 确保 i18n 已加载
    var route = parseRoute(path);
    // 异步拉取待审核数量用于角标
    var pendingCount = 0;
    renderShell(root, route, pendingCount);
    bindShell(root, route);
    loadPendingBadge(root, route);
    renderPage(root, route);
  }

  function renderShell(root, route, pendingCount) {
    var crumbs = crumbsFor(route);
    root.innerHTML =
      '<div class="ab-root' + (siderCollapsed ? ' ab-collapsed' : '') + '">' +
        renderSider(route.key, pendingCount) +
        '<div class="ab-main">' +
          renderHeader(crumbs) +
          '<main class="ab-content" id="abContent"></main>' +
          '<footer class="ab-footer" style="text-align:center;padding:18px;color:var(--ab-muted);font-size:12.5px;border-top:1px solid var(--ab-border);background:var(--ab-card)">' + t('admin.footer.copyright') + '</footer>' +
        '</div>' +
      '</div>';
    if (siderCollapsed) root.querySelector('#abSider').classList.add('collapsed');
  }

  function bindShell(root, route) {
    var sider = root.querySelector('#abSider');
    var mask = root.querySelector('#abSiderMask');

    root.querySelectorAll('[data-link]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-link')); });
    });

    // 语言切换：加载新语言后重新挂载整个管理面板（无刷新）
    var langSwitch = root.querySelector('#adminLangSwitch');
    if (langSwitch && window.__i18n && window.__i18n.loadLocale) {
      langSwitch.value = (window.__i18n.getLocale && window.__i18n.getLocale()) || 'zh-CN';
      langSwitch.addEventListener('change', function () {
        var val = langSwitch.value;
        var currentPath = (typeof window.currentRoute === 'function') ? window.currentRoute().path : '/admin';
        window.__i18n.loadLocale(val).then(function () {
          mount(root, currentPath);
        });
      });
    }

    var menuBtn = root.querySelector('#abMenuBtn');
    menuBtn.addEventListener('click', function () {
      if (window.innerWidth <= 991) {
        sider.classList.toggle('open');
        mask.classList.toggle('show');
      } else {
        siderCollapsed = !siderCollapsed;
        sider.classList.toggle('collapsed', siderCollapsed);
      }
    });
    mask.addEventListener('click', function () { sider.classList.remove('open'); mask.classList.remove('show'); });

    root.querySelector('#abPreview').addEventListener('click', function () {
      var url = window.location.origin + (window.location.protocol === 'file:' ? '/index.html' : '/');
      window.open(url, '_blank');
    });

    root.querySelector('#abSiderLogout').addEventListener('click', function () {
      confirmModal(t('admin.sidebar.logout'), '<p class="ab-muted">' + t('admin.sidebar.logout') + '?</p>', function () {
        if (cloudOn()) window.cloudLogout && window.cloudLogout(); else window.adminLogout && window.adminLogout();
        go('/admin');
      }, t('confirm.yes'));
    });

    // 通知铃铛
    var bell = root.querySelector('#abBell');
    var bellMenu = root.querySelector('#abBellMenu');
    bell.addEventListener('click', function (e) { e.stopPropagation(); bellMenu.classList.toggle('open'); });
    // 头像下拉
    var avBtn = root.querySelector('#abAvatarBtn');
    var avMenu = root.querySelector('#abAvatarMenu');
    avBtn.addEventListener('click', function (e) { e.stopPropagation(); avMenu.classList.toggle('open'); });
    avMenu.addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act');
      if (!act) return;
      avMenu.classList.remove('open');
      if (act === 'logout') {
        if (cloudOn()) window.cloudLogout && window.cloudLogout(); else window.adminLogout && window.adminLogout();
        go('/admin');
      } else if (act === 'profile') {
        go('/admin/settings');
      } else if (act === 'password') {
        openPasswordModal();
      }
    });
    if (!window.__abDocCloseBound) {
      window.__abDocCloseBound = true;
      document.addEventListener('click', function () {
        var ms = document.querySelectorAll('.ab-menu.open');
        ms.forEach(function (m) { m.classList.remove('open'); });
      });
    }
  }

  function loadPendingBadge(root, route) {
    if (!cloudOn()) return;
    api('api/comments?status=pending').then(function (d) {
      var list = (d && d.comments) || [];
      var badge = root.querySelector('#abBellBadge');
      var menu = root.querySelector('#abBellMenu');
      if (badge && list.length) {
        badge.style.display = ''; badge.textContent = list.length;
      }
      if (menu) {
        if (list.length) {
          menu.innerHTML = list.slice(0, 6).map(function (c) {
            return '<div class="ab-menu-item" data-link="/admin/comments/pending" style="white-space:normal;line-height:1.4">' +
              '<div><b>' + esc(c.author || t('admin.comments.anonymous')) + '</b><br><span class="ab-text-sm ab-muted">' + esc((c.content || '').slice(0, 28)) + '</span></div></div>';
          }).join('') + '<div class="ab-menu-sep"></div><div class="ab-menu-item" data-link="/admin/comments/pending">' + t('admin.header.viewAllPending') + '</div>';
          menu.querySelectorAll('[data-link]').forEach(function (a) { a.addEventListener('click', function () { go(a.getAttribute('data-link')); }); });
        }
      }
    }).catch(function () {});
  }

  /* ----------------------- 内容区分发 ----------------------- */
  function renderPage(root, route) {
    var content = root.querySelector('#abContent');
    if (route.page === 'dashboard') return pageDashboard(content);
    if (route.page === 'posts') return pagePosts(content);
    if (route.page === 'editor') return pageEditor(content, route);
    if (route.page === 'categories') return pageCategories(content);
    if (route.page === 'tags') return pageTags(content);
    if (route.page === 'comments') return pageComments(content, route.filter);
    if (route.page === 'media') return pageMedia(content);
    if (route.page === 'settings') return pageSettings(content);
  }

  /* ====================== 仪表盘 ====================== */
  function pageDashboard(content) {
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">' + t('admin.dashboard.title') + '</h1><p class="ab-page-sub">' + t('admin.dashboard.desc') + '</p></div></div>' +
      '<div class="ab-grid cols-5" id="abStats"></div>' +
      '<div class="ab-grid cols-2" style="margin-top:16px">' +
        '<div class="ab-card"><div class="ab-section-title">' + icon('eye', 16) + ' ' + t('admin.dashboard.visitTrend') + '</div><div id="abTrendViews"></div></div>' +
        '<div class="ab-card"><div class="ab-section-title">' + icon('quote', 16) + ' ' + t('admin.dashboard.commentTrend') + '</div><div id="abTrendCmt"></div></div>' +
      '</div>' +
      '<div class="ab-grid cols-2" style="margin-top:16px">' +
        '<div class="ab-card"><div class="ab-section-title">' + icon('doc', 16) + ' ' + t('admin.dashboard.latestPosts') + '</div><div class="ab-feed" id="abRecentPosts"></div></div>' +
        '<div class="ab-card"><div class="ab-section-title">' + icon('quote', 16) + ' ' + t('admin.dashboard.latestComments') + '</div><div class="ab-feed" id="abRecentCmt"></div></div>' +
      '</div>';

    loadDashboard(content);
  }

  async function loadDashboard(content) {
    var posts = [];
    try { posts = await listPosts(); } catch (e) {}
    var total = posts.length;
    var published = posts.filter(function (p) { return (p.status || 'published') !== 'draft'; }).length;
    var drafts = posts.filter(function (p) { return (p.status || 'published') === 'draft'; }).length;

    var commentsAll = [], pending = 0;
    if (cloudOn()) {
      try { var cd = await api('api/comments?status=all'); commentsAll = (cd && cd.comments) || []; } catch (e) {}
      pending = commentsAll.filter(function (c) { return (c.status || 'approved') === 'pending'; }).length;
    }

    var pinnedCount = posts.filter(function (p) { return !!p.pinned; }).length;
    var stats = [
      { label: t('admin.dashboard.totalPosts'), value: total, icon: 'doc' },
      { label: t('admin.dashboard.published'), value: published, icon: 'check' },
      { label: t('admin.dashboard.drafts'), value: drafts, icon: 'pen' },
      { label: t('admin.dashboard.pinned'), value: pinnedCount, icon: 'pin' },
      { label: t('admin.dashboard.totalComments'), value: cloudOn() ? commentsAll.length : '—', icon: 'quote' },
      { label: t('admin.dashboard.pendingComments'), value: cloudOn() ? pending : '—', icon: 'lock' }
    ];
    content.querySelector('#abStats').innerHTML = stats.map(function (s) {
      return '<div class="ab-card ab-stat"><div class="ab-stat-label">' + icon(s.icon, 16) + esc(s.label) + '</div><div class="ab-stat-value">' + esc(String(s.value)) + '</div></div>';
    }).join('');

    // 最新发布
    var recentPosts = posts.slice().sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 5);
    content.querySelector('#abRecentPosts').innerHTML = recentPosts.length ? recentPosts.map(function (p) {
      return '<div class="ab-feed-item"><div class="ab-feed-main"><b>' + esc(p.title || t('admin.dashboard.noTitle')) + '</b><span>' + esc(fmtDate(p.date)) + ' · ' + esc(p.category || t('admin.dashboard.uncategorized')) + '</span></div></div>';
    }).join('') : '<div class="ab-empty"><div class="ab-empty-ico">📝</div><p>' + t('admin.dashboard.noPosts') + '</p><a class="ab-btn primary sm" data-link="/admin/posts/new">' + t('admin.dashboard.goWrite') + '</a></div>';
    content.querySelectorAll('#abRecentPosts [data-link]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-link')); }); });

    // 最新评论
    var recentCmt = commentsAll.slice(0, 5);
    content.querySelector('#abRecentCmt').innerHTML = recentCmt.length ? recentCmt.map(function (c) {
      return '<div class="ab-feed-item"><div class="ab-feed-main"><b>' + esc(c.author || t('admin.dashboard.anonymous')) + '</b><span>' + esc((c.content || '').slice(0, 30)) + '</span></div></div>';
    }).join('') : '<div class="ab-empty"><div class="ab-empty-ico">💬</div><p>' + t('admin.dashboard.noComments') + '</p></div>';

    // 趋势
    if (cloudOn()) {
      try {
        var td = await api('api/stats/trend?days=30');
        var trend = (td && td.trend) || [];
        content.querySelector('#abTrendViews').innerHTML = lineChart(trend.map(function (t) { return t.views; }), t('admin.dashboard.dailyViews'));
      } catch (e) { content.querySelector('#abTrendViews').innerHTML = '<div class="ab-empty"><p>' + t('admin.dashboard.noViewData') + '</p></div>'; }
      try {
        var byDate = {};
        commentsAll.forEach(function (c) { var d = fmtDate(c.date); byDate[d] = (byDate[d] || 0) + 1; });
        var last30 = [];
        for (var i = 29; i >= 0; i--) { var d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10); last30.push(byDate[d] || 0); }
        content.querySelector('#abTrendCmt').innerHTML = lineChart(last30, t('admin.dashboard.dailyComments'));
      } catch (e) { content.querySelector('#abTrendCmt').innerHTML = '<div class="ab-empty"><p>' + t('admin.dashboard.noCommentData') + '</p></div>'; }
    } else {
      content.querySelector('#abTrendViews').innerHTML = '<div class="ab-empty"><p>' + t('admin.dashboard.cloudOnly') + '</p></div>';
      content.querySelector('#abTrendCmt').innerHTML = '<div class="ab-empty"><p>' + t('admin.dashboard.cloudOnly') + '</p></div>';
    }
  }

  function lineChart(values, label) {
    var w = 520, h = 200, pad = 28;
    var max = Math.max(1, Math.max.apply(null, values));
    var n = values.length;
    if (n === 0) return '<div class="ab-empty"><p>' + t('admin.dashboard.noData') + '</p></div>';
    var step = (w - pad * 2) / Math.max(1, n - 1);
    var pts = values.map(function (v, i) {
      var x = pad + i * step;
      var y = h - pad - (v / max) * (h - pad * 2);
      return [x, y];
    });
    var path = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var dots = pts.map(function (p) { return '<circle class="dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.5"/>'; }).join('');
    var base = '<line class="axis" x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '"/>';
    var last = pts[pts.length - 1];
    return '<svg class="ab-chart" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + base +
      '<path class="line" d="' + path + '"/>' + dots +
      '<text class="lbl" x="' + (w - pad) + '" y="' + (last[1] - 6) + '" text-anchor="end">' + (values[values.length - 1]) + '</text>' +
      '</svg><div class="ab-text-sm ab-muted" style="margin-top:6px">' + esc(label) + t('admin.dashboard.peak') + ' ' + max + '）</div>';
  }

  /* ====================== 文章列表 ====================== */
  function pagePosts(content) {
    content.innerHTML =
      '<div class="ab-page-head"><div><h1 class="ab-page-title">' + t('admin.postList.title') + '</h1><p class="ab-page-sub">' + t('admin.postList.desc') + '</p></div>' +
        '<button class="ab-btn primary" data-link="/admin/posts/new">' + icon('pen', 15) + ' ' + t('admin.sidebar.writeNew') + '</button></div>' +
      '<div class="ab-toolbar">' +
        '<div class="ab-search"><input class="ab-input" id="abPostKw" placeholder="' + t('admin.postList.search') + '"></div>' +
        '<select class="ab-select" id="abPostStatus" style="max-width:140px"><option value="all">' + t('admin.postList.allStatus') + '</option><option value="published">' + t('admin.dashboard.published') + '</option><option value="draft">' + t('admin.dashboard.drafts') + '</option></select>' +
        '<select class="ab-select" id="abPostCat" style="max-width:160px"><option value="">' + t('admin.postList.allCats') + '</option></select>' +
      '</div>' +
      '<div class="ab-table-wrap"><table class="ab-table"><thead><tr>' +
        '<th>' + t('admin.postList.colTitle') + '</th><th>' + t('admin.postList.colCategory') + '</th><th>' + t('admin.postList.colTags') + '</th><th>' + t('admin.postList.colDate') + '</th><th>' + t('admin.postList.colStatus') + '</th><th class="col-actions">' + t('admin.postList.colActions') + '</th>' +
      '</tr></thead><tbody id="abPostBody"></tbody></table></div>' +
      '<div class="ab-pagination" id="abPostPage"></div>';

    bindPosts(content);
    loadPosts(content, 1);
    // 绑定内容区内的导航链接（如「写新文章」按钮），bindShell 仅绑定挂载时已有的元素
    content.querySelectorAll('[data-link]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-link')); });
    });
  }

  function bindPosts(content) {
    var kw = content.querySelector('#abPostKw');
    var st = content.querySelector('#abPostStatus');
    var cat = content.querySelector('#abPostCat');
    function refilter() { loadPosts(content, 1); }
    kw.addEventListener('input', debounce(refilter, 250));
    st.addEventListener('change', refilter);
    cat.addEventListener('change', refilter);
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }

  async function loadPosts(content, page) {
    var body = content.querySelector('#abPostBody');
    var catSel = content.querySelector('#abPostCat');
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px"><span class="ab-spin"></span> ' + t('admin.postList.loading') + '</td></tr>';
    var posts = [];
    try { posts = await listPosts(); } catch (e) { body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px" class="ab-muted">' + t('admin.postList.loadFail') + esc(e.message || e) + '</td></tr>'; return; }

    // 分类下拉
    var cats = {};
    posts.forEach(function (p) { var c = p.category || t('admin.dashboard.uncategorized'); cats[c] = (cats[c] || 0) + 1; });
    var cur = catSel.value;
    catSel.innerHTML = '<option value="">' + t('admin.postList.allCats') + '</option>' + Object.keys(cats).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + ' (' + cats[c] + ')</option>'; }).join('');
    catSel.value = cur;

    var kw = content.querySelector('#abPostKw').value.trim().toLowerCase();
    var st = content.querySelector('#abPostStatus').value;
    var cf = content.querySelector('#abPostCat').value;

    var filtered = posts.filter(function (p) {
      if (st !== 'all' && (p.status || 'published') !== st) return false;
      if (cf && (p.category || t('admin.dashboard.uncategorized')) !== cf) return false;
      if (kw) {
        var hay = ((p.title || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    });
    filtered.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });

    if (!filtered.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:34px" class="ab-muted">' + t('admin.postList.noMatch') + '</td></tr>';
      content.querySelector('#abPostPage').innerHTML = '';
      return;
    }
    var per = 10, totalPages = Math.max(1, Math.ceil(filtered.length / per));
    page = Math.min(page, totalPages);
    var slice = filtered.slice((page - 1) * per, page * per);
    body.innerHTML = slice.map(function (p) {
      var id = p.id;
      var statusBadge = '';
      if (p.pinned) statusBadge = '<span class="ab-status published">' + icon('pin', 11) + ' ' + t('admin.postList.pin') + '</span>';
      else statusBadge = '<span class="ab-status ' + ((p.status || 'published') === 'draft' ? 'draft' : 'published') + '">' + ((p.status || 'published') === 'draft' ? t('admin.dashboard.drafts') : t('admin.dashboard.published')) + '</span>';
      return '<tr>' +
        '<td><a class="ab-post-title" data-link="/admin/posts/' + enc(id) + '/edit">' + esc(p.title || t('admin.dashboard.noTitle')) + '</a></td>' +
        '<td class="ab-td-cat">' + (p.category ? '<span class="ab-chip cat">' + esc(p.category) + '</span>' : '<span class="ab-muted">—</span>') + '</td>' +
        '<td class="ab-td-tags">' + (p.tags && p.tags.length ? '<div class="ab-tag-row">' + p.tags.map(function (t) { return '<span class="ab-chip">' + esc(t) + '</span>'; }).join('') + '</div>' : '<span class="ab-muted">—</span>') + '</td>' +
        '<td class="ab-td-date">' + esc(fmtDate(p.date)) + '</td>' +
        '<td class="ab-td-status">' + statusBadge + '</td>' +
        '<td class="col-actions">' +
          '<button class="ab-btn sm" data-edit="' + enc(id) + '">' + icon('pen', 13) + ' ' + t('admin.postList.edit') + '</button> ' +
          '<button class="ab-btn sm" data-pin="' + enc(id) + '">' + icon('pin', 13) + ' ' + (p.pinned ? t('admin.postList.unpin') : t('admin.postList.pin')) + '</button> ' +
          '<button class="ab-btn sm danger" data-del="' + enc(id) + '">' + icon('trash', 13) + ' ' + t('admin.comments.delete') + '</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    body.querySelectorAll('[data-link]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-link')); }); });
    body.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () { go('/admin/posts/' + dec(b.getAttribute('data-edit')) + '/edit'); }); });
    body.querySelectorAll('[data-preview]').forEach(function (b) { b.addEventListener('click', function () { window.open(link('/posts/' + dec(b.getAttribute('data-preview')) + '/'), '_blank'); }); });
    body.querySelectorAll('[data-pin]').forEach(function (b) { b.addEventListener('click', async function () {
      var pid = dec(b.getAttribute('data-pin'));
      // 立即切换按钮文字（乐观更新），让用户即时看到反馈
      var isPinned = b.innerHTML.indexOf(t('admin.postList.unpin')) >= 0;
      b.innerHTML = '<span class="ab-spin" style="width:13px;height:13px;border-width:2px"></span> ' + (isPinned ? t('admin.postList.unpinning') : t('admin.postList.pinning'));
      b.disabled = true;
      try {
        var post = await getPost(pid);
        if (!post) { toast(t('admin.postList.notFound'), 'err'); return; }
        post.pinned = !post.pinned;
        var pinResult = await savePost(post, false);
        if (!cloudOn() && !(pinResult && pinResult.localFile)) {
          downloadPostsJs();
        }
        toast(post.pinned ? t('admin.postList.pinnedOk') : t('admin.postList.unpinnedOk'), 'ok');
      } catch (e) { toast(t('admin.postList.opFail') + (e.message || e), 'err'); }
      b.disabled = false;
      loadPosts(content, page);
    }); });
    body.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () {
      var pid = dec(b.getAttribute('data-del'));
      confirmModal(t('admin.postList.deleteTitle'), '<p class="ab-muted">' + t('admin.postList.deleteConfirm', { title: esc(pid) }) + '</p>', async function () {
        try { await deletePost(pid); toast(t('admin.postList.deleted'), 'ok'); loadPosts(content, page); } catch (e) { toast(t('admin.postList.deleteFail') + (e.message || e), 'err'); }
      }, t('admin.comments.delete'));
    }); });

    var pg = content.querySelector('#abPostPage');
    var html = '';
    if (page > 1) html += '<button class="ab-page-btn" data-p="' + (page - 1) + '">' + t('pagination.prev') + '</button>';
    html += '<button class="ab-page-btn active">' + page + ' / ' + totalPages + '</button>';
    if (page < totalPages) html += '<button class="ab-page-btn" data-p="' + (page + 1) + '">' + t('pagination.next') + '</button>';
    pg.innerHTML = html;
    pg.querySelectorAll('[data-p]').forEach(function (b) { b.addEventListener('click', function () { loadPosts(content, parseInt(b.getAttribute('data-p'), 10)); }); });
  }
  function enc(s) { return encodeURIComponent(s); }
  function dec(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  /* ====================== 编辑器 ====================== */
  function pageEditor(content, route) {
    content.innerHTML =
      '<div class="ab-page-head"><div><h1 class="ab-page-title">' + (route.isNew ? t('admin.editor.newPost') : t('admin.editor.editPost')) + '</h1><p class="ab-page-sub">' + t('editor.markdownHint') + '</p></div></div>' +
      '<div class="ab-editor-head">' +
        '<input class="ab-input" id="abTitle" placeholder="' + t('admin.editor.titlePlaceholder') + '" style="font-size:16px;font-weight:600">' +
        '<div class="ab-editor-meta">' +
          '<div class="ab-field" style="margin:0"><label class="ab-label">' + t('admin.editor.categoryPlaceholder') + '</label><input class="ab-input" id="abCat" list="abCatList" placeholder="' + t('admin.editor.categoryExample') + '"><datalist id="abCatList"></datalist></div>' +
          '<div class="ab-field" style="margin:0"><label class="ab-label">' + t('admin.editor.tagsPlaceholder') + '</label><input class="ab-input" id="abTags" placeholder="' + t('admin.editor.tagsExample') + '"></div>' +
        '</div>' +
        '<div class="ab-field" style="margin:0"><label class="ab-label">' + t('admin.editor.coverPlaceholder') + '</label><div class="ab-row"><input class="ab-input" id="abCover" placeholder="https://…"><button class="ab-btn sm" id="abPickCover">' + t('admin.editor.selectMedia') + '</button></div></div>' +
        '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin:0">' +
          '<label style="display:flex;align-items:center;gap:6px;font-size:14px;cursor:pointer"><input type="checkbox" id="abPinned"> ' + icon('pin', 14) + ' ' + t('admin.editor.pin') + '</label>' +
        '</div>' +
      '</div>' +
      '<div class="ab-editor-split">' +
        '<div class="ab-editor-pane">' +
          '<div class="ab-editor-toolbar" id="abToolbar">' +
            '<button class="ab-tool" data-md="bold" title="' + t('admin.editor.bold') + '">B</button>' +
            '<button class="ab-tool" data-md="italic" title="' + t('admin.editor.italic') + '"><i>I</i></button>' +
            '<button class="ab-tool" data-md="h" title="' + t('admin.editor.heading') + '">H</button>' +
            '<button class="ab-tool" data-md="quote" title="' + t('admin.editor.quote') + '">❝</button>' +
            '<button class="ab-tool" data-md="code" title="' + t('admin.editor.code') + '">&lt;/&gt;</button>' +
            '<button class="ab-tool" data-md="ul" title="' + t('admin.editor.list') + '">≡</button>' +
            '<button class="ab-tool" data-md="link" title="' + t('admin.editor.link') + '">🔗</button>' +
            '<button class="ab-tool" data-md="img" title="' + t('admin.editor.image') + '">🖼</button>' +
          '</div>' +
          '<textarea class="ab-editor-area" id="abBody" placeholder="' + t('admin.editor.writeHint') + '"></textarea>' +
        '</div>' +
        '<div class="ab-editor-pane"><div class="ab-editor-preview" id="abPreviewPane"></div></div>' +
      '</div>' +
      '<div class="ab-row" style="margin-top:16px;justify-content:flex-end;gap:10px">' +
        (cloudOn() ? '' : '<button class="ab-btn" id="abExport">' + t('editor.exportAll') + '</button>') +
        '<button class="ab-btn" id="abSaveDraft">' + t('admin.editor.saveDraft') + '</button>' +
        '<button class="ab-btn primary" id="abPublish">' + icon('check', 15) + ' ' + t('admin.editor.publish') + '</button>' +
      '</div>';

    bindEditor(content, route);
    if (route.id) loadEditor(content, route.id); else updatePreview(content);
  }


  /* ----------------------- 本地图片粘贴 / 拖拽上传 ----------------------- */
  function readImageAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('读取图片失败')); };
      reader.readAsDataURL(file);
    });
  }

  function imageAltName(file) {
    var name = (file && file.name) ? file.name : 'image';
    name = name.replace(/\.[^.]+$/, '').replace(/[\[\]\(\)]/g, '').trim();
    return name || 'image';
  }

  function insertTextAtCursor(area, text) {
    var start = typeof area.selectionStart === 'number' ? area.selectionStart : area.value.length;
    var end = typeof area.selectionEnd === 'number' ? area.selectionEnd : start;
    var before = area.value.slice(0, start);
    var after = area.value.slice(end);
    var prefix = before && !/\n$/.test(before) ? '\n' : '';
    var suffix = after && !/^\n/.test(after) ? '\n' : '';
    var inserted = prefix + text + suffix;
    area.value = before + inserted + after;
    var pos = before.length + inserted.length;
    area.selectionStart = area.selectionEnd = pos;
    area.dispatchEvent(new Event('input', { bubbles: true }));
    area.focus();
  }

  async function uploadEditorImage(file) {
    if (!file || !/^image\/(png|jpeg|gif|webp|avif)$/i.test(file.type || '')) {
      throw new Error('只支持 PNG / JPEG / GIF / WebP / AVIF 图片');
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('单张图片不能超过 8 MB');
    }
    if (!(await localWritable())) {
      throw new Error('图片直传需要使用 python serve.py 本地可写模式');
    }

    var dataUrl = await readImageAsDataURL(file);
    var result = await localApi('/local-api/images', {
      method: 'POST',
      body: JSON.stringify({
        name: file.name || 'image',
        type: file.type,
        dataUrl: dataUrl
      })
    });
    if (!result || !result.url) throw new Error('服务器没有返回图片地址');
    return result;
  }

  async function insertEditorImages(content, area, files) {
    var images = Array.prototype.slice.call(files || []).filter(function (f) {
      return f && /^image\//i.test(f.type || '');
    });
    if (!images.length) return;

    for (var i = 0; i < images.length; i++) {
      var file = images[i];
      try {
        toast('正在保存图片 ' + (i + 1) + '/' + images.length + ' …');
        var result = await uploadEditorImage(file);
        insertTextAtCursor(area, '![' + imageAltName(file) + '](' + result.url + ')');
        toast('图片已保存到 public/images/', 'ok');
      } catch (e) {
        toast('图片上传失败：' + (e.message || e), 'err');
      }
    }
    updatePreview(content);
  }

  function chooseEditorImages(content, area) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/gif,image/webp,image/avif';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      insertEditorImages(content, area, input.files).finally(function () { input.remove(); });
    });
    input.click();
  }

  function bindEditorImagePaste(content, area) {
    area.addEventListener('paste', function (e) {
      var cd = e.clipboardData;
      if (!cd || !cd.items) return;
      var files = [];
      for (var i = 0; i < cd.items.length; i++) {
        var item = cd.items[i];
        if (item.kind === 'file' && /^image\//i.test(item.type || '')) {
          var file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (!files.length) return;
      e.preventDefault();
      insertEditorImages(content, area, files);
    });

    area.addEventListener('dragover', function (e) {
      var dt = e.dataTransfer;
      if (!dt || !dt.types || Array.prototype.indexOf.call(dt.types, 'Files') < 0) return;
      e.preventDefault();
    });

    area.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files.length) return;
      var files = Array.prototype.slice.call(dt.files).filter(function (f) {
        return /^image\//i.test(f.type || '');
      });
      if (!files.length) return;
      e.preventDefault();
      insertEditorImages(content, area, files);
    });
  }

  function bindEditor(content, route) {
    var area = content.querySelector('#abBody');
    area.addEventListener('input', debounce(function () { updatePreview(content); }, 200));
    bindEditorImagePaste(content, area);
    content.querySelector('#abToolbar').querySelectorAll('[data-md]').forEach(function (b) {
      b.addEventListener('click', function () {
        var type = b.getAttribute('data-md');
        if (type === 'img') {
          localWritable().then(function (writable) {
            if (writable) chooseEditorImages(content, area);
            else {
              insertMd(area, type);
              updatePreview(content);
              area.focus();
            }
          });
          return;
        }
        insertMd(area, type);
        updatePreview(content);
        area.focus();
      });
    });
    content.querySelector('#abSaveDraft').addEventListener('click', function () { saveEditor(content, route, 'draft'); });
    content.querySelector('#abPublish').addEventListener('click', function () { saveEditor(content, route, 'published'); });
    var exp = content.querySelector('#abExport');
    if (exp) exp.addEventListener('click', downloadAllStatic);
    var pick = content.querySelector('#abPickCover');
    if (pick) pick.addEventListener('click', function () { openMediaPicker(content); });
    // 填充分类候选
    if (cloudOn()) {
      api('api/posts').then(function (d) {
        var list = (d && d.posts) || [];
        var cats = {}; list.forEach(function (p) { if (p.category) cats[p.category] = 1; });
        content.querySelector('#abCatList').innerHTML = Object.keys(cats).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
      }).catch(function () {});
    }
  }
  function updatePreview(content) {
    var area = content.querySelector('#abBody');
    var pane = content.querySelector('#abPreviewPane');
    var md = area.value || '';
    if (window.renderMarkdown) pane.innerHTML = window.renderMarkdown(md);
    else pane.textContent = md;
  }
  function insertMd(area, type) {
    var s = area.selectionStart, e = area.selectionEnd, v = area.value;
    var sel = v.slice(s, e), pre = '', post = '', rep = sel;
    if (type === 'bold') { pre = '**'; post = '**'; }
    else if (type === 'italic') { pre = '*'; post = '*'; }
    else if (type === 'h') { pre = '## '; }
    else if (type === 'quote') { pre = '> '; }
    else if (type === 'code') { pre = '`'; post = '`'; }
    else if (type === 'ul') { pre = '- '; }
    else if (type === 'link') { rep = '[' + (sel || t('editor.linkBtn')) + '](https://)'; }
    else if (type === 'img') { rep = '![' + (sel || t('editor.imgBtn')) + '](https://)'; }
    area.value = v.slice(0, s) + pre + rep + post + v.slice(e);
    area.selectionStart = area.selectionEnd = s + pre.length + rep.length;
  }
  async function loadEditor(content, id) {
    var p = await getPost(id);
    if (!p) { toast(t('admin.editor.notFound'), 'err'); return; }
    content.querySelector('#abTitle').value = p.title || '';
    content.querySelector('#abCat').value = p.category || '';
    content.querySelector('#abTags').value = (p.tags || []).join(', ');
    content.querySelector('#abCover').value = p.cover || '';
    content.querySelector('#abBody').value = p.content || '';
    content.querySelector('#abPinned').checked = !!p.pinned;
    updatePreview(content);
  }
  async function saveEditor(content, route, status) {
    var title = content.querySelector('#abTitle').value.trim();
    var body = content.querySelector('#abBody').value;
    if (!title) { toast(t('admin.editor.noTitle'), 'err'); return; }
    var id = route.id || slug(title);
    var tags = content.querySelector('#abTags').value.split(/[,，]/).map(function (t) { return t.trim(); }).filter(Boolean);

    var wantPinned = !!content.querySelector('#abPinned').checked;

    var post = {
      id: id, title: title, date: new Date().toISOString().slice(0, 10),
      excerpt: (body.replace(/[#>*`\-!\[\]()]/g, '').slice(0, 120).trim()),
      content: body, cover: content.querySelector('#abCover').value.trim(),
      pinned: wantPinned, tags: tags,
      category: content.querySelector('#abCat').value.trim(),
      status: status
    };

    var btn = status === 'published' ? content.querySelector('#abPublish') : content.querySelector('#abSaveDraft');
    btn.disabled = true;
    try {
      var isNew = !route.id;
      var r = await savePost(post, isNew);
      if (r && (r.ok || r.post)) {
        toast(status === 'published' ? t('admin.editor.saved') : t('admin.editor.savedDraft'), 'ok');
        if (cloudOn() || (r && r.localFile)) {
          go('/admin/posts');
        } else {
          toast(t('admin.editor.savedLocal'), 'ok');
        }
      } else {
        toast(t('admin.editor.saveFail'), 'err');
      }
    } catch (e) {
      if (!cloudOn()) { saveStaticPost(post); toast(t('admin.editor.savedDraft'), 'ok'); }
      else toast(t('admin.editor.saveFail') + (e.message || e), 'err');
    } finally { btn.disabled = false; }
  }

  function openMediaPicker(content) {
    var mask = document.createElement('div');
    mask.className = 'ab-modal-mask';
    mask.innerHTML = '<div class="ab-modal" style="max-width:560px"><h3>' + t('admin.media.title') + '</h3><div id="abPickerGrid" style="max-height:320px;overflow:auto"><span class="ab-spin"></span></div><div class="ab-modal-actions"><button class="ab-btn ghost" data-act="cancel">' + t('confirm.cancel') + '</button></div></div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) { if (e.target === mask || e.target.getAttribute('data-act') === 'cancel') mask.remove(); });
    if (!cloudOn()) { mask.querySelector('#abPickerGrid').innerHTML = '<div class="ab-empty"><p>' + t('admin.media.cloudOnly') + '</p></div>'; return; }
    api('api/media').then(function (d) {
      var list = (d && d.media) || [];
      mask.querySelector('#abPickerGrid').innerHTML = list.length ? ('<div class="ab-media-grid">' + list.map(function (m) {
        return '<div class="ab-media-card" data-url="' + esc(m.url) + '" style="cursor:pointer"><div class="ab-media-thumb"><img src="' + esc(m.url) + '" alt=""></div><div class="ab-media-meta"><div class="ab-media-name">' + esc(m.name || t('admin.media.colImage')) + '</div></div></div>';
      }).join('') + '</div>') : '<div class="ab-empty"><p>' + t('admin.media.empty') + '</p></div>';
      mask.querySelectorAll('[data-url]').forEach(function (c) { c.addEventListener('click', function () {
        content.querySelector('#abCover').value = c.getAttribute('data-url'); mask.remove(); toast(t('admin.editor.selectMedia'), 'ok');
      }); });
    }).catch(function (e) { mask.querySelector('#abPickerGrid').innerHTML = '<div class="ab-empty"><p>' + t('admin.media.readFail') + '</p></div>'; });
  }

  /* ====================== 分类管理 ====================== */
  async function pageCategories(content) {
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">' + t('admin.categories.title') + '</h1><p class="ab-page-sub">' + t('admin.categories.desc') + '</p></div>' +
      (cloudOn() ? '' : '<span class="ab-chip" style="background:var(--ab-primary-weak);color:var(--ab-primary)">' + t('admin.categories.staticHint') + '</span>') + '</div>' +
      '<div class="ab-card"><div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>' + t('admin.categories.colCategory') + '</th><th>' + t('admin.categories.colCount') + '</th><th class="col-actions">' + t('admin.postList.colActions') + '</th></tr></thead><tbody id="abCatBody"></tbody></table></div></div>';
    await loadTerms(content, 'category', '#abCatBody');
  }
  async function pageTags(content) {
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">' + t('admin.tags.title') + '</h1><p class="ab-page-sub">' + t('admin.tags.desc') + '</p></div>' +
      (cloudOn() ? '' : '<span class="ab-chip" style="background:var(--ab-primary-weak);color:var(--ab-primary)">' + t('admin.categories.staticHint') + '</span>') + '</div>' +
      '<div class="ab-card"><div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>' + t('admin.tags.colTag') + '</th><th>' + t('admin.tags.colCount') + '</th><th class="col-actions">' + t('admin.postList.colActions') + '</th></tr></thead><tbody id="abTagBody"></tbody></table></div></div>';
    await loadTerms(content, 'tags', '#abTagBody');
  }
  async function loadTerms(content, field, sel) {
    var body = content.querySelector(sel);
    body.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:24px"><span class="ab-spin"></span> ' + t('admin.postList.loading') + '</td></tr>';
    var posts = [];
    try { posts = await listPosts(); } catch (e) {}
    var map = {};
    posts.forEach(function (p) {
      var vals = field === 'category' ? [(p.category || t('admin.dashboard.uncategorized'))] : (p.tags || []);
      vals.forEach(function (v) { var k = field === 'category' ? (p.category || t('admin.dashboard.uncategorized')) : v; if (k) map[k] = (map[k] || 0) + 1; });
    });
    var keys = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });
    if (!keys.length) { body.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px" class="ab-muted">' + (field === 'category' ? t('admin.categories.noData') : t('admin.tags.noData')) + '</td></tr>'; return; }
    if (!cloudOn()) {
      body.innerHTML = keys.map(function (k) { return '<tr><td><span class="ab-chip ' + (field === 'category' ? 'cat' : '') + '">' + esc(k) + '</span></td><td>' + map[k] + '</td><td class="ab-muted">' + t('admin.categories.staticHint') + '</td></tr>'; }).join('');
      return;
    }
    body.innerHTML = keys.map(function (k) {
      var ek = enc(k);
      return '<tr><td><span class="ab-chip ' + (field === 'category' ? 'cat' : '') + '">' + esc(k) + '</span></td><td>' + map[k] + '</td>' +
        '<td class="col-actions"><button class="ab-btn sm" data-rename="' + ek + '">' + icon('pen', 13) + ' ' + (field === 'category' ? t('admin.categories.rename') : t('admin.tags.rename')) + '</button> ' +
        '<button class="ab-btn sm danger" data-delterm="' + ek + '">' + icon('trash', 13) + ' ' + (field === 'category' ? t('admin.categories.delete') : t('admin.tags.delete')) + '</button></td></tr>';
    }).join('');
    body.querySelectorAll('[data-rename]').forEach(function (b) { b.addEventListener('click', function () { renameTerm(content, field, dec(b.getAttribute('data-rename')), sel); }); });
    body.querySelectorAll('[data-delterm]').forEach(function (b) { b.addEventListener('click', function () {
      var old = dec(b.getAttribute('data-delterm'));
      confirmModal((field === 'category' ? t('admin.categories.delete') : t('admin.tags.delete')), '<p class="ab-muted">' + (field === 'category' ? t('admin.categories.deleteConfirm', { name: esc(old) }) : t('admin.tags.deleteConfirm', { name: esc(old) })) + '</p>', async function () {
        try { await applyTermChange(field, old, null); toast(field === 'category' ? t('admin.categories.renameOk') : t('admin.tags.renameOk'), 'ok'); loadTerms(content, field, sel); } catch (e) { toast(t('admin.postList.opFail') + (e.message || e), 'err'); }
      }, t('admin.comments.delete'));
    }); });
  }
  async function renameTerm(content, field, old, sel) {
    var nv = prompt(t('admin.categories.rename') + '「' + old + '」', old);
    if (nv == null) return; nv = nv.trim();
    if (!nv || nv === old) return;
    try { await applyTermChange(field, old, nv); toast(field === 'category' ? t('admin.categories.renameOk') : t('admin.tags.renameOk'), 'ok'); loadTerms(content, field, sel); } catch (e) { toast(t('admin.postList.opFail') + (e.message || e), 'err'); }
  }
  async function applyTermChange(field, old, neo) {
    var summary = await listPosts();
    var ids = [];
    summary.forEach(function (p) {
      if (field === 'category') { if ((p.category || t('admin.dashboard.uncategorized')) === old) ids.push(p.id); }
      else { if ((p.tags || []).indexOf(old) >= 0) ids.push(p.id); }
    });
    for (var i = 0; i < ids.length; i++) {
      // 必须取「完整」文章（含正文）再改字段后回写，否则云端 PUT 会清空正文
      var full = await getPost(ids[i]);
      if (!full) continue;
      if (field === 'category') { full.category = neo || t('admin.dashboard.uncategorized'); }
      else {
        var tags = (full.tags || []).slice();
        var j = tags.indexOf(old);
        if (j >= 0) { if (neo) { tags[j] = neo; } else { tags.splice(j, 1); } full.tags = tags; }
      }
      await savePost(full, false);
    }
  }

  /* ====================== 评论管理 ====================== */
  async function pageComments(content, filter) {
    var title = filter === 'pending' ? t('admin.comments.pending') : t('admin.comments.title');
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">' + title + '</h1><p class="ab-page-sub">' + t('admin.comments.desc') + '</p></div>' +
      (cloudOn() ? '' : '<span class="ab-chip" style="background:var(--ab-primary-weak);color:var(--ab-primary)">' + t('admin.categories.staticHint') + '</span>') + '</div>' +
      (cloudOn() ? '' : '<div class="ab-card"><div class="ab-empty"><div class="ab-empty-ico">💬</div><p>' + t('admin.comments.cloudOnly') + '</p></div></div>');
    if (!cloudOn()) return;
    content.innerHTML += '<div class="ab-toolbar">' +
      '<div class="ab-search"><input class="ab-input" id="abCmtKw" placeholder="' + t('admin.comments.search') + '"></div>' +
      '<select class="ab-select" id="abCmtFilter" style="max-width:160px"><option value="all">' + t('admin.comments.all') + '</option><option value="pending"' + (filter === 'pending' ? ' selected' : '') + '>' + t('admin.comments.pendingStatus') + '</option><option value="approved">' + t('admin.comments.approved') + '</option></select>' +
      '</div><div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>' + t('admin.comments.colAuthor') + '</th><th>' + t('admin.comments.colContent') + '</th><th>' + t('admin.comments.colPost') + '</th><th>' + t('admin.comments.colDate') + '</th><th>' + t('admin.comments.colStatus') + '</th><th class="col-actions">' + t('admin.comments.colActions') + '</th></tr></thead><tbody id="abCmtBody"></tbody></table></div>';
    bindComments(content);
    loadComments(content, filter);
  }
  function bindComments(content) {
    var kw = content.querySelector('#abCmtKw');
    var f = content.querySelector('#abCmtFilter');
    kw.addEventListener('input', debounce(function () { loadComments(content, f.value); }, 250));
    f.addEventListener('change', function () { loadComments(content, f.value); });
  }
  async function loadComments(content, filter) {
    var body = content.querySelector('#abCmtBody');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px"><span class="ab-spin"></span> ' + t('admin.postList.loading') + '</td></tr>';
    var d;
    try { d = await api('api/comments?status=' + (filter === 'pending' ? 'pending' : 'all')); } catch (e) { body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px" class="ab-muted">' + t('admin.postList.loadFail') + esc(e.message || e) + '</td></tr>'; return; }
    var list = (d && d.comments) || [];
    var kw = (content.querySelector('#abCmtKw').value || '').trim().toLowerCase();
    if (kw) list = list.filter(function (c) { return ((c.author || '') + ' ' + (c.content || '')).toLowerCase().indexOf(kw) >= 0; });
    if (!list.length) { body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:34px" class="ab-muted">' + t('admin.dashboard.noComments') + '</td></tr>'; return; }
    body.innerHTML = list.map(function (c) {
      var st = c.status || 'approved';
      var actions = '';
      if (st === 'pending') actions += '<button class="ab-btn sm primary" data-approve="' + enc(c.id) + '">' + icon('check', 13) + ' ' + t('admin.comments.approve') + '</button> ';
      actions += '<button class="ab-btn sm danger" data-delcmt="' + enc(c.id) + '">' + icon('trash', 13) + ' ' + t('admin.comments.delete') + '</button>';
      return '<tr>' +
        '<td>' + esc(c.author || t('admin.comments.anonymous')) + '</td>' +
        '<td style="max-width:320px">' + esc((c.content || '').slice(0, 120)) + '</td>' +
        '<td>' + esc(c.post_title || c.post_id || '—') + '</td>' +
        '<td>' + esc(fmtDate(c.date)) + '</td>' +
        '<td><span class="ab-status ' + st + '">' + (st === 'pending' ? t('admin.comments.pendingStatus') : t('admin.comments.approved')) + '</span></td>' +
        '<td class="col-actions">' + actions + '</td>' +
      '</tr>';
    }).join('');
    body.querySelectorAll('[data-approve]').forEach(function (b) { b.addEventListener('click', function () { approveComment(content, dec(b.getAttribute('data-approve')), filter); }); });
    body.querySelectorAll('[data-delcmt]').forEach(function (b) { b.addEventListener('click', function () {
      var cid = dec(b.getAttribute('data-delcmt'));
      confirmModal(t('admin.comments.delete'), '<p class="ab-muted">' + t('admin.comments.deleteConfirm') + '</p>', async function () {
        try { await api('api/comments/' + enc(cid), { method: 'DELETE' }); toast(t('admin.comments.deleted'), 'ok'); loadComments(content, filter); } catch (e) { toast(t('admin.postList.opFail') + (e.message || e), 'err'); }
      }, t('admin.comments.delete'));
    }); });
  }
  async function approveComment(content, cid, filter) {
    try { await api('api/comments/' + enc(cid), { method: 'PUT', body: JSON.stringify({ status: 'approved' }) }); toast(t('admin.comments.approvedOk'), 'ok'); loadComments(content, filter); } catch (e) { toast(t('admin.postList.opFail') + (e.message || e), 'err'); }
  }

  /* ====================== 媒体库 ====================== */
  function pageMedia(content) {
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">' + t('admin.media.title') + '</h1><p class="ab-page-sub">' + t('admin.media.desc') + '</p></div>' +
      (cloudOn() ? '<label class="ab-btn primary">' + icon('upload', 15) + ' ' + t('admin.media.upload') + '<input type="file" id="abUpload" accept="image/*" multiple hidden></label>' : '<span class="ab-chip" style="background:var(--ab-primary-weak);color:var(--ab-primary)">' + t('admin.categories.staticHint') + '</span>') + '</div>' +
      (cloudOn() ? '' : '<div class="ab-card"><div class="ab-empty"><div class="ab-empty-ico">🖼</div><p>' + t('admin.media.cloudOnly') + '</p></div></div>');
    if (!cloudOn()) return;
    content.innerHTML += '<div class="ab-media-grid" id="abMediaGrid"><span class="ab-spin"></span></div>';
    var up = content.querySelector('#abUpload');
    up.addEventListener('change', function () { uploadFiles(content, up.files); });
    loadMedia(content);
  }
  async function loadMedia(content) {
    var grid = content.querySelector('#abMediaGrid');
    grid.innerHTML = '<span class="ab-spin"></span> ' + t('admin.postList.loading');
    try {
      var d = await api('api/media');
      var list = (d && d.media) || [];
      grid.innerHTML = list.length ? list.map(function (m) {
        return '<div class="ab-media-card">' +
          '<div class="ab-media-thumb"><img src="' + esc(m.url) + '" alt="' + esc(m.name || '') + '"></div>' +
          '<div class="ab-media-meta"><div class="ab-media-name">' + esc(m.name || t('admin.media.colImage')) + '</div><div class="ab-media-size">' + fmtSize(m.size) + '</div></div>' +
          '<div class="ab-media-actions"><button class="ab-btn sm" data-copy="' + enc(m.url) + '">' + t('admin.media.copyLink') + '</button><button class="ab-btn sm danger" data-delmedia="' + enc(m.id) + '">' + icon('trash', 13) + ' ' + t('admin.media.delete') + '</button></div>' +
        '</div>';
      }).join('') : '<div class="ab-card ab-empty"><div class="ab-empty-ico">🖼</div><p>' + t('admin.media.empty') + '</p></div>';
      grid.querySelectorAll('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copyText(dec(b.getAttribute('data-copy'))); toast(t('admin.media.copied'), 'ok'); }); });
      grid.querySelectorAll('[data-delmedia]').forEach(function (b) { b.addEventListener('click', function () {
        var mid = dec(b.getAttribute('data-delmedia'));
        confirmModal(t('admin.media.delete'), '<p class="ab-muted">' + t('admin.media.deleteConfirm') + '</p>', async function () {
          try { await api('api/media/' + enc(mid), { method: 'DELETE' }); toast(t('admin.media.deleted'), 'ok'); loadMedia(content); } catch (e) { toast(t('admin.postList.opFail') + (e.message || e), 'err'); }
        }, t('admin.comments.delete'));
      }); });
    } catch (e) { grid.innerHTML = '<div class="ab-empty"><p>' + t('admin.postList.loadFail') + esc(e.message || e) + '</p></div>'; }
  }
  function copyText(t) {
    try { if (navigator.clipboard) navigator.clipboard.writeText(t); else { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } } catch (e) {}
  }
  async function uploadFiles(content, files) {
    if (!files || !files.length) return;
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (!/^image\//.test(file.type)) { toast(file.name + ' ' + t('admin.media.notImage'), 'err'); continue; }
      if (file.size > 2 * 1048576) { toast(file.name + ' ' + t('admin.media.tooLarge'), 'err'); continue; }
      try {
        var dataUrl = await readAsDataURL(file);
        await api('api/media', { method: 'POST', body: JSON.stringify({ name: file.name, url: dataUrl, type: file.type, size: file.size }) });
        toast(t('admin.media.uploaded') + ' ' + file.name, 'ok');
      } catch (e) { toast(t('admin.media.uploadFail') + (e.message || e), 'err'); }
    }
    loadMedia(content);
  }
  function readAsDataURL(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = function () { rej(new Error(t('admin.media.readFail'))); };
      r.readAsDataURL(file);
    });
  }

  /* ====================== 博客设置 ====================== */
  function pageSettings(content) {
    content.innerHTML = '<div class="ab-page-head"><div><h1 class="ab-page-title">' + t('admin.settings.title') + '</h1><p class="ab-page-sub">' + t('admin.settings.desc') + '</p></div>' +
      (cloudOn() ? '<button class="ab-btn primary" id="abSaveSettings">' + icon('save', 15) + ' ' + t('admin.settings.save') + '</button>' : '<span class="ab-chip" style="background:var(--ab-primary-weak);color:var(--ab-primary)">' + t('admin.categories.staticHint') + '</span>') + '</div>' +
      (cloudOn() ? '' : '<div class="ab-card"><div class="ab-empty"><div class="ab-empty-ico">⚙️</div><p>' + t('admin.settings.desc') + '</p></div></div>');
    if (!cloudOn()) return;
    content.innerHTML += '<div class="ab-tabs">' +
      '<div class="ab-tab active" data-tab="site">' + t('admin.settings.siteInfo') + '</div>' +
      '<div class="ab-tab" data-tab="profile">' + t('admin.settings.profile') + '</div>' +
      '<div class="ab-tab" data-tab="nav">' + t('admin.settings.navMenu') + '</div>' +
      '</div><div id="abSettingsBody"></div>';
    content.querySelectorAll('.ab-tab').forEach(function (t) { t.addEventListener('click', function () { content.querySelectorAll('.ab-tab').forEach(function (x) { x.classList.remove('active'); }); t.classList.add('active'); renderSettingsTab(content, t.getAttribute('data-tab')); }); });
    renderSettingsTab(content, 'site');
    content.querySelector('#abSaveSettings').addEventListener('click', function () { saveSettings(content); });
    loadSettings(content);
  }
  var settingsCache = {};
  async function loadSettings(content) {
    try { var d = await api('api/settings'); settingsCache = (d && d.settings) || {}; } catch (e) { settingsCache = {}; }
    fillSettings(content);
  }
  function fillSettings(content) {
    var s = settingsCache;
    var site = safeJson(s.site_info);
    var prof = safeJson(s.profile);
    var navRaw = s.nav;
    if (content.querySelector('#abSiteName')) content.querySelector('#abSiteName').value = site.name || (cfg().footer && cfg().footer.copyrightName) || '';
    if (content.querySelector('#abSiteDesc')) content.querySelector('#abSiteDesc').value = site.desc || '';
    if (content.querySelector('#abSiteAvatar')) content.querySelector('#abSiteAvatar').value = site.avatar || '';
    if (content.querySelector('#abFooterCopyright')) content.querySelector('#abFooterCopyright').value = site.copyright || (cfg().footer && cfg().footer.copyrightName) || '';
    if (content.querySelector('#abFooterText')) content.querySelector('#abFooterText').value = site.footerText || (cfg().footer && cfg().footer.decl) || '';
    if (content.querySelector('#abModerate')) content.querySelector('#abModerate').checked = s.moderate_comments === '1';
    if (content.querySelector('#abProfileName')) content.querySelector('#abProfileName').value = prof.name || '';
    if (content.querySelector('#abProfileBio')) content.querySelector('#abProfileBio').value = prof.bio || '';
    if (content.querySelector('#abProfileAvatar')) content.querySelector('#abProfileAvatar').value = prof.avatar || '';
    if (content.querySelector('#abProfileEmail')) content.querySelector('#abProfileEmail').value = prof.email || '';
    if (content.querySelector('#abNavJson')) content.querySelector('#abNavJson').value = navRaw ? (typeof navRaw === 'string' ? navRaw : JSON.stringify(navRaw, null, 2)) : JSON.stringify(cfg().nav || [], null, 2);
  }
  function safeJson(v) { if (!v) return {}; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch (e) { return {}; } }
  function renderSettingsTab(content, tab) {
    var body = content.querySelector('#abSettingsBody');
    if (tab === 'site') {
      body.innerHTML = '<div class="ab-card" style="max-width:620px">' +
        '<div class="ab-field"><label class="ab-label">' + t('admin.settings.siteName') + '</label><input class="ab-input" id="abSiteName"></div>' +
        '<div class="ab-field"><label class="ab-label">' + t('admin.settings.siteDesc') + '</label><textarea class="ab-textarea" id="abSiteDesc" style="min-height:70px"></textarea></div>' +
        '<div class="ab-field"><label class="ab-label">' + t('admin.settings.siteAvatar') + '</label><input class="ab-input" id="abSiteAvatar"></div>' +
        '<div class="ab-field"><label class="ab-label">' + t('admin.settings.footerCopyright') + '</label><input class="ab-input" id="abFooterCopyright"></div>' +
        '<div class="ab-field"><label class="ab-label">' + t('admin.settings.footerDecl') + '</label><textarea class="ab-textarea" id="abFooterText" style="min-height:70px"></textarea></div>' +
        '<div class="ab-field"><label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer"><input type="checkbox" id="abModerate"> ' + t('admin.settings.moderateComments') + '</label></div>' +
      '</div>';
    } else if (tab === 'profile') {
      body.innerHTML = '<div class="ab-card" style="max-width:620px">' +
        '<div class="ab-avatar-edit"><img class="ab-avatar-prev" id="abProfPrev" src=""><div><div class="ab-label" style="margin:0">' + t('admin.settings.profileAvatar') + '</div><div class="ab-hint">' + t('admin.settings.avatarUrl') + '</div></div></div>' +
        '<div class="ab-field"><label class="ab-label">' + t('admin.settings.nickname') + '</label><input class="ab-input" id="abProfileName"></div>' +
        '<div class="ab-field"><label class="ab-label">' + t('admin.settings.bio') + '</label><textarea class="ab-textarea" id="abProfileBio" style="min-height:70px"></textarea></div>' +
        '<div class="ab-field"><label class="ab-label">' + t('admin.settings.avatarUrl') + '</label><input class="ab-input" id="abProfileAvatar"></div>' +
        '<div class="ab-field"><label class="ab-label">' + t('admin.settings.email') + '</label><input class="ab-input" id="abProfileEmail"></div>' +
      '</div>';
      var pa = body.querySelector('#abProfileAvatar');
      var pv = body.querySelector('#abProfPrev');
      pa.addEventListener('input', function () { pv.src = pa.value; });
    } else if (tab === 'nav') {
      var defaultNav = [
        { text: t('admin.settings.defaultHome'), url: '/' },
        { text: t('admin.settings.defaultArchive'), url: '/archive' },
        { text: t('admin.settings.defaultAbout'), url: '/about' },
        { text: t('admin.settings.defaultFriends'), url: '/links' }
      ];
      var exJson = JSON.stringify(settingsCache.nav ? (typeof settingsCache.nav === 'string' ? JSON.parse(settingsCache.nav || '[]') : settingsCache.nav) : (cfg().nav || defaultNav), null, 2);
      body.innerHTML = '<div class="ab-card" style="max-width:720px">' +
        '<div class="ab-section-title">' + icon('list', 15) + ' ' + t('admin.settings.visualEditor') + '</div>' +
        '<div id="abNavVisual" class="ab-nav-editor"></div>' +
        '<div class="ab-section-title" style="margin-top:16px">' + icon('doc', 15) + ' ' + t('admin.settings.jsonEditor') + '</div>' +
        '<div class="ab-hint" style="margin-bottom:8px">' + t('admin.settings.navJsonHint') + '</div>' +
        '<textarea class="ab-textarea" id="abNavJson" style="min-height:180px;font-family:monospace;font-size:13px"></textarea>' +
        '<div class="ab-row" style="margin-top:8px;gap:8px">' +
          '<button class="ab-btn sm" id="abNavFormat">' + t('admin.settings.formatJson') + '</button>' +
          '<button class="ab-btn sm" id="abNavReset">' + t('admin.settings.resetDefault') + '</button>' +
        '</div>' +
      '</div>';
      renderNavVisual(content, exJson);
      // JSON 格式化
      var fmtBtn = content.querySelector('#abNavFormat');
      if (fmtBtn) fmtBtn.addEventListener('click', function () {
        var ta = content.querySelector('#abNavJson');
        try { ta.value = JSON.stringify(JSON.parse(ta.value), null, 2); toast(t('admin.settings.formatted'), 'ok'); } catch (e) { toast(t('admin.settings.jsonError'), 'err'); }
      });
      // 恢复默认
      var rstBtn = content.querySelector('#abNavReset');
      if (rstBtn) rstBtn.addEventListener('click', function () {
        content.querySelector('#abNavJson').value = JSON.stringify(defaultNav, null, 2);
        renderNavVisual(content, JSON.stringify(defaultNav, null, 2));
        toast(t('admin.settings.resetDone'), 'ok');
      });
      // 双向同步：JSON textarea → 可视化
      content.querySelector('#abNavJson').addEventListener('input', debounce(function () {
        renderNavVisual(content, content.querySelector('#abNavJson').value);
      }, 400));
    }
    fillSettings(content);
  }
  async function saveSettings(content) {
    var site = {
      name: val(content, '#abSiteName'), desc: val(content, '#abSiteDesc'), avatar: val(content, '#abSiteAvatar'),
      copyright: val(content, '#abFooterCopyright'), footerText: val(content, '#abFooterText')
    };
    var prof = {
      name: val(content, '#abProfileName'), bio: val(content, '#abProfileBio'),
      avatar: val(content, '#abProfileAvatar'), email: val(content, '#abProfileEmail')
    };
    var navRaw = val(content, '#abNavJson');
    try { JSON.parse(navRaw); } catch (e) { toast(t('admin.settings.jsonError'), 'err'); return; }
    var payload = {
      site_info: site, profile: prof, nav: navRaw,
      moderate_comments: content.querySelector('#abModerate') && content.querySelector('#abModerate').checked ? '1' : '0'
    };
    try {
      await api('api/settings', { method: 'PUT', body: JSON.stringify(payload) });
      toast(t('admin.settings.saved'), 'ok');
    } catch (e) { toast(t('admin.settings.saveFail') + (e.message || e), 'err'); }
  }
  function val(content, sel) { var el = content.querySelector(sel); return el ? el.value : ''; }

  /* ---------- 可视化导航编辑器 ---------- */
  function renderNavVisual(content, jsonStr) {
    var wrap = content.querySelector('#abNavVisual');
    if (!wrap) return;
    var items = [];
    try { items = JSON.parse(jsonStr || '[]'); } catch (e) { wrap.innerHTML = '<div class="ab-hint">' + t('admin.settings.jsonError') + '</div>'; return; }
    if (!items.length) { wrap.innerHTML = '<div class="ab-hint">' + t('admin.settings.resetDone') + '</div>'; }
    else {
      wrap.innerHTML = '<div class="ab-nav-list">' + items.map(function (it, i) {
        var children = (it.children || []).map(function (ch, ci) {
          return '<div class="ab-nav-row child">' +
            '<span class="ab-nav-ico">└</span>' +
            '<input class="ab-input ab-nav-text" data-idx="' + i + '" data-cidx="' + ci + '" value="' + esc(ch.text || '') + '" placeholder="' + t('admin.settings.subMenu') + '">' +
            '<input class="ab-input ab-nav-url" data-idx="' + i + '" data-cidx="' + ci + '" value="' + esc(ch.url || '') + '" placeholder="/path">' +
            '<button class="ab-btn-icon danger" data-rmchild="' + i + '-' + ci + '" title="' + t('admin.comments.delete') + '">' + icon('trash', 14) + '</button>' +
          '</div>';
        }).join('');
        return '<div class="ab-nav-row">' +
          '<span class="ab-nav-ico">' + icon('list', 14) + '</span>' +
          '<input class="ab-input ab-nav-text" data-idx="' + i + '" value="' + esc(it.text || '') + '" placeholder="' + t('admin.settings.newMenu') + '">' +
          '<input class="ab-input ab-nav-url" data-idx="' + i + '" value="' + esc(it.url || '') + '" placeholder="/path">' +
          '<button class="ab-btn-icon" data-addchild="' + i + '" title="' + t('admin.settings.subMenu') + '">' + icon('plus', 14) + '</button>' +
          '<button class="ab-btn-icon danger" data-rmitem="' + i + '" title="' + t('admin.comments.delete') + '">' + icon('trash', 14) + '</button>' +
        '</div>' + children;
      }).join('') + '</div>';
    }
    // 添加按钮
    wrap.innerHTML += '<button class="ab-btn sm" id="abNavAddItem" style="margin-top:8px">' + icon('plus', 13) + ' ' + t('admin.settings.addMenuItem') + '</button>';

    // 事件：编辑文本 → 同步到 JSON
    function syncToJSON() {
      var rows = wrap.querySelectorAll('.ab-nav-row');
      var newItems = [];
      rows.forEach(function (row) {
        if (row.classList.contains('child')) return; // 子项在父项循环中处理
        var idx = parseInt(row.querySelector('[data-idx]').getAttribute('data-idx'), 10);
        var text = (row.querySelector('.ab-nav-text') || {}).value || '';
        var url = (row.querySelector('.ab-nav-url') || {}).value || '';
        var children = [];
        wrap.querySelectorAll('.ab-nav-row.child[data-idx="' + idx + '"]').forEach(function (cr) {
          children.push({ text: (cr.querySelector('.ab-nav-text') || {}).value || '', url: (cr.querySelector('.ab-nav-url') || {}).value || '' });
        });
        var item = { text: text, url: url };
        if (children.length) item.children = children;
        newItems.push(item);
      });
      content.querySelector('#abNavJson').value = JSON.stringify(newItems, null, 2);
    }
    wrap.querySelectorAll('input').forEach(function (inp) { inp.addEventListener('input', debounce(syncToJSON, 300)); });

    // 添加菜单项
    wrap.querySelector('#abNavAddItem').addEventListener('click', function () {
      var ta = content.querySelector('#abNavJson');
      try {
        var arr = JSON.parse(ta.value || '[]');
        arr.push({ text: t('admin.settings.newMenu'), url: '/' });
        ta.value = JSON.stringify(arr, null, 2);
        renderNavVisual(content, ta.value);
      } catch (e) { toast(t('admin.settings.jsonError'), 'err'); }
    });

    // 添加子菜单
    wrap.querySelectorAll('[data-addchild]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-addchild'), 10);
        var ta = content.querySelector('#abNavJson');
        try {
          var arr = JSON.parse(ta.value || '[]');
          if (!arr[idx]) return;
          if (!arr[idx].children) arr[idx].children = [];
          arr[idx].children.push({ text: t('admin.settings.subMenu'), url: '/' });
          ta.value = JSON.stringify(arr, null, 2);
          renderNavVisual(content, ta.value);
        } catch (e) { toast(t('admin.settings.jsonError'), 'err'); }
      });
    });

    // 删除菜单项
    wrap.querySelectorAll('[data-rmitem]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-rmitem'), 10);
        var ta = content.querySelector('#abNavJson');
        try {
          var arr = JSON.parse(ta.value || '[]');
          arr.splice(idx, 1);
          ta.value = JSON.stringify(arr, null, 2);
          renderNavVisual(content, ta.value);
        } catch (e) { toast(t('admin.settings.jsonError'), 'err'); }
      });
    });

    // 删除子菜单
    wrap.querySelectorAll('[data-rmchild]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.getAttribute('data-rmchild').split('-');
        var idx = parseInt(parts[0], 10), cidx = parseInt(parts[1], 10);
        var ta = content.querySelector('#abNavJson');
        try {
          var arr = JSON.parse(ta.value || '[]');
          if (arr[idx] && arr[idx].children) arr[idx].children.splice(cidx, 1);
          ta.value = JSON.stringify(arr, null, 2);
          renderNavVisual(content, ta.value);
        } catch (e) { toast(t('admin.settings.jsonError'), 'err'); }
      });
    });
  }

  /* ====================== 修改密码 ====================== */
  function openPasswordModal(onSuccess) {
    var mask = document.createElement('div');
    mask.className = 'ab-modal-mask';
    mask.innerHTML = '<div class="ab-modal"><h3>' + t('admin.pwdModal.title') + '</h3>' +
      '<div class="ab-field" style="margin-bottom:12px"><label class="ab-label">' + t('admin.pwdModal.confirmPwd') + '</label><input class="ab-input" id="abCurPwd" type="password"></div>' +
      '<div class="ab-field" style="margin-bottom:12px"><label class="ab-label">' + t('admin.pwdModal.newPwd') + '</label><input class="ab-input" id="abNewPwd" type="password"></div>' +
      '<div class="ab-modal-actions"><button class="ab-btn ghost" data-act="cancel">' + t('confirm.cancel') + '</button><button class="ab-btn primary" id="abDoPwd">' + t('admin.pwdModal.change') + '</button></div></div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) { if (e.target === mask || e.target.getAttribute('data-act') === 'cancel') mask.remove(); });
    mask.querySelector('#abDoPwd').addEventListener('click', async function () {
      var cur = mask.querySelector('#abCurPwd').value, pwd = mask.querySelector('#abNewPwd').value;
      if (!cur || !pwd) { toast(t('admin.pwdRequired'), 'err'); return; }
      if (pwd.length < 6) { toast(t('admin.pwdModal.newPwd'), 'err'); return; }
      try {
        await api('api/admin/password', { method: 'POST', body: JSON.stringify({ current: cur, password: pwd }) });
        toast(t('admin.pwdModal.success'), 'ok');
        mask.remove();
        if (cloudOn()) window.cloudLogout && window.cloudLogout();
        if (onSuccess) onSuccess(); else go('/admin');
      } catch (e) { toast(t('admin.pwdModal.fail') + (e.message || e), 'err'); }
    });
  }

  /* ----------------------- 导出 ----------------------- */
  window.QingyuAdmin = { mount: mount };

  /* app.js 先于本脚本执行时，初次 route() 因 QingyuAdmin 尚未定义而走了旧后台渲染。
   * 本脚本加载完成后，若当前已在后台路由，重新分发一次路由以挂载新版后台 UI。 */
  try {
    var _p = (typeof window.currentRoute === 'function') ? window.currentRoute().path : (location.pathname || '/');
    if (_p === '/write' || _p === '/admin' || _p.indexOf('/admin/') === 0 || /^\/posts\/[^\/]+\/edit$/.test(_p) || _p === '/posts/edit') {
      if (typeof window.route === 'function') window.route();
    }
  } catch (e) {}
})();
