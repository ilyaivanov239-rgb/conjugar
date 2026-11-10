(function () {
  'use strict';
  var E = window.PTEngine, D = window.PTData;
  var KEY = 'conjugar-b12-v1';
  var DAY = 86400000;
  var BOX_DAYS = [0, 1, 3, 7, 21];

  // ---------- хранилище ----------
  var DEFAULTS = {
    tenses: ['cpres', 'pres', 'pps', 'imp', 'fut', 'cond', 'cimp', 'cfut', 'impa', 'impn'],
    vf: 'all', strict: true, mode: 'one',
    sBoard: 'all', sTense: 'all', sHint: true,
    wTopic: 'all', wMode: 'type', wDir: 'pt',
    lMode: 'sent', lSlow: false, lTr: false, wTr: true, voice: '', batch: 10
  };
  var store = { srs: {}, tense: {}, words: { ok: 0, bad: 0 }, listen: { ok: 0, bad: 0 }, days: [], set: {}, alt: {} };
  function load() {
    try {
      var r = localStorage.getItem(KEY);
      if (r) { var o = JSON.parse(r); if (o && typeof o === 'object') for (var k in o) store[k] = o[k]; }
    } catch (e) {}
    var s = {};
    for (var k in DEFAULTS) s[k] = DEFAULTS[k];
    for (var k2 in (store.set || {})) s[k2] = store.set[k2];
    if (!s.v2) { s.v2 = 1; ['impa', 'impn'].forEach(function (id) { if (s.tenses.indexOf(id) < 0) s.tenses.push(id); }); }
    if (!s.v3) { s.v3 = 1; s.wMode = 'type'; }
    s.mode = 'one';
    store.set = s;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  load();
  var SET = store.set;

  // ---------- уровень ученика ----------
  // Выбранный уровень получает вес 1, нижние уровни встречаются реже (1/2, 1/4, 1/8), на ступень выше иногда, дальше нет.
  var LV = ['A1', 'A2', 'B1', 'B2'];
  var LV_INFO = {
    A1: 'Начинаю: Presente, базовые слова',
    A2: 'Прошедшие времена и императив, повседневные слова',
    B1: 'Futuro, Condicional, Presente do Conjuntivo',
    B2: 'Все времена и Conjuntivo, абстрактная лексика'
  };
  var TL = D.TENSE_LEVEL || {};
  function lvIdx(l) { var i = LV.indexOf(l); return i < 0 ? 2 : i; }
  function lvWeight(l, floorUp) {
    var d = lvIdx(l) - lvIdx(SET.level || 'B1');
    if (d === 0) return 1;
    if (d < 0) return Math.max(0.12, Math.pow(0.5, -d));
    if (d === 1) return 0.3;
    return floorUp ? 0.3 : 0;
  }
  // выбор с учётом уровня: сначала уровень (по весу), затем равновероятно внутри уровня,
  // чтобы редкий A1 не тонул среди сотен слов B2
  function pickLv(a, lvOf, floorUp) {
    if (!a.length) return undefined;
    if (!SET.level) return pickOne(a);
    var by = {}, tot = 0, l, k;
    for (var i = 0; i < a.length; i++) { l = lvOf(a[i]); (by[l] = by[l] || []).push(a[i]); }
    var ws = [];
    for (k in by) { var w = lvWeight(k, floorUp); if (w > 0) { ws.push([k, w]); tot += w; } }
    if (!tot) return pickOne(a);
    var r = Math.random() * tot;
    for (var j = 0; j < ws.length; j++) { r -= ws[j][1]; if (r <= 0) return pickOne(by[ws[j][0]]); }
    return pickOne(by[ws[ws.length - 1][0]]);
  }
  function levelTenses(level) {
    return Object.keys(E.TENSES).filter(function (id) { return lvIdx(TL[id] || 'B1') <= lvIdx(level); });
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function streak() {
    var days = store.days || [], set = {}, n = 0, i;
    days.forEach(function (d) { set[d] = 1; });
    var d = new Date();
    if (!set[today()]) d = new Date(d.getTime() - DAY);
    for (i = 0; i < 4000; i++) {
      var s = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      if (set[s]) { n++; d = new Date(d.getTime() - DAY); } else break;
    }
    return n;
  }

  function record(key, group, ok, label) {
    var now = Date.now();
    var bq = BT[key.charAt(0)];
    if (bq && bq.cur && bq.t[bq.cur.key] && bq.t[bq.cur.key].tries > 0) {
      // повторный ответ внутри раунда: в расписание и статистику не идёт, считается только первая попытка
      var td0 = today();
      if (store.days.indexOf(td0) < 0) { store.days.push(td0); save(); }
      return;
    }
    var it = store.srs[key] || { box: 0, due: 0, ok: 0, bad: 0 };
    if (ok) { it.ok++; it.box = Math.min(4, it.box + 1); } else { it.bad++; it.box = 0; }
    it.due = now + BOX_DAYS[it.box] * DAY;
    if (label) it.lab = label;
    store.srs[key] = it;
    if (group === 'words') store.words[ok ? 'ok' : 'bad']++;
    else if (group === 'listen') store.listen[ok ? 'ok' : 'bad']++;
    else {
      var t = store.tense[group] || { ok: 0, bad: 0 };
      t[ok ? 'ok' : 'bad']++;
      store.tense[group] = t;
    }
    var td = today();
    if (store.days.indexOf(td) < 0) { store.days.push(td); if (store.days.length > 800) store.days.shift(); }
    save();
  }
  function setPref(k, v) { SET[k] = v; save(); }

  // ---------- утилиты ----------
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s).trim().toLowerCase().replace(/\s+/g, ' '); }
  function strip(s) { return norm(s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pickOne(a) { return a[rnd(a.length)]; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // оценка: сравнение ответа с эталоном. 'ok' | 'near' (верно кроме диакритики) | 'bad'
  function judge(user, target, strict) {
    var n = norm(user);
    if (!n) return { v: 'empty' };
    var t = norm(target);
    var cands = [t];
    if (t.indexOf('não ') === 0) cands.push(t.slice(4));
    for (var i = 0; i < cands.length; i++) if (n === cands[i]) return { v: 'ok' };
    var sn = strip(n);
    for (var j = 0; j < cands.length; j++) {
      if (sn === strip(cands[j])) return strict ? { v: 'near', mac: /[āēīōū]|\u0304/.test(user) } : { v: 'ok', accent: true };
    }
    return { v: 'bad' };
  }

  function nearTxt(r) { return 'Почти, ошибка в диакритике' + (r && r.mac ? '. Похоже, вместо тильды (~) введён макрон (¯): выбери в клавиатуре знак с волнистой линией' : ''); }

  // выбор элемента: просроченные и новые важнее, свежевыученные реже
  function score(key) {
    var it = store.srs[key];
    if (!it) return 1 + Math.random() * 0.5;
    if (it.due <= Date.now()) return 2 + (4 - it.box) * 0.4 + Math.random() * 0.5;
    return 0.1 + Math.random() * 0.3;
  }
  function chooseBest(makeCand, tries) {
    var best = null, bs = -1;
    for (var i = 0; i < tries; i++) {
      var c = makeCand();
      var s = score(c.key);
      if (s > bs) { bs = s; best = c; }
    }
    return best;
  }

  // ---------- раунды: N заданий, ошибки возвращаются, пока все ответы не станут верными ----------
  var BT = {};
  function batchOn() { return SET.batch > 0; }
  function makeBatch(pick, tries, n) {
    var items = [], seen = {}, guard = 0;
    while (items.length < n && guard++ < n * 40) {
      var c = chooseBest(pick, tries);
      if (c && !seen[c.key]) { seen[c.key] = 1; items.push(c); }
    }
    return { items: items, queue: items.slice(), retry: [], t: {}, cur: null, round: 0, firstOk: 0, finished: false, again: false };
  }
  function batchNext(b) {
    if (!b.queue.length) {
      if (b.retry.length) { b.queue = b.retry.slice(); b.retry = []; b.round++; }
      else { b.finished = true; b.cur = null; return null; }
    }
    b.cur = b.queue.shift();
    return b.cur;
  }
  function nextCand(sec, pick, tries) {
    if (!batchOn()) { BT[sec] = null; return chooseBest(pick, tries); }
    var b = BT[sec];
    if (!b) b = BT[sec] = makeBatch(pick, tries, SET.batch);
    else if (b.finished) return null;
    else if (b.again && b.cur) { b.again = false; return b.cur; }
    return batchNext(b);
  }
  function batchAnswer(sec, ok) {
    var b = BT[sec];
    if (!b || !b.cur) return;
    var t = b.t[b.cur.key] || (b.t[b.cur.key] = { tries: 0, firstOk: false, cleared: false });
    if (t.tries === 0 && ok) { t.firstOk = true; b.firstOk++; }
    t.tries++;
    if (ok) t.cleared = true; else if (b.retry.indexOf(b.cur) < 0) b.retry.push(b.cur);
  }
  function batchFix(sec) {
    var b = BT[sec];
    if (!b || !b.cur) return;
    var t = b.t[b.cur.key];
    if (!t) return;
    var i = b.retry.indexOf(b.cur);
    if (i >= 0) b.retry.splice(i, 1);
    t.cleared = true;
    if (t.tries === 1 && !t.firstOk) { t.firstOk = true; b.firstOk++; }
  }
  function batchLabel(sec, c) {
    if (sec === 'c') return c.v.inf + ' · ' + tenseName(c.t) + (c.p != null && c.p >= 0 ? ' · ' + PRON[c.p] : '');
    if (sec === 's') return c.s.text.replace('___', c.s.ans);
    if (sec === 'w' || sec === 'wc') return c.w.pt + ' · ' + c.w.ru;
    return c.text;
  }
  function batchBarHtml(sec) {
    var b = BT[sec];
    if (!b || b.finished || !batchOn()) return '';
    var n = b.items.length, cleared = b.items.filter(function (c) { return b.t[c.key] && b.t[c.key].cleared; }).length;
    var left = b.round === 0 ? 'Раунд: ' + Math.min(n, n - b.queue.length) + ' из ' + n : 'Повтор ошибок: осталось ' + (n - cleared);
    return '<div class="bbar"><div class="bbar-t"><span>' + left + '</span><span>с первого раза: ' + b.firstOk + '</span></div>' +
      tilesHtml(b, false) + '</div>';
  }
  // плитки раунда: синяя = с первого раза, янтарная = была ошибка, контур = текущее, серая = ещё впереди
  function tilesHtml(b, big) {
    var n = b.items.length;
    return '<div class="rt' + (big ? ' big' : '') + '" style="grid-template-columns:repeat(' + Math.min(n, 10) + ',minmax(0,1fr))" aria-hidden="true">' + b.items.map(function (c) {
      var t = b.t[c.key], cls = 'rt-i';
      if (t && t.tries > 0) cls += t.firstOk ? ' ok' : ' bad';
      else if (b.cur === c && !b.finished) cls += ' cur';
      if (t && t.tries > 0 && !t.cleared && b.cur === c) cls += ' cur';
      return '<i class="' + cls + '"></i>';
    }).join('') + '</div>';
  }
  function batchParts(sec, c) {
    if (sec === 'w' || sec === 'wc') return [c.w.pt, c.w.ru];
    if (sec === 'c') return [batchLabel(sec, c), c.v.ru || ''];
    return [batchLabel(sec, c), ''];
  }
  function withBar(sec, html) {
    var bar = batchBarHtml(sec);
    if (!bar) return html;
    return html.replace('<div class="card">', function () { return bar + '<div class="card">'; });
  }
  function batchSummary(sec) {
    var b = BT[sec] || { items: [], t: {}, firstOk: 0, round: 0 };
    var n = b.items.length;
    var hard = b.items.filter(function (c) { return !(b.t[c.key] && b.t[c.key].firstOk); });
    var tries = 0;
    b.items.forEach(function (c) { tries += b.t[c.key] ? b.t[c.key].tries : 0; });
    var list = hard.length ? '<h2>С первого раза не получилось</h2><div class="list">' + hard.map(function (c) {
      var pp = batchParts(sec, c);
      return '<div class="li' + (pp[1] ? ' two' : '') + '"><span class="f" lang="pt-PT">' + esc(pp[0]) + '</span>' + (pp[1] ? '<span class="sub">' + esc(pp[1]) + '</span>' : '') + '</div>';
    }).join('') + '</div>' : '<div class="fb ok">Все ' + n + ' с первого раза. Можно брать следующий раунд.</div>';
    return '<div class="card"><h2>Раунд пройден</h2>' + tilesHtml(b, true) +
      '<div class="rt-legend"><span><i class="rt-i ok"></i>с первого раза</span><span><i class="rt-i bad"></i>вернулось в повтор</span></div><div class="tiles t3">' +
      '<div class="tile"><b>' + b.firstOk + ' из ' + n + '</b><span>с первого раза</span></div>' +
      '<div class="tile"><b>' + b.round + '</b><span>' + (b.round % 10 === 1 && b.round % 100 !== 11 ? 'повтор' : b.round % 10 >= 2 && b.round % 10 <= 4 && (b.round % 100 < 12 || b.round % 100 > 14) ? 'повтора' : 'повторов') + '</span></div>' +
      '<div class="tile"><b>' + tries + '</b><span>всего ответов</span></div></div>' + list +
      '<div class="row"><button type="button" class="btn" data-act="next-batch" data-v="' + sec + '" data-next>Следующий раунд</button></div></div>';
  }
  function levelRowHtml() {
    return '<div><div class="set-label">Уровень</div>' + chipRow(LV.map(function (l) { return { id: l, label: l }; }), SET.level, 'level') +
      '<div class="muted" style="margin-top:6px">Слова и времена своего уровня встречаются чаще всего, более лёгкие реже. Выше уровня только на ступень и редко. При смене уровня набор времён выставляется под него, дальше его можно поправить вручную.</div></div>';
  }
  function levelPickerHtml() {
    return '<div class="card"><h2>Какой у вас уровень?</h2><div class="muted">От него зависит, какие времена и слова будут чаще. Менять можно в любой момент в настройках.</div>' +
      LV.map(function (l) {
        return '<button type="button" class="btn lvbtn" data-act="level" data-v="' + l + '"><b>' + l + '</b><span>' + esc(LV_INFO[l]) + '</span></button>';
      }).join('') + '</div>';
  }
  function batchSetHtml() {
    var o = [{ id: '5', label: '5' }, { id: '10', label: '10' }, { id: '20', label: '20' }, { id: '0', label: 'Без раундов' }];
    return levelRowHtml() + '<div><div class="set-label">Раунд заданий</div>' + chipRow(o, String(SET.batch), 'batch') +
      '<div class="muted" style="margin-top:6px">Ошибки возвращаются в конце раунда, пока все ответы не станут верными.</div></div>';
  }

  var tenseName = function (id) { return E.TENSES[id] ? E.TENSES[id].name : id; };
  var PRON = E.PERSONS;

  // ---------- голос ----------
  var ptVoice = null, voiceChecked = false, ptVoices = [];
  function findVoice() {
    if (!('speechSynthesis' in window)) return null;
    var vs = [];
    try { vs = window.speechSynthesis.getVoices() || []; } catch (e) {}
    var pts = vs.filter(function (x) { return /^pt/i.test(x.lang); });
    ptVoices = pts.sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
    var chosen = null;
    if (SET && SET.voice) ptVoices.forEach(function (x) { if (!chosen && (x.voiceURI === SET.voice || x.name === SET.voice)) chosen = x; });
    return chosen || ptVoices[0] || null;
  }
  function voiceScore(v) {
    var n = v.name || '', sc = 0;
    if (/^pt[-_]PT/i.test(v.lang)) sc += 100; else sc += 30;
    if (/natural|online/i.test(n)) sc += 40;
    if (/premium|enhanced|neural|siri/i.test(n)) sc += 25;
    if (/google/i.test(n)) sc += 5;
    if (v.localService === false) sc += 5;
    return sc;
  }
  function voiceRowHtml() {
    if (!('speechSynthesis' in window)) return '';
    if (!ptVoices.length) return '<div><div class="set-label">Голос</div><div class="muted">Португальских голосов в этом браузере нет.</div></div>';
    var opts = ptVoices.map(function (v) {
      return '<option value="' + esc(v.voiceURI || v.name) + '"' + (ptVoice && v.name === ptVoice.name ? ' selected' : '') + '>' + esc(v.name + ' (' + v.lang + ')') + '</option>';
    }).join('');
    return '<div><div class="set-label">Голос</div><div class="row"><select class="sel" data-act="voice" aria-label="Голос">' + opts + '</select>' +
      '<button type="button" class="btn sec sm" data-act="voice-test">Проверить голос</button></div></div>';
  }
  function refreshVoice() { ptVoice = findVoice(); voiceChecked = true; }
  if ('speechSynthesis' in window) {
    refreshVoice();
    try { window.speechSynthesis.onvoiceschanged = function () { refreshVoice(); if (TAB === 'listen' || TAB === 'words') render(); }; } catch (e) {}
  }
  function speak(text, slow) {
    if (!('speechSynthesis' in window)) return false;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = ptVoice ? ptVoice.lang : 'pt-PT';
      if (ptVoice) u.voice = ptVoice;
      u.rate = slow ? 0.65 : 0.95;
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }

  // ---------- состояние вкладок ----------
  var TAB = 'words';
  var $view = document.getElementById('view');
  var C = null;       // спряжения
  var SN = null;      // предложения
  var W = null;       // слова
  var L = null;       // слух
  var resetAsk = false;
  var lastTab = null;
  var lastInput = null;

  var VERBS = D.VERBS.map(function (v) { return { inf: v[0], ru: v[1], board: !!v[2], lv: v[3] || 'B1' }; });
  var VMAP = {};
  VERBS.forEach(function (v) { VMAP[v.inf] = v; });

  function verbPool() {
    return VERBS.filter(function (v) {
      if (SET.vf === 'board') return v.board;
      if (SET.vf === 'irr') return !!E.resolve(v.inf).irr;
      if (SET.vf === 'reg') return !E.resolve(v.inf).irr;
      return true;
    });
  }
  function tensePool() {
    var t = SET.tenses.filter(function (id) { return E.TENSES[id]; });
    return t.length ? t : DEFAULTS.tenses;
  }

  // ---------- спряжения ----------
  function newConj() {
    var vp = verbPool(), tp = tensePool();
    if (!vp.length) vp = VERBS;
    var c2 = nextCand('c', function () {
      var v = pickLv(vp, function (x) { return x.lv; }), t = pickLv(tp, function (x) { return TL[x] || 'B1'; }, true), T = E.TENSES[t];
      for (var g = 0; g < 20 && t === 'fprox' && v.inf === 'ir'; g++) v = pickLv(vp, function (x) { return x.lv; });
      var forms = E.conjugate(v.inf, t);
      var idx = [];
      if (T.single) idx = [-1]; else forms.forEach(function (f, i) { if (f) idx.push(i); });
      var p = pickOne(idx);
      return { key: 'c|' + v.inf + '|' + t + '|' + p, v: v, t: t, p: p };
    }, 16);
    if (!c2) { C = { batchDone: true }; return; }
    C = { verb: c2.v, tense: c2.t, person: c2.p, done: false, res: null };
  }

  function dock(inner) { return '<div class="dock">' + inner + '</div>'; }
  function keysHtml() { return ''; } // панель спецсимволов убрана: есть на клавиатуре телефона

  function paradigmHtml(verb, tense, hit) {
    var forms = E.conjugate(verb, tense), T = E.TENSES[tense], rows = '';
    if (T.single) rows = '<tr class="hit"><td>' + esc(T.name) + '</td><td>' + esc(forms[0]) + '</td></tr>';
    else forms.forEach(function (f, i) {
      if (!f) return;
      rows += '<tr' + (i === hit ? ' class="hit"' : '') + '><td>' + esc(PRON[i]) + '</td><td>' + esc(f) + '</td></tr>';
    });
    return '<div class="scroll"><table class="paradigm">' + rows + '</table></div>';
  }

  function chipRow(items, current, act, multi) {
    return '<div class="chips">' + items.map(function (it) {
      var on = multi ? current.indexOf(it.id) >= 0 : current === it.id;
      return '<button type="button" class="chip" aria-pressed="' + on + '" data-act="' + act + '" data-v="' + esc(it.id) + '">' + esc(it.label) + '</button>';
    }).join('') + '</div>';
  }

  function conjSettings() {
    var ind = ['pres', 'prog', 'fprox', 'pps', 'imp', 'ppc', 'mqpc', 'fut', 'cond'];
    var conj = ['cpres', 'cimp', 'cfut', 'cppc', 'cmqpc'];
    var oth = ['impa', 'impn', 'infp', 'ger', 'part'];
    var short = { pres: 'Presente', prog: 'Estar a + inf.', fprox: 'Ir + inf.', pps: 'PPS', imp: 'Imperfeito', ppc: 'PPC', mqpc: 'MQPC', fut: 'Futuro', cond: 'Condicional', cpres: 'Pres. Conj.', cimp: 'Imperf. Conj.', cfut: 'Fut. Conj.', cppc: 'PPC Conj.', cmqpc: 'MQPC Conj.', impa: 'Imperativo +', impn: 'Imperativo -', infp: 'Inf. Pessoal', ger: 'Gerúndio', part: 'Particípio' };
    function grp(ids) { return chipRow(ids.map(function (i) { return { id: i, label: short[i] }; }), SET.tenses, 'tense', true); }
    var vf = [{ id: 'all', label: 'Все' }, { id: 'irr', label: 'Неправильные' }, { id: 'reg', label: 'Правильные' }, { id: 'board', label: 'С досок' }];
    return '<details class="panel settings"><summary><span>Настройки</span><span><b>' + tensePool().length + '</b> времён · <b>' + verbPool().length + '</b> глаголов</span></summary>' +
      '<div class="settings-body">' +
      batchSetHtml() +
      '<div><div class="set-label">Времена</div><div class="chips" style="margin-bottom:8px">' +
      '<button type="button" class="chip ghost" data-act="preset" data-v="conj">Только Conjuntivo</button>' +
      '<button type="button" class="chip ghost" data-act="preset" data-v="past">Прошедшие</button>' +
      '<button type="button" class="chip ghost" data-act="preset" data-v="all">Все</button></div>' +
      '<div class="muted" style="margin-bottom:4px">Изъявительное</div>' + grp(ind) +
      '<div class="muted" style="margin:8px 0 4px">Conjuntivo</div>' + grp(conj) +
      '<div class="muted" style="margin:8px 0 4px">Императив и неличные формы</div>' + grp(oth) + '</div>' +
      '<div><div class="set-label">Глаголы</div>' + chipRow(vf, SET.vf, 'vf') + '</div>' +
      '<label class="check"><input type="checkbox" data-act="strict"' + (SET.strict ? ' checked' : '') + '> Строго по диакритике (á, ç, ô засчитываются как ошибка)</label>' +
      '</div></details>';
  }

  function conjCard() {
    if (!C) newConj();
    if (C.batchDone) return batchSummary('c');
    var v = C.verb, T = E.TENSES[C.tense], irr = E.resolve(v.inf).irr;
    var box = '';
    var meta = '<div class="metawrap"><div class="ask">' + 'Поставьте глагол в форму' + '</div><div class="meta"><span class="tag tense">' + esc(T.name) + '</span><span>' + (irr ? '<span class="tag irr">неправильный</span>' : '') + '</span></div></div>';
    var head = '<div class="prompt"><div class="verb" lang="pt-PT">' + esc(v.inf) + '</div><div class="gloss">' + esc(v.ru) + '</div></div>';

    var who = T.single ? T.name : PRON[C.person];
    var res = C.res, cls = res ? res.v : '';
    var target = E.conjugate(v.inf, C.tense)[T.single ? 0 : C.person];
    var fb2 = '';
    if (res) {
      if (res.v === 'ok') fb2 = '<div class="fb ok"><div>Верно' + (res.accent ? ', но пишется <b lang="pt-PT">' + esc(target) + '</b>' : '') + '</div></div>';
      else {
        fb2 = '<div class="fb ' + (res.v === 'near' ? 'near' : 'bad') + '"><div>' + (res.dk ? 'Не знал, запомни ответ' : res.v === 'near' ? nearTxt(res) : 'Неверно') + '</div>' +
          '<div class="big" lang="pt-PT">' + esc(target) + '</div><div class="why">' + esc(E.explain(v.inf, C.tense)) + '</div>' +
          paradigmHtml(v.inf, C.tense, T.single ? -1 : C.person) + '</div>';
      }
    }
    return '<div class="card">' + meta + head + '<div class="who">' + (T.single ? '' : '<span class="lbl">Лицо</span>') + '<b>' + esc(who) + '</b></div>' +
      '<div class="stack"><label class="lbl" for="ans">Ваш ответ</label><div class="answer"><input class="inp ' + cls + '" id="ans" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="pt-PT" aria-label="Ответ"' + (C.done ? ' disabled' : '') + ' value="' + esc(res ? res.u : '') + '" data-enter="check-one"></div></div>' +
      dock((C.done ? '' : keysHtml()) + '<div class="row">' + (C.done ? '<button class="btn" data-act="next" data-next>Дальше</button>' : '<button class="btn" data-act="check-one">Проверить</button><button type="button" class="btn sec sm" data-act="dk-conj">Не знаю</button>') + '</div>') + fb2 + '</div>';
  }

  function checkOne(force) {
    var inp = document.getElementById('ans');
    if (!inp || C.done) return;
    var T = E.TENSES[C.tense], v = C.verb;
    var target = E.conjugate(v.inf, C.tense)[T.single ? 0 : C.person];
    var j = force ? { v: 'bad', dk: true } : judge(inp.value, target, SET.strict);
    if (j.v === 'empty') { inp.focus(); return; }
    j.u = force ? '' : inp.value;
    C.res = j; C.done = true;
    record('c|' + v.inf + '|' + C.tense + '|' + (T.single ? -1 : C.person), C.tense, j.v === 'ok', v.inf + ' · ' + T.name + (T.single ? '' : ' · ' + PRON[C.person]));
    batchAnswer('c', j.v === 'ok');
    render();
    focusNext();
  }
  // ---------- предложения ----------
  var SENTS = D.SENTENCES.map(function (s, i) {
    return { i: i, text: s[0], inf: s[1], tense: s[2], person: s[3], ans: s[4], board: s[5], lv: s[6] || 'B1' };
  });
  function sentPool() {
    return SENTS.filter(function (s) {
      return (SET.sBoard === 'all' || s.board === SET.sBoard || (SET.sBoard === 'other' && !/^B1\./.test(s.board))) && (SET.sTense === 'all' || s.tense === SET.sTense);
    });
  }
  function newSent() {
    var p = sentPool();
    if (!p.length) { SN = { none: true }; return; }
    var c = nextCand('s', function () { var s = pickLv(p, function (x) { return x.lv; }); return { key: 's|' + s.i, s: s }; }, 10);
    if (!c) { SN = { batchDone: true }; return; }
    SN = { s: c.s, done: false, res: null };
  }
  function sentTenses() {
    var seen = {};
    SENTS.forEach(function (s) { seen[s.tense] = (seen[s.tense] || 0) + 1; });
    return Object.keys(seen).map(function (id) { return { id: id, label: tenseName(id) + ' (' + seen[id] + ')' }; });
  }
  function sentView() {
    var boards = [{ id: 'all', label: 'Все' }, { id: 'B1.1', label: 'B1.1' }, { id: 'B1.2', label: 'B1.2' }, { id: 'other', label: 'Дополнительные' }];
    var tl = [{ id: 'all', label: 'Все времена' }].concat(sentTenses());
    var set = '<details class="panel settings"><summary><span>Фильтры</span><span><b>' + sentPool().length + '</b> из ' + SENTS.length + ' предложений</span></summary><div class="settings-body">' +
      '<div><div class="set-label">Доска</div>' + chipRow(boards, SET.sBoard, 'sboard') + '</div>' +
      '<div><div class="set-label">Время</div>' + chipRow(tl, SET.sTense, 'stense') + '</div>' + batchSetHtml() + '</div></details>';
    if (!SN) newSent();
    if (SN.none) return set + '<div class="card"><div class="empty">Под этот фильтр предложений нет.</div></div>';
    if (SN.batchDone) return set + batchSummary('s');
    var s = SN.s, parts = s.text.split('___');
    var cls = SN.res ? SN.res.v : '';
    var inp = '<input class="inp ' + cls + '" id="ans" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="pt-PT" aria-label="Пропуск" size="' + Math.max(7, s.ans.length + 2) + '"' + (SN.done ? ' disabled' : '') + ' value="' + esc(SN.res ? SN.res.u : '') + '" data-enter="check-sent">';
    var T = E.TENSES[s.tense];
    var hint = '<div class="hint">' + (SET.sHint ? '<span class="tag tense">' + esc(T.name) + '</span>' : '') + '<span class="tag plain" lang="pt-PT">' + esc(s.inf) + '</span>' +
      (SET.sHint ? (s.person != null ? '<span class="tag plain">' + esc(PRON[s.person]) + '</span>' : '') : '') + '</div>';
    var fb = '';
    if (SN.res) {
      if (SN.res.v === 'ok') fb = '<div class="fb ok">Верно' + (SN.res.accent ? ', но пишется <b lang="pt-PT">' + esc(s.ans) + '</b>' : '') + '</div>';
      else {
        var ex = '';
        try { ex = E.explain(s.inf, s.tense); } catch (e) {}
        fb = '<div class="fb ' + (SN.res.v === 'near' ? 'near' : 'bad') + '"><div>' + (SN.res.dk ? 'Не знал, запомни ответ' : SN.res.v === 'near' ? nearTxt(SN.res) : 'Неверно') + '</div><div class="big" lang="pt-PT">' + esc(s.ans) + '</div>' +
          (SN.res.v === 'bad' && !SN.res.dk ? diagHtml(s.inf, SN.res.u, s.ans) : '') + (ex ? '<div class="why">' + esc(ex) + '</div>' : '') + '</div>';
      }
    }
    var tr = (window.PTTr && window.PTTr[s.i]) || '';
    var hintBar = '<div class="meta">' + hint + '<button type="button" class="icon-btn" data-act="hint" aria-pressed="' + SET.sHint + '">' + (SET.sHint ? 'Скрыть время и лицо' : 'Показать время и лицо') + '</button></div>';
    var trHtml = tr ? '<div class="tr"><div class="muted">Перевод</div><div>' + esc(tr) + '</div></div>' : '';
    return set + '<div class="card">' + hintBar + '<div class="cloze" lang="pt-PT">' + esc(parts[0]) + inp + esc(parts.slice(1).join('___')) + '</div>' +
      dock((SN.done ? '' : keysHtml()) + '<div class="row">' + (SN.done ? '<button class="btn" data-act="next-sent" data-next>Дальше</button>' : '<button class="btn" data-act="check-sent">Проверить</button><button type="button" class="btn sec sm" data-act="dk-sent">Не знаю</button>') + '</div>') + fb + trHtml + '</div>';
  }
  function checkSent(force) {
    var inp = document.getElementById('ans');
    if (!inp || SN.done) return;
    var j = force ? { v: 'bad', dk: true } : judge(inp.value, SN.s.ans, SET.strict);
    if (j.v === 'empty') { inp.focus(); return; }
    j.u = force ? '' : inp.value;
    SN.res = j; SN.done = true;
    record('s|' + SN.s.i, SN.s.tense, j.v === 'ok', SN.s.text.replace('___', SN.s.ans));
    batchAnswer('s', j.v === 'ok');
    render();
    focusNext();
  }

  // ---------- слова ----------
  var WORDS = D.WORDS.map(function (w) { return { pt: w[0], ru: w[1], topic: w[2], own: !!w[3], lv: w[4] || 'B1' }; })
    .concat(VERBS.map(function (v) { return { pt: v.inf, ru: v.ru, topic: 'Инфинитивы', own: true, lv: v.lv }; }));
  function wordTopics() {
    var seen = {}, out = [];
    WORDS.forEach(function (w) { if (!seen[w.topic]) { seen[w.topic] = 1; out.push(w.topic); } });
    return out;
  }
  function wordPool() { return WORDS.filter(function (w) { return SET.wTopic === 'all' || w.topic === SET.wTopic; }); }
  // тип слова: глагол, существительное, прилагательное, сравнение, выражение
  function wtype(w) {
    var t = w.pt, first = t.split(/[\s,]+/)[0];
    if (w.topic === 'Сравнения') return 'simile';
    if (w.topic === 'Инфинитивы') return 'verb';
    if (/[!?]$|\.\.\./.test(t) || w.topic === 'Выражения') return 'phrase';
    if (/^(a precisar|a ver)\b/.test(t)) return 'phrase';
    if (/^(o|a|os|as)\s/.test(t)) return 'noun';
    if (/^(em|no|na|da|do|de|cá|pelo|tanto|graças|ora|cara|ao|por|para)\b/.test(t)) return 'phrase';
    if (/(ar|er|ir|ôr)(-se)?$/.test(first)) return 'verb';
    return 'adj';
  }
  function quizOptions(w, pool) {
    var ty = wtype(w), ptSide = SET.wDir === 'pt';
    var show = function (x) { return ptSide ? x.ru : x.pt; };
    var uniq = function (arr) { var seen = {}; seen[show(w)] = 1; return arr.filter(function (x) { var k = show(x); if (seen[k]) return false; seen[k] = 1; return true; }); };
    var same = function (src) { return uniq(src.filter(function (x) { return x.pt !== w.pt && wtype(x) === ty; })); };
    var cand = same(pool);
    if (cand.length < 6) cand = same(WORDS);
    var L = show(w).length;
    cand = cand.map(function (x) { return { x: x, d: Math.abs(show(x).length - L) + Math.random() * 6 }; })
      .sort(function (a, b) { return a.d - b.d; }).slice(0, 10).map(function (o) { return o.x; });
    var dist = shuffle(cand).slice(0, 3);
    if (dist.length < 3) {
      var rest = shuffle(uniq(WORDS.filter(function (x) { return x.pt !== w.pt && dist.indexOf(x) < 0; })));
      dist = dist.concat(rest).slice(0, 3);
    }
    return shuffle([w].concat(dist));
  }
  function newWord() {
    var p = wordPool();
    if (!p.length) { W = { none: true }; return; }
    var c = nextCand('w', function () { var w = pickLv(p, function (x) { return x.lv; }); return { key: 'w|' + w.pt, w: w }; }, 12);
    if (!c) { W = { batchDone: true }; return; }
    var w = c.w, opts = null;
    if (SET.wMode === 'quiz') opts = quizOptions(w, p);
    W = { w: w, shown: false, picked: null, opts: opts };
  }
  function wordView() {
    var tops = [{ id: 'all', label: 'Все (' + WORDS.length + ')' }].concat(wordTopics().map(function (t) {
      return { id: t, label: t + ' (' + WORDS.filter(function (w) { return w.topic === t; }).length + ')' };
    }));
    var md = [{ id: 'cards', label: 'Карточки' }, { id: 'quiz', label: 'Тест' }, { id: 'type', label: 'Ввод' }];
    var dr = [{ id: 'pt', label: 'PT → RU' }, { id: 'ru', label: 'RU → PT' }];
    var set = '<div class="chips modes">' + md.map(function (m) { return '<button type="button" class="chip" aria-pressed="' + (SET.wMode === m.id) + '" data-act="wmode" data-v="' + m.id + '">' + m.label + '</button>'; }).join('') + '</div>' +
      '<details class="panel settings"><summary><span>Настройки</span><span><b>' + wordPool().length + '</b> слов</span></summary><div class="settings-body">' + voiceRowHtml() +
      '<div><div class="set-label">Направление</div>' + chipRow(dr, SET.wDir, 'wdir') + '</div>' +
      '<div><div class="set-label">Тема</div>' + chipRow(tops, SET.wTopic, 'wtopic') + '</div>' + batchSetHtml() + '</div></details>';
    if (!W) newWord();
    else if (!W.batchDone && !W.none && (SET.wMode === 'quiz') !== !!W.opts) { if (BT.w) BT.w.again = true; newWord(); }
    if (W.none) return set + '<div class="card"><div class="empty">В этой теме слов нет.</div></div>';
    if (W.batchDone) return clozeStage(set);
    var w = W.w, ptSide = SET.wDir === 'pt';
    var front = ptSide ? w.pt : w.ru, back = ptSide ? w.ru : w.pt;
    var note = w.topic;
    var spk = ptSide || W.shown || W.picked != null || W.res ? '<button type="button" class="icon-btn" data-act="say" data-t="' + esc(w.pt) + '" aria-label="Произнести"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>Слушать</button>' : '';
    if (SET.wMode === 'type') {
      var rs = W.res, tcls = rs ? (rs.v === 'ok' ? 'ok' : rs.v === 'near' ? 'near' : 'bad') : '';
      var ref = ptSide ? w.ru : w.pt, tfb = '';
      if (W.pending) tfb = '<div class="fb near">Проверяю, не синоним ли это...</div>';
      else if (rs) {
        if (rs.v === 'ok') tfb = '<div class="fb ok"><div>' + (rs.mine ? 'Засчитано по твоему решению, вариант запомнен' : rs.syn ? 'Засчитано как синоним' : 'Верно') + '</div>' +
          (rs.syn && !rs.mine ? '<div class="why">На доске: <b lang="' + (ptSide ? 'ru' : 'pt-PT') + '">' + esc(ref) + '</b></div>' : '') + (rs.note ? '<div class="why">' + esc(rs.note) + '</div>' : '') + '</div>';
        else tfb = '<div class="fb ' + (rs.v === 'near' ? 'near' : 'bad') + '"><div>' + (rs.dk ? 'Не знал, запомни ответ' : rs.v === 'near' ? nearTxt(rs) : 'Неверно') + '</div>' +
          '<div class="big" lang="' + (ptSide ? 'ru' : 'pt-PT') + '">' + esc(ref) + '</div>' +
          (rs.note ? '<div class="why">' + esc(rs.note) + '</div>' : '') + (rs.nosyn && !rs.dk ? '<div class="why">Синонимы проверить не удалось, засчитывается только совпадение с вариантами на доске и в моём списке.</div>' : '') + (rs.v === 'bad' && !rs.dk ? '<div class="row"><button type="button" class="btn sec sm" data-act="accept-mine">Мой вариант верный, засчитать</button></div>' : '') + '</div>';
      }
      var busy = W.pending || W.res;
      return set + '<div class="card">' + (spk ? '<div class="meta" style="justify-content:flex-end">' + spk + '</div>' : '') +
        '<div class="flip"><div class="term" lang="' + (ptSide ? 'pt-PT' : 'ru') + '">' + esc(front) + '</div><div class="note">' + (ptSide ? 'Введите перевод на русском' : 'Введите слово по-португальски') + '</div></div>' +
        '<div class="answer"><input class="inp ' + tcls + '" id="ans" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="' + (ptSide ? 'ru' : 'pt-PT') + '" aria-label="Ответ"' + (busy ? ' disabled' : '') + ' value="' + esc(W.u || '') + '" data-enter="check-word"></div>' +
        dock((busy || !ptSide ? (busy ? '' : keysHtml()) : '') + '<div class="row">' + (W.res ? '<button class="btn" data-act="next-word" data-next>Дальше</button>' : '<button class="btn" data-act="check-word"' + (W.pending ? ' disabled' : '') + '>Проверить</button>' + (W.pending ? '' : '<button type="button" class="btn sec sm" data-act="dont-know">Не знаю</button>')) + '</div>') + tfb + '</div>';
    }
    if (SET.wMode === 'quiz') {
      var opts = W.opts.map(function (o, i) {
        var txt = ptSide ? o.ru : o.pt, c = '';
        if (W.picked != null) { if (o.pt === w.pt) c = 'ok'; else if (W.picked === i) c = 'bad'; }
        return '<button type="button" class="opt ' + c + '" data-act="pick" data-i="' + i + '"' + (W.picked != null ? ' disabled' : '') + ' lang="' + (ptSide ? 'ru' : 'pt-PT') + '">' + esc(txt) + '</button>';
      }).join('');
      return set + '<div class="card">' + (spk ? '<div class="meta" style="justify-content:flex-end">' + spk + '</div>' : '') +
        '<div class="flip"><div class="term" lang="' + (ptSide ? 'pt-PT' : 'ru') + '">' + esc(front) + '</div></div><div class="options">' + opts + '</div>' +
        (W.picked != null ? '<div class="row"><button class="btn" data-act="next-word" data-next>Дальше</button></div>' : '<div class="row"><button type="button" class="btn sec sm" data-act="dont-know">Не знаю</button></div>') + '</div>';
    }
    return set + '<div class="card">' + (spk ? '<div class="meta" style="justify-content:flex-end">' + spk + '</div>' : '') +
      '<div class="flip"><div class="term" lang="' + (ptSide ? 'pt-PT' : 'ru') + '">' + esc(front) + '</div>' +
      (W.shown ? '<div class="back" lang="' + (ptSide ? 'ru' : 'pt-PT') + '">' + esc(back) + '</div>' : '') + '</div>' +
      '<div class="row">' + (W.shown ? '<button class="btn" data-act="know" data-v="1" data-next>Знал</button><button class="btn sec" data-act="know" data-v="0">Не знал</button>' : '<button class="btn" data-act="show" data-next>Показать ответ</button>') + '</div></div>';
  }


  // ---------- второй этап раунда слов: те же слова во фразах, ввод вместо выбора ----------
  var WC = null;
  function wsents(w) { return (window.PTWS && window.PTWS[w.pt]) || null; }
  function startCloze() {
    var b0 = BT.w;
    if (!b0) return null;
    var items = b0.items.filter(function (c) { return wsents(c.w); }).map(function (c) { return { key: 'wc|' + c.w.pt, w: c.w }; });
    if (!items.length) return null;
    items = shuffle(items);
    return (BT.wc = { items: items, queue: items.slice(), retry: [], t: {}, cur: null, round: 0, firstOk: 0, finished: false, again: false });
  }
  function newCloze() {
    var b = BT.wc;
    var c = (b.again && b.cur) ? (b.again = false, b.cur) : batchNext(b);
    if (!c) { WC = { done: true }; return; }
    var list = wsents(c.w);
    store.wsUse = store.wsUse || {};
    var n = store.wsUse[c.w.pt];
    if (n == null) n = rnd(list.length);
    store.wsUse[c.w.pt] = n + 1;
    save();
    WC = { c: c, s: list[n % list.length], res: null };
  }
  function clozeStage(set) {
    var b = BT.wc || startCloze();
    if (!b) return set + batchSummary('w');
    if (!WC) newCloze();
    if (WC.done) return set + batchSummary('wc');
    var s = WC.s, parts = s[0].split('___'), alts = s[1].split('|').filter(function (x) { return x.charAt(0) !== '~'; }), res = WC.res;
    var inp = '<input class="inp ' + (res ? res.v : '') + '" id="ans" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="pt-PT" aria-label="Пропуск" size="' + Math.max(7, alts[0].length + 2) + '"' + (res ? ' disabled' : '') + ' value="' + esc(res ? res.u : '') + '" data-enter="check-cloze">';
    var w = WC.c.w;
    var hint = !res ? '' : '<div class="hint"><span class="tag plain" lang="pt-PT">' + esc(w.pt) + '</span><span class="muted">' + esc(w.ru) + '</span></div>';
    var full = (parts[0] + alts[0] + parts.slice(1).join('___'));
    var fb = '';
    if (res) {
      var say = '<button type="button" class="icon-btn" data-act="say" data-t="' + esc(full) + '" aria-label="Произнести фразу"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>Слушать фразу</button>';
      if (res.v === 'ok' && res.syn) fb = '<div class="fb ok"><div>' + (res.mine ? 'Засчитано по твоему решению. В этом упражнении ожидалось' : 'Верно по смыслу. Но в этом упражнении ожидалось выражение') + '</div><div class="big" lang="pt-PT">' + esc(alts[0]) + '</div></div>';
      else if (res.v === 'ok') fb = '<div class="fb ok"><div>Верно' + (res.accent ? ', но пишется <b lang="pt-PT">' + esc(alts[0]) + '</b>' : '') + '</div></div>';
      else fb = '<div class="fb ' + (res.v === 'near' ? 'near' : 'bad') + '"><div>' + (res.dk ? 'Не знал, запомни ответ' : res.v === 'near' ? nearTxt(res) : 'Неверно') + '</div><div class="big" lang="pt-PT">' + esc(alts[0]) + '</div>' + (res.v === 'bad' && !res.dk ? diagHtml(w.pt, res.u, alts[0]) : '') + (res.v !== 'ok' && !res.dk && res.u ? '<div class="row"><button type="button" class="btn sec sm" data-act="accept-cloze">Мой вариант верный, засчитать</button></div>' : '') + '</div>';
      fb += '<div class="row">' + say + '</div>';
    }
    var trBtn = '<div class="meta"><button type="button" class="icon-btn" data-act="wtr" aria-pressed="' + SET.wTr + '">' + (SET.wTr ? 'Скрыть перевод' : 'Показать перевод') + '</button></div>';
    var trHtml = SET.wTr ? '<div class="tr"><div class="muted">Перевод</div><div>' + esc(s[2]) + '</div></div>' : '';
    var html = '<div class="card"><div class="meta"><span class="tag">Вставьте слово</span></div>' + hint +
      '<div class="cloze" lang="pt-PT">' + esc(parts[0]) + inp + esc(parts.slice(1).join('___')) + '</div>' + trHtml + trBtn +
      dock('<div class="row">' + (res ? '<button class="btn" data-act="next-cloze" data-next>Дальше</button>' : '<button class="btn" data-act="check-cloze">Проверить</button><button type="button" class="btn sec sm" data-act="dk-cloze">Не знаю</button>') + '</div>') + fb + '</div>';
    return set + withBar('wc', html);
  }
  // Подсказка: введена правильная форма глагола, но другого времени или лица.
  function tenseDiag(inf, user, expected) {
    inf = String(inf).replace(/-se$/, '');
    if (!VMAP[inf] || !user || !expected) return '';
    var clit = /-(me|te|se|o|a|os|as|lhe|lhes|nos|vos)$/;
    var u = strip(user).replace(clit, ''), x = strip(expected).replace(clit, ''), map = {};
    Object.keys(E.TENSES).forEach(function (t) {
      var forms;
      try { forms = E.conjugate(inf, t); } catch (e) { return; }
      forms.forEach(function (f, i) {
        if (!f) return;
        var k = strip(f).replace(/^não /, '');
        (map[k] = map[k] || []).push({ t: t, p: E.TENSES[t].single ? -1 : i });
      });
    });
    var U = map[u], X = map[x];
    if (!U || !X) return '';
    if (U.some(function (m) { return X.some(function (n) { return n.t === m.t && n.p === m.p; }); })) return '';
    var xt = X.map(function (n) { return n.t; });
    var same = U.filter(function (m) { return xt.indexOf(m.t) >= 0; });
    var RUK = { pres: 'настоящее', prog: 'настоящее (estar a)', fprox: 'ближайшее будущее (ir +)', pps: 'прошедшее', imp: 'прошедшее', ppc: 'прошедшее', mqpc: 'прошедшее', fut: 'будущее', cond: 'условное', cpres: 'сослагательное', cimp: 'сослагательное', cfut: 'сослагательное', cppc: 'сослагательное', cmqpc: 'сослагательное', impa: 'императив', impn: 'императив', infp: 'инфинитив', ger: 'герундий', part: 'причастие' };
    function nm(t) { return tenseName(t) + ' (' + RUK[t] + ')'; }
    function uniq2(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }).slice(0, 2); }
    if (same.length) {
      var m0 = same[0], n0 = X.filter(function (n) { return n.t === m0.t; })[0];
      if (m0.p < 0 || n0.p < 0) return '';
      return 'Время верное, но лицо другое: «' + user.trim() + '» это ' + PRON[m0.p] + ', а здесь нужно ' + PRON[n0.p] + '.';
    }
    return 'Форма «' + user.trim() + '» существует, но это ' + uniq2(U.map(function (m) { return nm(m.t); })).join(' или ') +
      '. Здесь нужно: ' + uniq2(X.map(function (n) { return nm(n.t); })).join(' или ') + '.';
  }
  function diagHtml(inf, user, expected) {
    var t = '';
    try { t = tenseDiag(inf, user, expected); } catch (e) {}
    return t ? '<div class="why">' + esc(t) + '</div>' : '';
  }
  // Если ожидается неопределённый артикль (um, numa, dum...), форма с определённым артиклем тоже верна по смыслу.
  var INDEF = { um: 'o', uma: 'a', uns: 'os', umas: 'as', num: 'no', numa: 'na', nuns: 'nos', numas: 'nas', dum: 'do', duma: 'da', duns: 'dos', dumas: 'das' };
  function autoAlts(list) {
    var out = list.slice();
    list.forEach(function (a) {
      if (a.charAt(0) === '~') return;
      var w = a.split(' '), def = INDEF[w[0].toLowerCase()];
      if (!def) return;
      var first = w[0].charAt(0) === w[0].charAt(0).toUpperCase() ? def.charAt(0).toUpperCase() + def.slice(1) : def;
      var alt = '~' + [first].concat(w.slice(1)).join(' ');
      if (out.indexOf(alt) < 0) out.push(alt);
    });
    return out;
  }
  function checkCloze(force) {
    var inp = document.getElementById('ans');
    if (!inp || !WC || WC.res || WC.done) return;
    var alts = autoAlts(WC.s[1].split('|')).concat(((store.calt && store.calt[WC.s[0]]) || []).map(function (x) { return '~' + x; })), j = { v: 'bad' };
    if (force) j = { v: 'bad', dk: true };
    else {
      alts.forEach(function (a) {
        var syn = a.charAt(0) === '~';
        var r = judge(inp.value, syn ? a.slice(1) : a, SET.strict);
        if (syn && r.v === 'ok') r.syn = true;
        if (r.v === 'empty') j = r;
        else if (r.v === 'ok' && (j.v !== 'ok' || (j.syn && !r.syn))) j = r;
        else if (r.v === 'near' && j.v === 'bad') j = r;
      });
    }
    if (j.v === 'empty') { inp.focus(); return; }
    j.u = force ? '' : inp.value;
    WC.res = j;
    batchAnswer('wc', j.v === 'ok');
    render(); focusNext();
  }

  // ---------- проверка ввода слов ----------
  var sampleFn = null, wseq = 0;
  try {
    if (window.claude && window.claude.use) window.claude.use('sample').then(function (f) { sampleFn = f || null; }, function () {});
  } catch (e) {}
  function ruNorm(x) { return norm(x).replace(/ё/g, 'е').replace(/[.,!?;:«»"()]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function variantsOf(ref) {
    var out = [norm(ref)], bare = ref.replace(/\([^)]*\)/g, ' ');
    out.push(norm(bare));
    bare.split(/[,;\/]/).forEach(function (x) { x = norm(x); if (x) out.push(x); });
    return out.filter(function (x, i) { return x && out.indexOf(x) === i; });
  }
  function altKey(w) { return 'w|' + w.pt + '|' + SET.wDir; }
  function extraRu(w) { return ((window.PTSyn && window.PTSyn.ru[w.pt]) || []).concat((store.alt && store.alt[altKey(w)]) || []); }
  function extraPt(w) { return ((window.PTSyn && window.PTSyn.pt[w.pt]) || []).concat((store.alt && store.alt[altKey(w)]) || []); }
  function matchRu(user, ref, w) {
    var n = ruNorm(user);
    var list = variantsOf(ref).concat(extraRu(w)).map(ruNorm);
    var more = [];
    list.forEach(function (v) { var t = v.replace(/\s(на|в|с|о|за|к|от|из|над|у|по)$/, ''); if (t !== v) more.push(t); });
    list = list.concat(more);
    return list.indexOf(n) >= 0 ? { v: 'ok' } : { v: 'bad' };
  }
  function ptCore(x) { return norm(x).replace(/[.!?]/g, '').replace(/^(o|a|os|as|um|uma)\s+/, ''); }
  function matchPt(user, ref, w) {
    var best = { v: 'bad' };
    variantsOf(ref).concat(extraPt(w)).forEach(function (t) {
      [judge(user, t, SET.strict), judge(ptCore(user), ptCore(t), SET.strict)].forEach(function (j) {
        if (j.v === 'ok') { if (best.v !== 'ok') best = j; } else if (j.v === 'near' && best.v === 'bad') best = j;
      });
    });
    return best;
  }
  function acceptCloze() {
    if (!WC || !WC.res || WC.res.v === 'ok' || !WC.res.u) return;
    store.calt = store.calt || {};
    var k = WC.s[0], u = String(WC.res.u).trim();
    store.calt[k] = (store.calt[k] || []).concat([u]);
    batchFix('wc');
    WC.res = { v: 'ok', u: WC.res.u, syn: true, mine: true };
    save(); render(); focusNext();
  }
  function acceptMine() {
    if (!W || !W.res || W.res.v !== 'bad') return;
    var w = W.w, k = 'w|' + w.pt, ak = altKey(w);
    store.alt = store.alt || {};
    store.alt[ak] = (store.alt[ak] || []).concat([norm(W.res.u)]);
    var bw = BT.w, firstTry = !bw || !bw.cur || !bw.t[bw.cur.key] || bw.t[bw.cur.key].tries <= 1;
    var it = firstTry ? store.srs[k] : null;
    if (it) { it.bad = Math.max(0, it.bad - 1); it.ok++; it.box = Math.max(it.box, 1); it.due = Date.now() + BOX_DAYS[it.box] * DAY; }
    if (firstTry) { store.words.bad = Math.max(0, store.words.bad - 1); store.words.ok++; }
    batchFix('w');
    W.res.v = 'ok'; W.res.syn = true; W.res.mine = true;
    save(); render(); focusNext();
  }
  function finishWord(u, m) {
    W.res = { v: m.v, u: u, syn: m.syn, note: m.note, nosyn: m.nosyn, dk: m.dk };
    W.u = u; W.pending = false;
    record('w|' + W.w.pt, 'words', m.v === 'ok', W.w.pt + ' · ' + W.w.ru);
    batchAnswer('w', m.v === 'ok');
    render(); focusNext();
  }
  function checkWord() {
    var inp = document.getElementById('ans');
    if (!inp || !W || W.res || W.pending) return;
    var u = inp.value;
    if (!norm(u)) { inp.focus(); return; }
    var w = W.w, ptSide = SET.wDir === 'pt';
    var ref = ptSide ? w.ru : w.pt;
    var m = ptSide ? matchRu(u, ref, w) : matchPt(u, ref, w);
    if (m.v !== 'bad') { finishWord(u, m); return; }
    if (!sampleFn) { finishWord(u, { v: 'bad', nosyn: true }); return; }
    var ref0 = W, my = ++wseq;
    W.pending = true; W.u = u; render();
    var q = 'Ты проверяешь ответ ученика, который учит европейский португальский (pt-PT, уровень B1.2).\n' +
      (ptSide ? 'Португальское слово или выражение: «' + w.pt + '».\nЭталонный перевод на русском: «' + w.ru + '».\nУченик написал по-русски: «' + u + '».\n' +
        'Это верный перевод? Засчитывай точные совпадения по смыслу и близкие синонимы, которые передают то же значение.'
        : 'Русское слово или выражение: «' + w.ru + '».\nЭталонный перевод на португальский: «' + w.pt + '».\nУченик написал по-португальски: «' + u + '».\n' +
        'Это допустимый перевод на европейский португальский? Засчитывай точные совпадения по смыслу и настоящие синонимы или эквиваленты (с правильной орфографией). Слово с орфографической ошибкой не засчитывай.') +
      '\nОтветь только JSON: {"verdict":"exact"|"synonym"|"no","note":"до 12 слов по-русски, пояснение"}. Если ответ другого слова с иным значением, ставь "no".';
    sampleFn.json(q, { modelTier: 'quick' }).then(function (r) {
      if (my !== wseq || W !== ref0 || W.res) return;
      var ok = r && (r.verdict === 'exact' || r.verdict === 'synonym');
      finishWord(u, { v: ok ? 'ok' : 'bad', syn: ok, note: r && r.note ? String(r.note) : '' });
    }, function () {
      if (my !== wseq || W !== ref0 || W.res) return;
      finishWord(u, { v: 'bad', nosyn: true });
    });
  }

  // ---------- слух ----------
  var LSENTS = SENTS.filter(function (s) { return s.tense !== 'part' && s.tense !== 'ger' && s.tense !== 'infp' || s.text.split(' ').length > 5; });
  function newListen() {
    var items;
    if (SET.lMode === 'word') items = WORDS.filter(function (w) { return w.topic !== 'Инфинитивы'; }).map(function (w) { return { key: 'l|' + w.pt, text: w.pt, ru: w.ru, lv: w.lv }; });
    else items = LSENTS.map(function (s) {
      var t = s.text.replace('___', s.ans).replace(/^[—–-]\s*/, '').replace(/\s[—–]\s/g, '. ');
      return { key: 'l|s' + s.i, text: t, ru: (window.PTTr && window.PTTr[s.i]) || null, lv: s.lv };
    });
    var c = nextCand('l', function () { return pickLv(items, function (x) { return x.lv; }); }, 10);
    if (!c) { L = { batchDone: true }; return; }
    L = { item: c, done: false, res: null, reveal: false };
  }
  function tokens(s) { return s.replace(/[.,;:!?¿¡"()]/g, ' ').split(/\s+/).filter(Boolean); }
  function lcsMark(a, b) {
    var n = a.length, m = b.length, i, j, dp = [];
    for (i = 0; i <= n; i++) { dp.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    var ma = new Array(n).fill(false), mb = new Array(m).fill(false);
    i = 0; j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { ma[i] = true; mb[j] = true; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
    return { ma: ma, mb: mb };
  }
  function listenView() {
    var md = [{ id: 'sent', label: 'Предложения' }, { id: 'word', label: 'Слова и выражения' }];
    var set = '<details class="panel settings"><summary><span>Настройки</span><span>' + (ptVoice ? 'голос: ' + esc(ptVoice.name) : 'голос не найден') + '</span></summary><div class="settings-body">' +
      voiceRowHtml() + '<div><div class="set-label">Материал</div>' + chipRow(md, SET.lMode, 'lmode') + '</div>' + batchSetHtml() +
      '<label class="check"><input type="checkbox" data-act="slow"' + (SET.lSlow ? ' checked' : '') + '> Медленнее</label>' +
      '<label class="check"><input type="checkbox" data-act="ltr"' + (SET.lTr ? ' checked' : '') + '> Показывать перевод до ответа</label></div></details>';
    if (!L) newListen();
    if (L.batchDone) return set + batchSummary('l');
    var it = L.item;
    var noSpeech = !('speechSynthesis' in window);
    var warn = '';
    if (noSpeech) warn = '<div class="fb near">В этом браузере нет синтеза речи. Диктант недоступен, но можно открыть текст и переписать его для тренировки орфографии.</div>';
    else if (!ptVoice) warn = '<div class="fb near">На устройстве не найден португальский голос. Кнопка попробует системный, но звучать он может неверно. Голоса добавляются в настройках системы.</div>';
    var fb = '';
    if (L.res) {
      var tt = tokens(it.text), uu = tokens(L.res.u);
      var kf = SET.strict ? norm : strip2;
      var m = lcsMark(tt.map(kf), uu.map(kf));
      var onlyAcc = L.res.v !== 'ok' && strip(tt.join(' ')) === strip(uu.join(' '));
      var tgt = tt.map(function (w, i) { return '<span class="w ' + (m.ma[i] ? '' : 'miss') + '">' + esc(w) + '</span>'; }).join(' ');
      var ext = uu.filter(function (w, i) { return !m.mb[i]; });
      fb = '<div class="fb ' + (L.res.v === 'ok' ? 'ok' : 'bad') + ' diff"><div>' + (L.res.v === 'ok' ? 'Все слова на месте' : onlyAcc ? 'Слова те же, ошибка только в диакритике (á, ç, ô) или в ударных формах. Красным отмечено, где пишется иначе' : 'Красным отмечено то, что пропущено или написано иначе') + '</div>' +
        '<div class="big" lang="pt-PT">' + tgt + '</div>' +
        (ext.length ? '<div class="why">Лишнее или неверное в вашем тексте: <span class="diff"><span class="w extra">' + ext.map(esc).join(' ') + '</span></span></div>' : '') +
        '</div>';
    }
    return set + '<div class="card"><div class="meta"><span class="tag">Диктант</span></div>' +
      warn +
      '<div class="row"><button type="button" class="btn" data-act="play"' + (noSpeech ? ' disabled' : '') + '>Прослушать</button>' +
      '<button type="button" class="btn sec" data-act="reveal">' + (L.reveal ? 'Скрыть текст' : 'Показать текст') + '</button></div>' +
      (L.reveal && !L.done ? '<div class="fb near" lang="pt-PT">' + esc(it.text) + '</div>' : '') +
      (it.ru && (SET.lTr || L.done) ? '<div class="tr"><div class="muted">Перевод</div><div>' + esc(it.ru) + '</div></div>' : '') +
      '<textarea class="inp" id="ans" lang="pt-PT" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Запишите услышанное"' + (L.done ? ' disabled' : '') + '>' + esc(L.res ? L.res.u : '') + '</textarea>' +
      dock((L.done ? '' : keysHtml()) + '<div class="row">' + (L.done ? '<button class="btn" data-act="next-listen" data-next>Дальше</button>' : '<button class="btn" data-act="check-listen">Проверить</button><button type="button" class="btn sec sm" data-act="dk-listen">Не знаю</button>') + '</div>') + fb + '</div>';
  }
  function strip2(w) { return strip(w); }
  function checkListen(force) {
    var inp = document.getElementById('ans');
    if (!inp || L.done || (!force && !norm(inp.value))) return;
    var tt = tokens(L.item.text).map(norm), uu = tokens(force ? '' : inp.value).map(norm);
    var ok = tt.length === uu.length && tt.every(function (w, i) { return w === uu[i]; });
    var near = !ok && strip(tt.join(' ')) === strip(uu.join(' '));
    var v = force ? 'bad' : ok ? 'ok' : (near && !SET.strict ? 'ok' : 'bad');
    L.res = { v: v, u: force ? '' : inp.value }; L.done = true;
    record(L.item.key, 'listen', v === 'ok', L.item.text);
    batchAnswer('l', v === 'ok');
    render();
    focusNext();
  }

  // ---------- прогресс ----------
  function progressView() {
    var tot = 0, ok = 0;
    Object.keys(store.tense).forEach(function (k) { tot += store.tense[k].ok + store.tense[k].bad; ok += store.tense[k].ok; });
    var wt = store.words.ok + store.words.bad, lt = store.listen.ok + store.listen.bad;
    var allTot = tot + wt + lt, allOk = ok + store.words.ok + store.listen.ok;
    var tiles = '<div class="tiles t3">' +
      '<div class="tile"><b>' + allTot + '</b><span>всего ответов</span></div>' +
      '<div class="tile"><b>' + (allTot ? Math.round(allOk / allTot * 100) : 0) + '%</b><span>точность</span></div>' +
      '<div class="tile"><b>' + streak() + '</b><span>дней подряд</span></div></div>';
    var rows = Object.keys(store.tense).map(function (id) {
      var t = store.tense[id], n = t.ok + t.bad;
      return { id: id, n: n, p: n ? Math.round(t.ok / n * 100) : 0 };
    }).filter(function (r) { return r.n > 0; }).sort(function (a, b) { return a.p - b.p; });
    var bars = rows.length ? '<div class="bars">' + rows.map(function (r) {
      return '<div class="bar"><span>' + esc(tenseName(r.id)) + ' <span class="muted">(' + r.n + ')</span></span><span class="track"><span class="fill" style="display:block;width:' + r.p + '%"></span></span><span class="pct">' + r.p + '%</span></div>';
    }).join('') + '</div>' : '<div class="empty">Пока нет данных. Ответьте на несколько заданий.</div>';
    var weak = Object.keys(store.srs).map(function (k) { var it = store.srs[k]; return { k: k, it: it, d: it.bad - it.ok }; })
      .filter(function (x) { return x.it.bad > 0 && x.it.box < 2; }).sort(function (a, b) { return b.d - a.d || b.it.bad - a.it.bad; }).slice(0, 10);
    var weakHtml = weak.length ? '<div class="list">' + weak.map(function (x) {
      return '<div class="li"><span class="f" lang="pt-PT">' + esc(x.it.lab || x.k) + '</span><span class="muted">ошибок ' + x.it.bad + ', верно ' + x.it.ok + '</span></div>';
    }).join('') + '</div>' : '<div class="empty">Слабых мест пока не видно.</div>';
    var reset = resetAsk ?
      '<div class="fb bad"><div>Удалить весь прогресс в этом браузере?</div><div class="row"><button class="btn sm" data-act="reset-yes">Да, удалить</button><button class="btn sec sm" data-act="reset-no">Отмена</button></div></div>' :
      '<div class="row"><button class="btn sec sm" data-act="refresh-app">Обновить приложение</button><button class="btn sec sm" data-act="reset">Сбросить прогресс</button></div>';
    return '<div class="card">' + tiles + '</div>' +
      '<div class="card"><h2>Точность по временам</h2>' + bars + '</div>' +
      '<div class="card"><h2>Слабые места</h2>' + weakHtml + '</div>' +
      '<div class="card">' + reset + '<div class="muted">Прогресс хранится только в этом браузере и на этом устройстве.</div></div>';
  }

  // ---------- каркас ----------
  var TABS = [['words', 'Слова', '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5a2 2 0 0 1 2-2h11v16H7a2 2 0 0 0-2 2V5z"/><path d="M5 19a2 2 0 0 0 2 2h11"/></svg>'], ['conj', 'Спряжения', '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/></svg>'], ['sent', 'Фразы', '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>'], ['listen', 'Аудио', '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/></svg>'], ['prog', 'Прогресс', '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 20V11M12 20V5M18 20v-6"/></svg>']];
  function render() {
    var s = streak();
    document.getElementById('streak').textContent = s ? 'Серия: ' + s + ' ' + dayWord(s) : '';
    document.getElementById('tabs').innerHTML = TABS.map(function (t) {
      return '<button type="button" role="tab" class="tab" aria-selected="' + (TAB === t[0]) + '" data-act="tab" data-v="' + t[0] + '"><span class="ti">' + t[2] + '</span>' + t[1] + '</button>';
    }).join('');
    var open = {};
    var gb = document.getElementById('gear'); if (gb) gb.hidden = TAB === 'prog';
    var det = $view.querySelector('details.settings');
    var wasOpen = det && det.open && lastTab === TAB;
    lastTab = TAB;
    var html = '';
    if (!SET.level) { $view.innerHTML = levelPickerHtml(); document.getElementById('tabs').innerHTML = ''; if (gb) gb.hidden = true; return; }
    if (TAB === 'conj') html = withBar('c', conjSettings() + conjCard());
    else if (TAB === 'sent') html = withBar('s', sentView());
    else if (TAB === 'words') html = withBar('w', wordView());
    else if (TAB === 'listen') html = withBar('l', listenView());
    else html = progressView();
    $view.innerHTML = html;
    if (wasOpen) { var d2 = $view.querySelector('details.settings'); if (d2) d2.open = true; }
    if (gb) gb.setAttribute('aria-pressed', String(!!$view.querySelector('details.settings[open]')));
    // клавиатура открывается только после явного касания поля; дальше, пока человек печатает, остаётся в потоке заданий
    if (TAB !== 'prog' && typing) {
      var a = document.getElementById('ans') || document.querySelector('.tin');
      if (a && !a.disabled && document.activeElement !== a) { try { a.focus({ preventScroll: true }); } catch (e) {} }
    }
    syncKb();
  }
  // режим ввода: пока печатают, шапка и нижнее меню сворачиваются, а панель с символами и «Проверить» закреплена над клавиатурой
  function syncKb() { try { document.body.classList.toggle('kb', !!typing && TAB !== 'prog'); document.body.classList.toggle('onprog', TAB === 'prog'); if (typeof kbVar === 'function') kbVar(); } catch (e) {} }
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (IOS) document.documentElement.classList.add('ios');
  var kbRaf = 0;
  function kbPlace() {
    var vv = window.visualViewport; if (!vv) return;
    var root = document.documentElement.style;
    var base = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    root.setProperty('--kb', base + 'px');
    if (!IOS) return;
    // iOS: панель с кнопками ставится строго над системной панелью (стрелки и галочка),
    // считая от нижней границы ВИДИМОЙ области. Прокрутка страницы на это не влияет.
    var dk = document.querySelector('.dock');
    var dh = dk ? dk.offsetHeight : 70;
    var land = window.innerWidth > window.innerHeight;
    var y = vv.offsetTop + vv.height - dh - (land ? 0 : -6);
    root.setProperty('--dy', Math.round(y) + 'px');
  }
  function kbVar() {
    if (kbRaf) return;
    kbRaf = requestAnimationFrame(function () { kbRaf = 0; kbPlace(); });
  }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', kbVar); window.visualViewport.addEventListener('scroll', kbVar); }
  var typing = false;
  function isTextField(t) { return !!t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && (!t.type || t.type === 'text'))); }
  document.addEventListener('pointerdown', function (e) { if (isTextField(e.target)) typing = true; }, true);
  document.addEventListener('focusout', function (e) {
    // человек убрал клавиатуру сам (поле потеряло фокус, и DOM не перестраивался): больше не возвращаем её
    if (isTextField(e.target) && !e.relatedTarget) setTimeout(function () { if (document.contains(e.target) && document.activeElement !== e.target) { typing = false; syncKb(); } }, 0);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { typing = false; syncKb(); } });
  document.addEventListener('focusin', function (e) { if (isTextField(e.target)) { if (typing) syncKb(); } }, true);
  function dayWord(n) { var m = n % 10, h = n % 100; if (m === 1 && h !== 11) return 'день'; if (m >= 2 && m <= 4 && (h < 12 || h > 14)) return 'дня'; return 'дней'; }
  function focusNext() {
    var b = document.querySelector('[data-next]');
    if (b) { try { b.focus({ preventScroll: true }); } catch (e) {} }
  }

  // ---------- события ----------
  document.addEventListener('focusin', function (e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' && t.type === 'text' || t.tagName === 'INPUT' && !t.type || t.tagName === 'TEXTAREA')) lastInput = t;
  });
  document.addEventListener('mousedown', function (e) {
    if (e.target.closest && e.target.closest('.key')) e.preventDefault();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var t = e.target;
    if (t.tagName === 'TEXTAREA') { if (e.shiftKey) return; e.preventDefault(); checkListen(); return; }
    var act = t.getAttribute && t.getAttribute('data-enter');
    if (act) { e.preventDefault(); doAct(act, t); return; }
  });
  document.addEventListener('change', function (e) {
    var t = e.target, act = t.getAttribute && t.getAttribute('data-act');
    if (act === 'strict') { setPref('strict', t.checked); }
    if (act === 'slow') { setPref('lSlow', t.checked); }
    if (act === 'ltr') { setPref('lTr', t.checked); render(); var d3 = $view.querySelector('details.settings'); if (d3) d3.open = true; }
    if (act === 'voice') { setPref('voice', t.value); refreshVoice(); speak('Bom dia! Vamos praticar português.', false); render(); }
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el || el.tagName === 'INPUT') return;
    doAct(el.getAttribute('data-act'), el);
  });

  function togglePreset(v) {
    if (v === 'conj') SET.tenses = ['cpres', 'cimp', 'cfut', 'cppc', 'cmqpc'];
    else if (v === 'past') SET.tenses = ['pps', 'imp', 'ppc', 'mqpc'];
    else SET.tenses = Object.keys(E.TENSES);
    save();
  }

  function doAct(act, el) {
    var v = el.getAttribute('data-v');
    switch (act) {
      case 'tab': TAB = v; resetAsk = false; typing = false; render(); try { window.scrollTo(0, 0); } catch (e) {} break;
      case 'level':
        SET.level = v;
        SET.tenses = levelTenses(v);
        save(); BT = {}; C = null; SN = null; W = null; WC = null; L = null; render(); break;
      case 'gear':
        var sd = $view.querySelector('details.settings');
        if (sd) {
          sd.open = !sd.open;
          el.setAttribute('aria-pressed', String(sd.open));
          if (sd.open) { try { sd.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} }
        }
        break;
      case 'ch':
        if (lastInput && !lastInput.disabled && document.body.contains(lastInput)) {
          var c = el.getAttribute('data-c'), s = lastInput.selectionStart, e2 = lastInput.selectionEnd, val = lastInput.value;
          if (s == null) { s = e2 = val.length; }
          lastInput.value = val.slice(0, s) + c + val.slice(e2);
          lastInput.focus();
          try { lastInput.setSelectionRange(s + 1, s + 1); } catch (er) {}
        } else {
          var a = document.getElementById('ans') || document.querySelector('.tin');
          if (a && !a.disabled) { a.value += el.getAttribute('data-c'); a.focus(); }
        }
        break;
      case 'tense':
        var i = SET.tenses.indexOf(v);
        if (i >= 0) { if (SET.tenses.length > 1) SET.tenses.splice(i, 1); } else SET.tenses.push(v);
        save(); C = null; BT.c = null; render(); break;
      case 'preset': togglePreset(v); C = null; BT.c = null; render(); break;
      case 'vf': setPref('vf', v); C = null; BT.c = null; render(); break;
      case 'batch': setPref('batch', +v); BT = {}; C = null; SN = null; W = null; WC = null; L = null; render(); break;
      case 'next-batch': if (v === 'wc') v = 'w'; if (v === 'w') { BT.wc = null; WC = null; } BT[v] = null; if (v === 'c') C = null; else if (v === 's') SN = null; else if (v === 'w') W = null; else L = null; render(); break;
      case 'dk-conj': if (C && !C.done) checkOne(true); break;
      case 'dk-sent': if (SN && !SN.done) checkSent(true); break;
      case 'dk-listen': if (L && !L.done) checkListen(true); break;
      case 'check-one': checkOne(); break;
      case 'next': case 'skip': newConj(); render(); break;
      case 'sboard': setPref('sBoard', v); SN = null; BT.s = null; render(); break;
      case 'stense': setPref('sTense', v); SN = null; BT.s = null; render(); break;
      case 'hint': setPref('sHint', !SET.sHint); render(); break;
      case 'check-sent': checkSent(); break;
      case 'next-sent': newSent(); render(); break;
      case 'wmode': setPref('wMode', v); if (BT.w) BT.w.again = true; W = null; render(); break;
      case 'wdir': setPref('wDir', v); if (BT.w) BT.w.again = true; W = null; render(); break;
      case 'wtopic': setPref('wTopic', v); W = null; BT.w = null; BT.wc = null; WC = null; render(); break;
      case 'check-word': checkWord(); break;
      case 'accept-mine': acceptMine(); break;
      case 'accept-cloze': acceptCloze(); break;
      case 'show': W.shown = true; render(); focusNext(); break;
      case 'know':
        record('w|' + W.w.pt, 'words', v === '1', W.w.pt + ' · ' + W.w.ru);
        batchAnswer('w', v === '1');
        newWord(); render(); break;
      case 'pick':
        if (W.picked != null) break;
        W.picked = +el.getAttribute('data-i');
        record('w|' + W.w.pt, 'words', W.opts[W.picked].pt === W.w.pt, W.w.pt + ' · ' + W.w.ru);
        batchAnswer('w', W.opts[W.picked].pt === W.w.pt);
        render(); focusNext(); break;
      case 'dont-know':
        if (!W || W.pending) break;
        if (SET.wMode === 'quiz') {
          if (W.picked != null) break;
          W.picked = -1;
          record('w|' + W.w.pt, 'words', false, W.w.pt + ' · ' + W.w.ru);
          batchAnswer('w', false);
          render(); focusNext();
        } else {
          if (W.res) break;
          wseq++;
          finishWord('', { v: 'bad', dk: true });
        }
        break;
      case 'next-word': wseq++; newWord(); render(); break;
      case 'check-cloze': checkCloze(false); break;
      case 'dk-cloze': checkCloze(true); break;
      case 'next-cloze': newCloze(); render(); break;
      case 'wtr': setPref('wTr', !SET.wTr); { var keepc = document.getElementById('ans'); var kvc = keepc ? keepc.value : ''; render(); var k3 = document.getElementById('ans'); if (k3 && WC && !WC.res) k3.value = kvc; } break;
      case 'voice-test': speak('Bom dia! Hoje vamos praticar o conjuntivo e o infinitivo pessoal.', false); break;
      case 'say': speak(el.getAttribute('data-t'), false); break;
      case 'lmode': setPref('lMode', v); L = null; BT.l = null; render(); break;
      case 'play': speak(L.item.text, SET.lSlow); break;
      case 'reveal': L.reveal = !L.reveal; var keep = document.getElementById('ans'); var kv = keep ? keep.value : ''; render(); var k2 = document.getElementById('ans'); if (k2 && !L.done) k2.value = kv; break;
      case 'check-listen': checkListen(); break;
      case 'next-listen': newListen(); render(); break;
      case 'refresh-app':
        (function () {
          var done = function () { location.reload(); };
          try {
            var ps = [];
            if (navigator.serviceWorker) ps.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }));
            if (window.caches) ps.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }));
            Promise.all(ps).then(done, done);
          } catch (e) { done(); }
        })();
        break;
      case 'reset': resetAsk = true; render(); break;
      case 'reset-no': resetAsk = false; render(); break;
      case 'reset-yes':
        BT = {}; C = null; SN = null; W = null; WC = null; L = null;
        store.srs = {}; store.tense = {}; store.words = { ok: 0, bad: 0 }; store.listen = { ok: 0, bad: 0 }; store.days = [];
        save(); resetAsk = false; render(); break;
    }
  }

  render();
})();
