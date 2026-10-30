/* ===================================================================
   CONECTA IRMÃOS — Igreja Presença de Deus
   by Elton · Sistema e Logística
   PWA leve · 2 painéis interligados (Central Gerencial + Profissional)
   =================================================================== */
(function () {
  'use strict';

  var CFG = window.CI_CONFIG || {};
  var AREAS = {
    'Construção': ['Pedreiro', 'Pintor', 'Eletricista', 'Encanador', 'Gesseiro', 'Marceneiro'],
    'Alimentação': ['Padeiro', 'Confeiteiro', 'Cozinheiro', 'Salgadeiro', 'Churrasqueiro'],
    'Beleza': ['Cabeleireiro', 'Manicure', 'Barbeiro', 'Maquiador', 'Esteticista'],
    'Saúde': ['Médico', 'Enfermeiro', 'Fisioterapeuta', 'Dentista', 'Psicólogo'],
    'Automotivo': ['Mecânico', 'Eletricista automotivo', 'Funileiro', 'Borracheiro'],
    'Tecnologia': ['Técnico de informática', 'Programador', 'Designer', 'Suporte de redes'],
    'Serviços': ['Bombeiro hidráulico', 'Motorista', 'Diarista', 'Cuidador', 'Segurança'],
    'Eventos': ['Fotógrafo', 'Músico', 'Decorador', 'Cerimonialista', 'DJ'],
    'Gestão': ['Gestor de dados', 'Gestor de restaurante', 'Consultor', 'Analista administrativo'],
    'Outros': ['Outro serviço']
  };
  var AREA_ICON = {
    'Construção': '🧱', 'Alimentação': '🍞', 'Beleza': '✂️', 'Saúde': '🩺',
    'Automotivo': '🔧', 'Tecnologia': '💻', 'Serviços': '🛠️', 'Eventos': '🎉', 'Gestão': '🗂️', 'Outros': '📦'
  };

  var LS_DB = 'ci_db_v1';
  var LS_SESSION = 'ci_session';
  var ONLINE_MS = 120000;

  var db = null;
  var session = null;
  var TMP = { foto: null, cert: [], clientes: null };
  var S = { route: 'start', tab: '', q: '', area: '', filtro: 'todos', doc: null, selPro: null };

  /* ---------------- utilidades ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid(p) { return (p || 'x') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function money(v) {
    var n = Number(v || 0);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function dbr(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR');
  }
  function dtbr(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function initials(n) {
    var p = String(n || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
  }
  function digits(v) { return String(v || '').replace(/\D/g, ''); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
  function tempoRel(iso) {
    var t = Date.now() - new Date(iso).getTime();
    if (!iso || isNaN(t)) return '';
    var m = Math.floor(t / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return 'há ' + m + ' min';
    var h = Math.floor(m / 60);
    if (h < 24) return 'há ' + h + 'h';
    return 'há ' + Math.floor(h / 24) + 'd';
  }
  var _UNI = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
    'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  var _DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  var _CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  function c3(n) {
    if (n === 100) return 'cem';
    var out = [], c = Math.floor(n / 100), r = n % 100;
    if (c) out.push(_CEM[c]);
    if (r) {
      if (r < 20) out.push(_UNI[r]);
      else out.push(_DEZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + _UNI[r % 10] : ''));
    }
    return out.join(' e ');
  }
  function extenso(v) {
    var n = Math.round(Number(v || 0) * 100) / 100;
    var inteiro = Math.floor(n), cent = Math.round((n - inteiro) * 100);
    function inteiroTxt(x) {
      if (x === 0) return 'zero';
      var parts = [], mi = Math.floor(x / 1000000), mil = Math.floor((x % 1000000) / 1000), resto = x % 1000;
      if (mi) parts.push(mi === 1 ? 'um milhão' : c3(mi) + ' milhões');
      if (mil) parts.push(mil === 1 ? 'mil' : c3(mil) + ' mil');
      if (resto) parts.push(c3(resto));
      var out = '';
      parts.forEach(function (p, i) {
        if (i === 0) out = p;
        else if (i === parts.length - 1 && resto < 100) out += ' e ' + p;
        else out += ' ' + p;
      });
      return out;
    }
    var txt = inteiroTxt(inteiro) + (inteiro === 1 ? ' real'
      : (inteiro >= 1000000 && inteiro % 1000000 === 0 ? ' de reais' : ' reais'));
    if (cent) txt += ' e ' + c3(cent) + (cent === 1 ? ' centavo' : ' centavos');
    return txt;
  }
  function timeline(r) {
    var h = (r.historico || []).slice(-5);
    if (!h.length) return '<ul class="tl"><li><b>Pedido criado</b> · ' + dtbr(r.criadoEm) + '</li></ul>';
    return '<ul class="tl">' + h.map(function (x) {
      return '<li><b>' + esc(x.texto) + '</b> · ' + dtbr(x.em) + '</li>';
    }).join('') + '</ul>';
  }
  function badgeCacaPro(u) {
    return db.requests.filter(function (r) {
      if ((r.atribuidos || []).indexOf(u.id) < 0) return false;
      if (r.status === 'concluida') return false;
      return !(r.propostas || []).some(function (p) { return p.profId === u.id; });
    }).length;
  }
  function maskCPF(v) {
    var d = digits(v).slice(0, 11);
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  function maskPhone(v) {
    var d = digits(v).slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  }
  function maskCNPJ(v) {
    var d = digits(v).slice(0, 14);
    return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
  function waLink(num, msg) {
    var d = digits(num);
    if (d.length <= 11) d = '55' + d;
    return 'https://wa.me/' + d + '?text=' + encodeURIComponent(msg || '');
  }

  function toast(msg) {
    var r = $('#toast-root');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    r.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }
  function openModal(html) {
    $('#sheet').innerHTML = '<button class="fechar" onclick="App.closeModal()">✕</button>' + html;
    $('#modal-root').classList.add('on');
  }
  function closeModal() { $('#modal-root').classList.remove('on'); $('#sheet').innerHTML = ''; }
  function confirmar(msg, ok) { if (window.confirm(msg)) ok(); }

  /* ---------------- banco local ---------------- */
  function defaultDB() {
    return {
      users: [], requests: [], orders: [],
      config: {
        masterPin: '1234', masterNome: 'Elton', caca: 'todos',
        igreja: 'Igreja Presença de Deus', marca: 'Conecta Irmãos',
        seeded: false, seqReq: 1, seqOS: 1
      },
      presence: {}
    };
  }
  function load() {
    try { db = JSON.parse(localStorage.getItem(LS_DB) || 'null'); } catch (e) { db = null; }
    if (!db || !db.users) db = defaultDB();
    if (!db.presence) db.presence = {};
    if (!db.config) db.config = defaultDB().config;
    try { session = JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); } catch (e) { session = null; }
  }
  function save() {
    try { localStorage.setItem(LS_DB, JSON.stringify(db)); }
    catch (e) { toast('Armazenamento cheio. Remova fotos grandes.'); }
  }
  function touch(o) { o.atualizadoEm = new Date().toISOString(); return o; }

  function users() { return db.users || []; }
  function findUser(id) { for (var i = 0; i < users().length; i++) if (users()[i].id === id) return users()[i]; return null; }
  function pros() { return users().filter(function (u) { return u.tipo === 'profissional'; }); }
  function clientes() { return users().filter(function (u) { return u.tipo === 'cliente'; }); }
  function me() { return session && session.uid !== 'master' ? findUser(session.uid) : null; }
  function isMaster() { return session && session.role === 'master'; }
  function isOnline(id) { return Date.now() - (db.presence[id] || 0) < ONLINE_MS; }
  function onlineCount() { return users().filter(function (u) { return isOnline(u.id); }).length; }
  function areaOf(u) { return u.area || u.categoria || 'Outros'; }

  function persistUser(u, table) {
    touch(u);
    var i = users().indexOf(findUser(u.id));
    if (i < 0) db.users.push(u);
    save();
    cloud.push(table || 'ci_users', u);
  }
  function persistObj(list, obj, table) {
    touch(obj);
    var found = null;
    for (var i = 0; i < list.length; i++) if (list[i].id === obj.id) found = list[i];
    if (!found) list.push(obj);
    save();
    cloud.push(table, obj);
  }

  /* ---------------- nuvem opcional (Supabase REST) ---------------- */
  var cloud = (function () {
    var falhou = false;
    function on() {
      return !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.fetch) && !falhou;
    }
    function vigiar(r) {
      if (r && (r.status === 404 || r.status === 401 || r.status === 400)) falhou = true;
      return r;
    }
    function headers(extra) {
      var h = {
        apikey: CFG.supabaseAnonKey,
        Authorization: 'Bearer ' + CFG.supabaseAnonKey,
        'Content-Type': 'application/json'
      };
      if (extra) for (var k in extra) h[k] = extra[k];
      return h;
    }
    function base() { return String(CFG.supabaseUrl).replace(/\/+$/, '') + '/rest/v1/'; }
    function push(table, obj) {
      if (!on() || !table) return Promise.resolve();
      return fetch(base() + table, {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=merge-duplicates' }),
        body: JSON.stringify([{ id: obj.id, updated_at: new Date().toISOString(), data: obj }])
      }).then(vigiar).catch(function () { });
    }
    function pullAll() {
      if (!on()) return Promise.resolve();
      var tables = ['ci_users', 'ci_requests', 'ci_orders'];
      return Promise.all(tables.map(function (t) {
        return fetch(base() + t + '?select=id,data', { headers: headers() })
          .then(vigiar)
          .then(function (r) { return r && r.ok ? r.json() : []; })
          .catch(function () { return []; });
      })).then(function (res) {
        var changed = false;
        res[0].forEach(function (row) {
          var remote = row.data; if (!remote || !remote.id) return;
          var local = findUser(remote.id);
          if (!local) { db.users.push(remote); changed = true; }
          else if (String(remote.atualizadoEm || '') > String(local.atualizadoEm || '')) {
            for (var k in remote) local[k] = remote[k];
            changed = true;
          }
        });
        res[1].forEach(function (row) {
          var r = row.data; if (!r || !r.id) return;
          var l = db.requests.filter(function (x) { return x.id === r.id; })[0];
          if (!l) { db.requests.push(r); changed = true; }
          else if (String(r.atualizadoEm || '') > String(l.atualizadoEm || '')) { Object.assign(l, r); changed = true; }
        });
        res[2].forEach(function (row) {
          var r = row.data; if (!r || !r.id) return;
          var l = db.orders.filter(function (x) { return x.id === r.id; })[0];
          if (!l) { db.orders.push(r); changed = true; }
          else if (String(r.atualizadoEm || '') > String(l.atualizadoEm || '')) { Object.assign(l, r); changed = true; }
        });
        if (changed) save();
        return changed;
      }).catch(function () { return false; });
    }
    function presencePush() {
      if (!on() || !session) return Promise.resolve();
      var u = me();
      return fetch(base() + 'ci_presence', {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=merge-duplicates' }),
        body: JSON.stringify([{ id: session.uid, updated_at: new Date().toISOString(), data: { last_seen: Date.now(), nome: u ? u.nome : 'Central' } }])
      }).then(vigiar).catch(function () { });
    }
    function presencePull() {
      if (!on()) return Promise.resolve();
      return fetch(base() + 'ci_presence?select=id,data', { headers: headers() })
        .then(vigiar)
        .then(function (r) { return r && r.ok ? r.json() : []; })
        .then(function (rows) {
          var changed = false;
          rows.forEach(function (row) {
            var ls = row.data && row.data.last_seen;
            if (ls && !db.presence[row.id]) { db.presence[row.id] = ls; changed = true; }
            else if (ls && ls > (db.presence[row.id] || 0)) { db.presence[row.id] = ls; changed = true; }
          });
          if (changed) save();
          return changed;
        }).catch(function () { return false; });
    }
    return { on: on, push: push, pullAll: pullAll, presencePush: presencePush, presencePull: presencePull, headers: headers, base: base };
  })();

  /* ---------------- sessão / presença ---------------- */
  function heartbeat() {
    if (!session) return;
    db.presence[session.uid] = Date.now();
    save();
    cloud.presencePush();
  }
  function login(user, role) {
    session = { uid: user ? user.id : 'master', role: role || (user ? user.tipo : 'master') };
    localStorage.setItem(LS_SESSION, JSON.stringify(session));
    if (user) { user.ultimoAcesso = new Date().toISOString(); touch(user); save(); cloud.push('ci_users', user); }
    heartbeat();
    S.route = 'app'; S.tab = '';
    render();
  }
  function logout() {
    if (session) delete db.presence[session.uid];
    save();
    session = null;
    localStorage.removeItem(LS_SESSION);
    S.route = 'start'; S.tab = '';
    closeModal();
    render();
  }

  /* ---------------- fotos ---------------- */
  function pickPhoto(cb, max) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var img = new Image();
        img.onload = function () {
          var mx = max || 420;
          var s = Math.min(1, mx / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          cb(c.toDataURL('image/jpeg', 0.78));
        };
        img.src = r.result;
      };
      r.readAsDataURL(f);
    };
    inp.click();
  }

  /* ---------------- componentes ---------------- */
  function logoSvg(sz, dark) {
    var s = sz || 56;
    return '<svg class="logo-svg" width="' + s + '" height="' + s + '" viewBox="0 0 64 64" fill="none">' +
      '<path d="M32 58C19 47 7 36 7 24.5 7 15.8 13.8 9 22.4 9c3.9 0 7.4 1.8 9.6 4.6C34.2 10.8 37.7 9 41.6 9 50.2 9 57 15.8 57 24.5 57 36 45 47 32 58Z" stroke="' + (dark ? '#12345c' : '#ffffff') + '" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<path d="M32 22v18M24.5 29.5h15" stroke="#e8b22b" stroke-width="3.4" stroke-linecap="round"/>' +
      '<circle cx="32" cy="6" r="2.4" fill="#e8b22b"/><circle cx="26" cy="7.5" r="1.8" fill="#e8b22b"/><circle cx="38" cy="7.5" r="1.8" fill="#e8b22b"/>' +
      '</svg>';
  }
  var CAT_COLOR = {
    'Construção': '#f4772e', 'Alimentação': '#e5484d', 'Beleza': '#e0508f', 'Saúde': '#16a34a',
    'Automotivo': '#dc2626', 'Tecnologia': '#5b5bd6', 'Serviços': '#2f7ff0', 'Eventos': '#8b5cf6',
    'Gestão': '#0ea5e9', 'Outros': '#7c8794'
  };
  function isFav(id) {
    var f = [];
    try { f = JSON.parse(localStorage.getItem('ci_favs') || '[]'); } catch (e) { f = []; }
    return f.indexOf(id) >= 0;
  }
  function toggleFav(id) {
    var f = [];
    try { f = JSON.parse(localStorage.getItem('ci_favs') || '[]'); } catch (e) { f = []; }
    var i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    localStorage.setItem('ci_favs', JSON.stringify(f));
  }
  function nota(p) { return p.nota || (p.estrelas ? Number(p.estrelas).toFixed(1) : '4.8'); }
  function avaliacoes(p) { return p.avaliacoes || (p.estrelas ? Number(p.estrelas) * 5 - 1 : 7); }

  function chooser() {
    openModal('<h3>Como você quer entrar?</h3>' +
      '<button class="card tight" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center;cursor:pointer" onclick="App.closeModal();App.route(\'cliente\')">' +
        '<div style="font-size:24px">🔎</div><div class="grow"><b> Sou cliente</b><div class="muted small">Encontrar profissional ou pedir um serviço</div></div><div style="color:var(--cinza)">›</div></button>' +
      '<button class="card tight" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center;cursor:pointer" onclick="App.closeModal();App.route(\'profissional\')">' +
        '<div style="font-size:24px">🧑‍🔧</div><div class="grow"><b> Sou profissional</b><div class="muted small">Divulgar meu serviço e atender</div></div><div style="color:var(--cinza)">›</div></button>' +
      '<button class="card tight" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center;cursor:pointer" onclick="App.closeModal();App.route(\'master\')">' +
        '<div style="font-size:24px">🛡️</div><div class="grow"><b> Central / administração</b><div class="muted small">Aprovações, caça e configurações</div></div><div style="color:var(--cinza)">›</div></button>');
  }


  function brandBlock(compact) {
    return '<div class="brand" style="margin:' + (compact ? '6px 0 14px' : '18px 0 20px') + '">' +
      '<div class="logo"><div class="mark">CI</div><div class="nome">' + esc(db.config.marca || 'Conecta Irmãos') + '</div></div>' +
      '<div class="igreja">' + esc(db.config.igreja || 'Igreja Presença de Deus') + '</div>' +
      '<div class="by">by Elton · Sistema e Logística</div></div>';
  }
  function topbar(me) {
    return '<div class="topbar"><div class="inner">' +
      '<div class="mark">CI</div>' +
      '<div class="t"><b>' + esc(db.config.marca || 'Conecta Irmãos') + '</b><span>' + esc(db.config.igreja || 'Igreja Presença de Deus') + '</span></div>' +
      '<span class="chip gray" style="font-size:11px">' + (isMaster() ? 'Central' : esc(me && me.tipo === 'profissional' ? 'Profissional' : 'Cliente')) + '</span>' +
      '<button class="icon-btn" onclick="App.logout()" title="Sair">⏻</button>' +
      '</div></div>';
  }
  function tabbar(items, current) {
    return '<div class="tabbar"><div class="inner">' + items.map(function (it) {
      if (it.fab) {
        return '<button class="fab-item" onclick="' + it.action + '">' +
          '<span class="fab-plus">+</span><span class="fab-lb">' + it.label + '</span></button>';
      }
      return '<button class="' + (current === it.id ? 'on' : '') + '" onclick="App.go(\'' + it.id + '\')">' +
        '<span class="ic">' + it.ic + '</span>' + it.label +
        (it.badge ? '<span class="tbadge">' + (it.badge > 9 ? '9+' : it.badge) + '</span>' : '') +
        '</button>';
    }).join('') + '</div></div>';
  }
  function footer() {
    return '<div class="footer-app"><b>' + esc(db.config.igreja || 'IGREJA PRESENÇA DE DEUS') + '</b><br>' +
      esc(db.config.marca || 'Conecta Irmãos') + ' · by Elton · Sistema e Logística</div>';
  }
  function avatar(u, cls) {
    if (u && u.foto) return '<img class="avatar ' + (cls || '') + '" src="' + u.foto + '" alt="">';
    return '<div class="avatar ' + (cls || '') + '">' + esc(initials(u && u.nome)) + '</div>';
  }
  function verified(p) { return !!(p.verificado || p.certStatus === 'aprovado'); }
  function stars(n) {
    n = Math.max(0, Math.min(5, Number(n || 0)));
    if (!n) return '';
    return '<span class="stars">' + '★'.repeat(n) + '<span style="opacity:.25">' + '★'.repeat(5 - n) + '</span></span>';
  }
  function proCard(p) {
    var fav = isFav(p.id);
    return '<div class="list-card">' + avatar(p, 'lg') +
      '<div class="grow" style="min-width:0">' +
        '<div class="row between" style="align-items:flex-start;gap:6px">' +
          '<div style="min-width:0"><div class="pc-name">' + esc(p.nome) + '</div>' +
            '<div class="pc-role">' + esc(p.profissao || areaOf(p)) + '</div>' +
            '<div class="rating">' + stars(p.estrelas) + ' <b>' + nota(p) + '</b> <span>(' + avaliacoes(p) + ')</span></div></div>' +
          '<div style="text-align:right"><span class="pill-ativo">' + (isOnline(p.id) ? '● Ativo' : 'Ativo') + '</span>' +
            '<button class="fav-btn" onclick="App.fav(\'' + p.id + '\')">' + (fav ? '♥' : '♡') + '</button></div>' +
        '</div>' +
        '<div class="pc-actions" style="margin-top:9px">' +
          '<button class="btn sm wapp" onclick="App.wa(\'' + esc(p.whats || '') + '\',\'' + esc(p.nome) + '\')">💬 WhatsApp</button>' +
          '<button class="btn sm ghost" onclick="App.openPro(\'' + p.id + '\')">Ver cartão</button>' +
        '</div>' +
      '</div></div>';
  }

  /* ---------------- telas de entrada ---------------- */
  function viewStart() {
    var total = pros().filter(function (p) { return p.status === 'aprovado'; }).length;
    return '<div class="start"><div class="start-inner">' +
      '<div class="start-top"><div class="small" style="opacity:.55;letter-spacing:2px">JUNTOS SOMOS MAIS FORTES</div></div>' +
      '<div class="brand-big">' + logoSvg(92) +
        '<div class="word">Conecta <span>Irmãos</span></div>' +
        '<div class="church">' + esc(db.config.igreja || 'Igreja Presença de Deus') + '</div>' +
        '<p class="tagline">Talentos que servem.<br>Pessoas que se ajudam.</p>' +
      '</div>' +
      '<div class="start-stats">' +
        '<div><b>' + total + '</b><span>profissionais</span></div>' +
        '<div><b>' + onlineCount() + '</b><span><span class="livedot"></span>online</span></div>' +
        '<div><b>' + users().length + '</b><span>na comunidade</span></div>' +
      '</div>' +
      '<div style="margin-top:auto;padding-top:24px">' +
        '<button class="btn gold" onclick="App.choose()">Entrar</button>' +
        '<button class="btn outline-light" style="margin-top:10px" onclick="App.choose()">Cadastrar</button>' +
        '<button class="btn link" style="color:rgba(255,255,255,.45);margin-top:10px" onclick="App.route(\'master\')">Acesso da Central</button>' +
        '<div class="start-foot">by Elton · Sistema e Logística</div>' +
      '</div>' +
      '</div></div>';
  }

  function viewAuth(role) {
    var isPro = role === 'profissional';
    TMP.foto = null;
    var areas = Object.keys(AREAS).map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('');
    var body = isPro ? proFormFields(areas) : clientFormFields();
    return '<div class="wrap">' + brandBlock(true) +
      '<h2>' + (isPro ? 'Cadastro de profissional' : 'Identificação do cliente') + '</h2>' +
      '<p class="muted small" style="margin-bottom:14px">' + (isPro
        ? 'Nome é obrigatório. Os demais dados ajudam a comunidade a te encontrar. Seu perfil passa pela aprovação da Central.'
        : 'Entre com seu nome. Se ainda não tem cadastro, ele é criado agora — leva menos de um minuto.') + '</p>' +
      '<form class="card" onsubmit="App.doAuth(event,\'' + role + '\')">' + body +
        '<button class="btn" type="submit">' + (isPro ? 'Enviar cadastro' : 'Entrar / cadastrar') + '</button>' +
        '<button class="btn link" type="button" onclick="App.route(\'start\')">‹ voltar</button>' +
      '</form></div>' + footer();
  }

  function clientFormFields() {
    return '<div class="field"><label>Nome completo <span class="req">*</span></label><input name="nome" required placeholder="Como você se chama"></div>' +
      '<div class="field2">' +
        '<div class="field"><label>WhatsApp <span class="req">*</span></label><input name="whats" required inputmode="tel" placeholder="(00) 00000-0000" oninput="App.mask(this,\'tel\')"></div>' +
        '<div class="field"><label>Data de nascimento</label><input name="nasc" type="date"></div>' +
      '</div>' +
      '<div class="field"><label>CPF</label><input name="cpf" inputmode="numeric" placeholder="000.000.000-00" oninput="App.mask(this,\'cpf\')"><div class="hint">Obrigatório apenas se você usar o caça profissional.</div></div>' +
      '<div class="field"><label>Foto (opcional)</label><div class="photo-pick"><div id="foto-prev">' + '<div class="avatar">?</div>' + '</div>' +
        '<button type="button" class="btn sm ghost" onclick="App.photo(\'cliente\')">Escolher foto</button></div></div>';
  }

  function proFormFields(areas) {
    return '<div class="field"><label>Nome completo <span class="req">*</span></label><input name="nome" required></div>' +
      '<div class="field2">' +
        '<div class="field"><label>Apelido / como é conhecido</label><input name="apelido" placeholder="Ex.: Irmão João"></div>' +
        '<div class="field"><label>WhatsApp <span class="req">*</span></label><input name="whats" required inputmode="tel" placeholder="(00) 00000-0000" oninput="App.mask(this,\'tel\')"></div>' +
      '</div>' +
      '<div class="field2">' +
        '<div class="field"><label>Área profissional <span class="req">*</span></label><select name="area" required onchange="App.syncProfissoes(this)">' +
        '<option value="">Selecione…</option>' + areas + '</select></div>' +
        '<div class="field"><label>Profissão <span class="req">*</span></label><select name="profissao" required id="sel-profissao"><option value="">Escolha a área</option></select></div>' +
      '</div>' +
      '<div class="field"><label>O que você faz <span class="req">*</span></label><textarea name="faz" required placeholder="Ex.: Instalações elétricas residenciais, troca de disjuntor, tomadas…"></textarea></div>' +
      '<div class="field"><label>Onde atende <span class="req">*</span></label><input name="atende" required placeholder="Bairros, cidade ou região"></div>' +
      '<div class="field2">' +
        '<div class="field"><label>Dias de atendimento</label><input name="dias" placeholder="Ex.: Seg a Sáb"></div>' +
        '<div class="field"><label>Horário</label><input name="horario" placeholder="Ex.: 8h às 18h"></div>' +
      '</div>' +
      '<div class="field"><label>Endereço</label><input name="endereco" placeholder="Rua, número, bairro"></div>' +
      '<div class="field2">' +
        '<div class="field"><label>CPF</label><input name="cpf" inputmode="numeric" oninput="App.mask(this,\'cpf\')" placeholder="000.000.000-00"></div>' +
        '<div class="field"><label>CNPJ (se tiver)</label><input name="cnpj" inputmode="numeric" oninput="App.mask(this,\'cnpj\')" placeholder="00.000.000/0000-00"><div class="hint">Com CNPJ você pode emitir a carteirinha.</div></div>' +
      '</div>' +
      '<div class="field"><label>Data de nascimento</label><input name="nasc" type="date"></div>' +
      '<div class="field"><label>Foto (opcional)</label><div class="photo-pick"><div id="foto-prev"><div class="avatar">?</div></div>' +
        '<button type="button" class="btn sm ghost" onclick="App.photo(\'profissional\')">Escolher foto</button></div></div>' +
      '<label class="row small" style="gap:8px;align-items:flex-start;margin:4px 0 14px"><input type="checkbox" name="termos" required style="width:auto;margin-top:2px"> <span class="muted">Autorizo a divulgação do meu contato na plataforma da igreja e confirmo que as informações são verdadeiras.</span></label>';
  }

  function syncProfissoes(sel) {
    var list = AREAS[sel.value] || [];
    var form = sel.form || document;
    var target = form.querySelector('[name="profissao"]') || $('#sel-profissao');
    if (!target) return;
    var atual = target.value;
    target.innerHTML = '<option value="">Selecione…</option>' + list.map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('');
    if (list.indexOf(atual) >= 0) target.value = atual;
  }

  /* ---------------- cliente ---------------- */
  function viewCliente(u) {
    var tab = S.tab || 'buscar';
    var content = '';
    if (tab === 'buscar') content = clienteBuscar(u);
    else if (tab === 'categorias') content = clienteCategorias();
    else if (tab === 'favoritos') content = clienteFavoritos();
    else if (tab === 'pedidos') content = clientePedidos(u);
    else content = clientePerfil(u);
    return topbar(u) + '<div class="wrap">' + content + '</div>' + footer() +
      tabbar([
        { id: 'buscar', ic: '🏠', label: 'Início' },
        { id: 'categorias', ic: '▦', label: 'Categorias' },
        { id: 'solicitar', fab: true, label: 'Solicitar', action: 'App.novoPedidoCliente()' },
        { id: 'favoritos', ic: '♡', label: 'Favoritos' },
        { id: 'perfil', ic: '👤', label: 'Perfil' }
      ], tab);
  }

  function clienteBuscar(u) {
    var q = norm(S.q), filtro = S.filtro || 'todos';
    var base = pros().filter(function (p) {
      if (p.status !== 'aprovado') return false;
      if (S.area && areaOf(p) !== S.area) return false;
      if (!q) return true;
      return norm([p.nome, p.apelido, p.profissao, p.faz, p.atende, p.area].join(' ')).indexOf(q) >= 0;
    });
    var list = base.filter(function (p) {
      if (filtro === 'online') return isOnline(p.id);
      if (filtro === 'verificados') return verified(p);
      if (filtro === 'top') return Number(p.estrelas || 0) >= 4;
      return true;
    }).sort(function (a, b) {
      return (isOnline(b.id) ? 1 : 0) - (isOnline(a.id) ? 1 : 0) || Number(b.estrelas || 0) - Number(a.estrelas || 0);
    });
    return '<div class="home-head"><div><div class="hh-small">Bem-vindo</div><b>' + esc((u.nome || '').split(' ')[0]) + '</b></div>' +
      '<div class="row" style="gap:6px">' + logoSvg(34) + '</div></div>' +
      '<div class="search-pill"><span>🔎</span><input id="busca" placeholder="Buscar por serviço ou profissional…" value="' + esc(S.q) + '" oninput="App.search(this.value)"></div>' +
      '<div class="hero-mini"><div><b>Aqui você encontra profissionais da nossa igreja</b><span>com confiança e propósito.</span></div></div>' +
      '<div class="row between" style="margin:16px 2px 10px"><b class="sec-inline">Categorias de Serviços</b>' +
        '<button class="btn xs link" onclick="App.go(\'categorias\')">ver todas</button></div>' +
      '<div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px">' +
        Object.keys(AREAS).slice(0, 6).map(function (a) {
          return '<button class="cat-tile" style="background:' + (CAT_COLOR[a] || '#7c8794') + '" onclick="App.area(\'' + esc(a) + '\');App.go(\'buscar\')">' +
            '<div class="ci">' + (AREA_ICON[a] || '📦') + '</div><div class="cl">' + esc(a) + '</div></button>';
        }).join('') +
      '</div>' +
      '<div class="row between" style="margin:18px 2px 10px"><b class="sec-inline">' + (S.area ? esc(S.area) : 'Profissionais') + ' · ' + list.length + '</b>' +
        (S.area || S.q ? '<button class="btn xs link" onclick="App.area(\'\');App.search(\'\')">limpar</button>' : '') + '</div>' +
      '<div class="filters">' + [['todos', 'Todos'], ['online', 'Online'], ['verificados', 'Verificados'], ['top', 'Melhores']].map(function (f) {
        return '<button class="' + (filtro === f[0] ? 'on' : '') + '" onclick="App.filtro(\'' + f[0] + '\')">' + f[1] + '</button>';
      }).join('') + '</div>' +
      (list.length ? list.map(proCard).join('') : '<div class="empty"><span class="big">🔍</span>Nenhum profissional aqui.</div>');
  }

  function clienteCategorias() {
    return '<div class="home-head"><div><div class="hh-small">Explorar</div><b>Categorias</b></div>' + logoSvg(34) + '</div>' +
      '<div class="grid" style="grid-template-columns:repeat(2,1fr);gap:10px;margin-top:12px">' +
      Object.keys(AREAS).map(function (a) {
        var n = pros().filter(function (p) { return p.status === 'aprovado' && areaOf(p) === a; }).length;
        return '<button class="cat-big" style="background:' + (CAT_COLOR[a] || '#7c8794') + '" onclick="App.area(\'' + esc(a) + '\');App.go(\'buscar\')">' +
          '<div class="ci">' + (AREA_ICON[a] || '📦') + '</div><div class="cb-t">' + esc(a) + '</div><div class="cb-n">' + n + ' profissional(is)</div></button>';
      }).join('') + '</div>';
  }

  function clienteFavoritos() {
    var f = [];
    try { f = JSON.parse(localStorage.getItem('ci_favs') || '[]'); } catch (e) { f = []; }
    var list = pros().filter(function (p) { return f.indexOf(p.id) >= 0 && p.status === 'aprovado'; });
    return '<div class="home-head"><div><div class="hh-small">Seus</div><b>Favoritos</b></div>' + logoSvg(34) + '</div>' +
      (list.length ? '<div style="margin-top:12px">' + list.map(proCard).join('') + '</div>'
        : '<div class="empty"><span class="big">♡</span>Toque no coração de um profissional<br><span class="small">para salvar aqui.</span></div>');
  }

  function perfilProSheet(p) {
    var wa = p.whats ? '<button class="btn sm wapp" style="flex:0 0 auto" onclick="App.wa(\'' + esc(p.whats) + '\',\'' + esc(p.nome) + '\')">💬</button>' : '';
    return '<div class="psheet">' +
      '<div class="ps-top">' + avatar(p, 'xl') +
        '<div class="grow"><div class="row" style="gap:6px;flex-wrap:wrap"><b class="ps-name">' + esc(p.nome) + '</b>' +
          (verified(p) ? '<span class="badge-verif">✔ verificado</span>' : '') + '</div>' +
        '<div class="ps-role">' + esc(p.profissao || areaOf(p)) + '</div>' +
        '<div class="ps-rate">' + stars(p.estrelas) + ' <b>' + nota(p) + '</b> <span>(' + avaliacoes(p) + ' avaliações)</span> ' +
          '<span class="pill-ativo">● Ativo</span></div></div></div>' +
      '<div class="ps-block"><div class="ps-h">Sobre mim</div><div class="small">' + esc(p.faz || 'Profissional da nossa comunidade.') + '</div></div>' +
      '<div class="ps-block"><div class="ps-h">Especialidades</div><div class="chips">' +
        (p.area ? '<span class="chip">' + esc(p.area) + '</span>' : '') +
        (p.atende ? '<span class="chip gray">📍 ' + esc(p.atende) + '</span>' : '') +
        (p.dias ? '<span class="chip gray">🗓 ' + esc(p.dias) + '</span>' : '') +
        (p.horario ? '<span class="chip gray">🕘 ' + esc(p.horario) + '</span>' : '') + '</div></div>' +
      '<div class="ps-block"><div class="ps-h">Contato</div>' +
        '<div class="row between"><div class="small">' + (p.whats || 'sem telefone') + '</div><div class="row" style="gap:6px">' + wa + '</div></div></div>' +
      '<button class="btn gold" style="margin-top:14px" onclick="App.wa(\'' + esc(p.whats || '') + '\',\'' + esc(p.nome) + '\')">Solicitar Orçamento</button>' +
      '</div>';
  }

  function clientePedidos(u) {
    var reqs = db.requests.filter(function (r) { return r.clienteId === u.id || norm(r.clienteNome) === norm(u.nome); })
      .sort(function (a, b) { return (b.criadoEm || '').localeCompare(a.criadoEm || ''); });
    var bloqueado = db.config.caca !== 'todos';
    return '<h2>Meus pedidos</h2>' +
      (bloqueado ? '<div class="hintbox">O caça profissional está em <b>teste interno</b>. Por enquanto só a Central cria solicitações. Em breve liberamos para todos.</div>' : '') +
      (reqs.length ? reqs.map(function (r) {
        var props = r.propostas || [];
        var escolhido = r.escolhidoId ? findUser(r.escolhidoId) : null;
        return '<div class="card tight">' +
          '<div class="row between"><div><b>' + esc(r.profissao || r.area || 'Pedido') + '</b>' +
            '<div class="muted small">Pedido #' + (r.numero || '') + ' · ' + tempoRel(r.criadoEm) + '</div></div>' +
            '<span class="chip ' + (r.status === 'concluida' ? 'gray' : r.status === 'aberta' ? 'gold' : 'green') + '">' + esc(r.status.replace('_', ' ')) + '</span></div>' +
          '<div class="small" style="margin:6px 0">' + esc(r.descricao) + '</div>' +
          '<div class="muted small">' + esc(r.endereco || '—') + '</div>' +
          (escolhido ? '<div class="chip green" style="margin-top:8px">✔ ' + esc(escolhido.nome) + ' escolhido</div>' : '') +
          (props.length ? '<hr class="dash">' + '<div class="sec-title" style="margin:0 0 6px">Orçamentos recebidos</div>' +
            props.map(function (pr) {
              var p = findUser(pr.profId);
              return '<div class="row between" style="padding:7px 0;border-bottom:1px dashed var(--linha)">' +
                '<div><b class="small">' + esc(p ? p.nome : '—') + '</b>' +
                '<div class="muted small">' + (pr.obs ? esc(pr.obs) : 'sem observação') + '</div></div>' +
                '<div class="row" style="gap:6px"><b style="font-size:13px">' + money(pr.valor) + '</b>' +
                (r.escolhidoId ? '' : '<button class="btn xs" onclick="App.escolher(\'' + r.id + '\',\'' + pr.profId + '\')">aceitar</button>') + '</div></div>';
            }).join('') : '<div class="muted small" style="margin-top:6px">Aguardando orçamentos…</div>') +
          '</div>';
      }).join('') : '<div class="empty"><span class="big">📋</span>Você ainda não tem pedidos.</div>');
  }

  function clientePerfil(u) {
    var completo = !!(u.cpf && u.nasc);
    return '<h2>Meu perfil</h2>' +
      '<div class="card"><div class="row">' + avatar(u, 'lg') + '<div class="grow"><b>' + esc(u.nome) + '</b><div class="muted small">' + esc(u.whats || '') + '</div>' +
      '<span class="chip ' + (completo ? 'green' : 'gold') + '" style="margin-top:4px">' + (completo ? 'cadastro completo' : 'cadastro básico') + '</span></div></div></div>' +
      '<form class="card" onsubmit="App.saveCliente(event)">' +
        '<div class="field"><label>Nome</label><input name="nome" value="' + esc(u.nome) + '" required></div>' +
        '<div class="field2"><div class="field"><label>WhatsApp</label><input name="whats" value="' + esc(u.whats || '') + '" oninput="App.mask(this,\'tel\')"></div>' +
        '<div class="field"><label>Nascimento</label><input type="date" name="nasc" value="' + esc(u.nasc || '') + '"></div></div>' +
        '<div class="field2"><div class="field"><label>CPF</label><input name="cpf" value="' + esc(u.cpf || '') + '" oninput="App.mask(this,\'cpf\')"></div>' +
        '<div class="field"><label>RG / identidade</label><input name="rg" value="' + esc(u.rg || '') + '"><div class="hint">Pedido no caça profissional.</div></div></div>' +
        '<div class="field"><label>Endereço</label><input name="endereco" value="' + esc(u.endereco || '') + '"></div>' +
        '<div class="field"><label>Foto</label><div class="photo-pick"><div id="foto-prev">' + avatar(u) + '</div><button type="button" class="btn sm ghost" onclick="App.photo(\'cliente\')">Trocar foto</button></div></div>' +
        '<button class="btn" type="submit">Salvar dados</button>' +
      '</form>' +
      '<div class="card tight"><div class="muted small">Cadastro criado em ' + dbr(u.criadoEm) + '. Seus dados de endereço só são compartilhados com o profissional que você escolher.</div></div>';
  }

  /* ---------------- painel do profissional (PAINEL 2) ---------------- */
  function viewPro(u) {
    var tab = S.tab || 'inicio';
    var content = '';
    if (tab === 'inicio') content = proInicio(u);
    else if (tab === 'caca') content = proCaca(u);
    else if (tab === 'clientes') content = proClientes(u);
    else if (tab === 'os') content = proOS(u);
    else content = proPerfil(u);
    return topbar(u) + '<div class="wrap">' + content + '</div>' + footer() +
      tabbar([
        { id: 'inicio', ic: '🏠', label: 'Início' },
        { id: 'caca', ic: '📡', label: 'Caça', badge: badgeCacaPro(u) },
        { id: 'clientes', ic: '👥', label: 'Clientes' },
        { id: 'os', ic: '🧾', label: 'OS' },
        { id: 'perfil', ic: '👤', label: 'Perfil' }
      ], tab);
  }

  function proInicio(u) {
    var on = isOnline(u.id);
    var minhas = db.orders.filter(function (o) { return o.profId === u.id; });
    var total = minhas.reduce(function (s, o) { return s + Number(o.valor || 0); }, 0);
    var pend = u.status === 'pendente';
    var bloqueado = u.status === 'bloqueado';
    return '<div class="row between" style="margin-bottom:10px"><div><h2 style="margin:0">' + esc(u.nome) + '</h2>' +
      '<div class="muted small">' + esc(u.profissao || '') + (u.apelido ? ' · "' + esc(u.apelido) + '"' : '') + '</div></div>' + avatar(u, 'lg') + '</div>' +
      (pend ? '<div class="hintbox">Seu cadastro está em análise pela Central. Você já pode completar o perfil, mas só aparece no catálogo depois da aprovação.</div>' : '') +
      (bloqueado ? '<div class="hintbox warn">Seu cadastro está bloqueado. Fale com a Central.</div>' : '') +
      '<div class="card"><div class="row between"><div class="row"><div><b>Disponibilidade</b><div class="muted small">' + (on ? 'Você está online e pode receber pedidos' : 'Você está offline') + '</div></div></div>' +
        '<button class="btn sm ' + (on ? '' : 'ghost') + '" onclick="App.toggleOnline()">' + (on ? '● Online' : '○ Ficar online') + '</button></div></div>' +
      '<div class="grid g3">' +
        '<div class="stat"><b>' + minhas.length + '</b><span>ordens de serviço</span></div>' +
        '<div class="stat"><b>' + money(total).replace('R$', '').trim().split(',')[0] + '</b><span>total emitido</span></div>' +
        '<div class="stat"><b>' + (u.estrelas || 0) + '</b><span>estrelas</span></div>' +
      '</div>' +
      '<div class="sec-title">Selo e certificação</div>' +
      '<div class="card tight"><div class="row between">' +
        '<div><b class="small">' + (verified(u) ? 'Perfil verificado' : 'Perfil não verificado') + '</b>' +
        '<div class="muted small">' + (verified(u) ? 'Certificação aprovada pela Central.' : 'Envie cópias de cursos ou diplomas para a Central liberar.') + '</div></div>' +
        (verified(u) ? '<span class="badge-verif">✔ verificado</span>' : '<button class="btn xs ghost" onclick="App.go(\'perfil\')">enviar</button>') +
      '</div></div>' +
      '<div class="sec-title">Atalhos</div>' +
      '<div class="grid g2">' +
        '<button class="btn ghost" onclick="App.go(\'os\')">🧾 Nova OS / recibo</button>' +
        '<button class="btn ghost" onclick="App.go(\'clientes\')">👥 Clientes</button>' +
        '<button class="btn ghost" onclick="App.go(\'caca\')">📡 Pedidos recebidos</button>' +
        '<button class="btn ghost" onclick="App.go(\'perfil\')">🪪 Carteirinha</button>' +
      '</div>';
  }

  function proCaca(u) {
    var meus = db.requests.filter(function (r) {
      return (r.atribuidos || []).indexOf(u.id) >= 0 && r.status !== 'concluida';
    }).sort(function (a, b) { return (b.criadoEm || '').localeCompare(a.criadoEm || ''); });
    return '<h2>Caça profissional</h2>' +
      '<div class="hintbox ' + (db.config.caca === 'admin' ? '' : 'info') + '">' +
        (db.config.caca === 'admin'
          ? 'Modo teste: só a Central cria solicitações. Os pedidos aparecem aqui quando a Central distribui para você.'
          : 'Modo aberto: clientes também podem solicitar serviços.') + '</div>' +
      '<div class="row between" style="margin:14px 2px 6px"><b style="font-size:13px">Pedidos para você · ' + meus.length + '</b>' +
        '<button class="btn xs ghost" onclick="App.toggleOnline()">' + (isOnline(u.id) ? '● Online' : '○ Ficar online') + '</button></div>' +
      (u.status !== 'aprovado' ? '<div class="hintbox warn">Aguarde a aprovação da Central para receber pedidos.</div>' : '') +
      (meus.length ? meus.map(function (r) {
        var meu = (r.propostas || []).filter(function (p) { return p.profId === u.id; })[0];
        var urgente = /rápido|hoje/i.test(r.urgencia || '');
        return '<div class="card tight">' +
          '<div class="row between"><div class="row" style="gap:6px;flex-wrap:wrap"><b>' + esc(r.profissao || r.area || 'Serviço') + '</b>' +
            '<span class="urgencia">' + esc(r.urgencia || 'a combinar') + '</span></div>' +
            '<span class="chip ' + (r.status === 'aberta' ? 'gold' : 'green') + '">' + esc(r.status.replace('_', ' ')) + '</span></div>' +
          '<div class="small" style="margin:7px 0">' + esc(r.descricao) + '</div>' +
          '<div class="muted small">📍 ' + esc(r.endereco || 'endereço liberado no aceite') + ' · ⏱ ' + tempoRel(r.criadoEm) + '</div>' +
          (urgente ? '' : '') +
          '<div class="muted small" style="margin-top:5px">Pedido #' + (r.numero || '') + '</div>' +
          (meu ? '<div class="row between" style="margin-top:9px"><span class="chip gold">seu orçamento: ' + money(meu.valor) + '</span>' +
              (r.escolhidoId === u.id ? '<span class="chip green">✔ você foi escolhido</span>' : '<span class="muted small">aguardando o cliente</span>') + '</div>'
            : '<div class="row" style="gap:6px;margin-top:10px"><button class="btn sm" onclick="App.orcamento(\'' + r.id + '\')">Aceitar e enviar orçamento</button>' +
              '<button class="btn sm ghost" onclick="App.recusarPedido(\'' + r.id + '\')">Recusar</button></div>') +
          (r.status !== 'concluida' ? '<div class="muted small" style="margin-top:8px">' + timeline(r) + '</div>' : '') +
          '</div>';
      }).join('') : '<div class="empty"><span class="big">📡</span>Nenhum pedido no momento.<br><span class="small">Fique online para ser escolhido primeiro.</span></div>') +
      '<div class="card flat" style="margin-top:10px"><div class="muted small">O caça profissional vive neste Painel 2. A Central acompanha cada pedido, os orçamentos e a escolha do cliente.</div></div>';
  }

  function listaClientes() {
    var map = {};
    clientes().forEach(function (c) {
      map[norm(c.nome) + '|' + digits(c.whats || '')] = { id: c.id, nome: c.nome, whats: c.whats, cpf: c.cpf, endereco: c.endereco };
    });
    db.orders.forEach(function (o) {
      var k = norm(o.clienteNome) + '|' + digits(o.clienteWhats || '');
      if (!map[k]) map[k] = { id: '', nome: o.clienteNome, whats: o.clienteWhats, cpf: o.clienteCpf, endereco: '' };
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return String(a.nome).localeCompare(String(b.nome)); });
  }

  function proClientes(u) {
    var list = listaClientes();
    return '<h2>Clientes</h2>' +
      '<p class="muted small">Selecione um cliente já cadastrado ou cadastre um novo na hora de criar a OS.</p>' +
      '<button class="btn" onclick="App.novaOS()">➕ Nova ordem de serviço</button>' +
      '<div class="sec-title">Cadastrados · ' + list.length + '</div>' +
      (list.length ? '<div class="card tight">' + list.map(function (c) {
        return '<div class="item">' + avatar(c, 'sm') + '<div class="grow"><div class="nm">' + esc(c.nome) + '</div>' +
          '<div class="sub">' + esc(c.whats || 'sem telefone') + '</div></div>' +
          '<button class="btn xs ghost" onclick="App.novaOS(\'' + esc(c.nome) + '\')">OS</button></div>';
      }).join('') + '</div>' : '<div class="empty"><span class="big">👥</span>Nenhum cliente ainda.</div>');
  }

  function proOS(u) {
    var list = db.orders.filter(function (o) { return o.profId === u.id; })
      .sort(function (a, b) { return (b.criadoEm || '').localeCompare(a.criadoEm || ''); });
    return '<div class="row between"><h2 style="margin:0">OS e recibos</h2><button class="btn sm" onclick="App.novaOS()">➕ Nova</button></div>' +
      '<p class="muted small">Emita a ordem de serviço e, depois do pagamento, o recibo.</p>' +
      (list.length ? list.map(function (o) {
        return '<div class="card tight">' +
          '<div class="row between"><div><b>OS-' + String(o.numero).padStart(4, '0') + '</b> <span class="muted small">' + dbr(o.criadoEm) + '</span></div>' +
          '<span class="chip ' + (o.pago ? 'green' : 'gold') + '">' + (o.pago ? 'pago' : 'em aberto') + '</span></div>' +
          '<div class="small" style="margin:4px 0">' + esc(o.clienteNome) + ' · ' + esc(o.servico) + '</div>' +
          '<div class="row between"><b>' + money(o.valor) + '</b><div class="row" style="gap:6px">' +
          '<button class="btn xs ghost" onclick="App.printOS(\'' + o.id + '\')">OS</button>' +
          '<button class="btn xs ghost" onclick="App.printRecibo(\'' + o.id + '\')">Recibo</button>' +
          (o.pago ? '' : '<button class="btn xs gold" onclick="App.pagar(\'' + o.id + '\')">Pago</button>') +
          '</div></div></div>';
      }).join('') : '<div class="empty"><span class="big">🧾</span>Nenhuma OS emitida.</div>');
  }

  function proPerfil(u) {
    var areas = Object.keys(AREAS).map(function (a) { return '<option' + (areaOf(u) === a ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('');
    var profs = (AREAS[areaOf(u)] || []).map(function (p) { return '<option' + (u.profissao === p ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('');
    var certOk = u.certStatus === 'aprovado';
    var temCnpj = !!(u.cnpj && digits(u.cnpj).length >= 14);
    return '<h2>Meu perfil</h2>' +
      '<form class="card" onsubmit="App.savePro(event)">' +
        '<div class="field"><label>Nome <span class="req">*</span></label><input name="nome" value="' + esc(u.nome) + '" required></div>' +
        '<div class="field"><label>Empresa / fantasia <span class="muted small">(cabeçalho dos documentos)</span></label><input name="empresa" value="' + esc(u.empresa || '') + '" placeholder="Ex.: Elton Miranda — Gestão de Dados"></div>' +
        '<div class="field2"><div class="field"><label>Apelido</label><input name="apelido" value="' + esc(u.apelido || '') + '"></div>' +
        '<div class="field"><label>WhatsApp</label><input name="whats" value="' + esc(u.whats || '') + '" oninput="App.mask(this,\'tel\')"></div></div>' +
        '<div class="field2"><div class="field"><label>Área</label><select name="area" onchange="App.syncProfissoes(this)"><option value="">—</option>' + areas + '</select></div>' +
        '<div class="field"><label>Profissão</label><select name="profissao" id="sel-profissao"><option value="">—</option>' + profs + '</select></div></div>' +
        '<div class="field"><label>O que faz</label><textarea name="faz">' + esc(u.faz || '') + '</textarea></div>' +
        '<div class="field"><label>Onde atende</label><input name="atende" value="' + esc(u.atende || '') + '"></div>' +
        '<div class="field2"><div class="field"><label>Dias</label><input name="dias" value="' + esc(u.dias || '') + '"></div>' +
        '<div class="field"><label>Horário</label><input name="horario" value="' + esc(u.horario || '') + '"></div></div>' +
        '<div class="field"><label>Endereço</label><input name="endereco" value="' + esc(u.endereco || '') + '"></div>' +
        '<div class="field2"><div class="field"><label>CPF</label><input name="cpf" value="' + esc(u.cpf || '') + '" oninput="App.mask(this,\'cpf\')"></div>' +
        '<div class="field"><label>CNPJ</label><input name="cnpj" value="' + esc(u.cnpj || '') + '" oninput="App.mask(this,\'cnpj\')"></div></div>' +
        '<div class="field"><label>Foto</label><div class="photo-pick"><div id="foto-prev">' + avatar(u) + '</div>' +
        '<button type="button" class="btn sm ghost" onclick="App.photo(\'profissional\')">Trocar foto</button></div></div>' +
        '<button class="btn" type="submit">Salvar perfil</button>' +
      '</form>' +

      '<div class="sec-title">Certificação (cópia de curso ou diploma)</div>' +
      '<div class="card tight"><div class="row between"><div><b class="small">Situação: ' +
        (certOk ? 'aprovada' : u.certStatus === 'pendente' ? 'em análise' : u.certStatus === 'recusada' ? 'recusada' : 'não enviada') + '</b>' +
        '<div class="muted small">A Central libera o selo de verificado e a carteirinha.</div></div>' +
        '<span class="chip ' + (certOk ? 'green' : u.certStatus === 'pendente' ? 'gold' : 'gray') + '">' + (certOk ? '✔' : '•') + '</span></div>' +
        (u.certObs ? '<div class="muted small" style="margin-top:6px">Obs. da Central: ' + esc(u.certObs) + '</div>' : '') +
        ((u.certFotos || []).length ? '<div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">' + u.certFotos.map(function (f) {
          return '<img src="' + f + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--linha);cursor:zoom-in" onclick="App.zoomImg(this.src)">';
        }).join('') + '</div>' : '') +
        '<button class="btn sm ghost" style="margin-top:10px" onclick="App.enviarCert()">📎 Enviar comprovante</button>' +
      '</div>' +

      '<div class="sec-title">Carteirinha da plataforma</div>' +
      '<div class="card">' +
        (temCnpj && certOk
          ? '<div class="carteira">' + carteiraInner(u) + '</div>' +
            '<div class="doc-actions"><button class="btn sm" onclick="App.printCarteira()">🖨 Imprimir carteirinha</button></div>'
          : '<div class="muted small">A carteirinha é emitida no nome da plataforma e exige:</div>' +
            '<div class="kv"><span>CNPJ cadastrado</span><span>' + (temCnpj ? '✔ ok' : 'pendente') + '</span></div>' +
            '<div class="kv"><span>Certificação aprovada</span><span>' + (certOk ? '✔ ok' : 'pendente') + '</span></div>') +
      '</div>';
  }

  function carteiraInner(u) {
    var nomeMarca = db.config.marca || 'Conecta Irmãos';
    var val = 'CI-' + digits(u.cnpj || '').slice(-4) + '-' + String(u.id).slice(-4).toUpperCase();
    return '<div class="ct">Carteira profissional · ' + esc(nomeMarca) + '</div>' +
      '<div class="cn">' + esc(u.empresa || u.nome) + '</div>' +
      '<div class="cf">' + (u.foto ? '<img src="' + u.foto + '">' : '<div class="ph">' + esc(initials(u.nome)) + '</div>') +
      '<div><div class="cp">' + esc(u.nome) + '</div><div class="cs">' + esc(u.profissao || '') + '</div>' +
      '<div class="cs">' + (u.cnpj ? 'CNPJ ' + esc(u.cnpj) : 'CPF ' + esc(u.cpf || '—')) + '</div>' +
      '<div class="cs">Validação ' + esc(val) + '</div></div></div>' +
      '<div class="cbot"><span>Emitido por ' + esc(nomeMarca) + ' — IPD</span><b>BY ELTON · SISTEMA E LOGÍSTICA</b></div>';
  }

  /* ---------------- Central gerencial (PAINEL 1) ---------------- */
  function viewMaster() {
    var tab = S.tab || 'dash';
    var content = '';
    if (tab === 'dash') content = masterDash();
    else if (tab === 'prof') content = masterProfs();
    else if (tab === 'cert') content = masterCerts();
    else if (tab === 'caca') content = masterCaca();
    else content = masterConfig();
    return '<div class="topbar"><div class="inner"><div class="mark">CI</div>' +
      '<div class="t"><b>Central · ' + esc(db.config.marca || 'Conecta Irmãos') + '</b><span>' + esc(db.config.igreja || '') + ' · painel 1</span></div>' +
      '<button class="icon-btn" onclick="App.logout()" title="Sair">⏻</button></div></div>' +
      '<div class="wrap">' + content + '</div>' + footer() +
      tabbar([
        { id: 'dash', ic: '📊', label: 'Central' },
        { id: 'prof', ic: '🧑‍🔧', label: 'Profissionais' },
        { id: 'cert', ic: '🎖', label: 'Selos' },
        { id: 'caca', ic: '📡', label: 'Caça', badge: db.requests.filter(function (r) { return r.status !== 'concluida'; }).length },
        { id: 'config', ic: '⚙️', label: 'Ajustes' }
      ], tab);
  }

  function masterDash() {
    var totalPros = pros().filter(function (p) { return p.status === 'aprovado'; }).length;
    var pendPros = pros().filter(function (p) { return p.status === 'pendente'; });
    var pendCerts = pros().filter(function (p) { return p.certStatus === 'pendente'; });
    var onUsers = users().filter(function (u) { return isOnline(u.id); });
    var reqs = db.requests.filter(function (r) { return r.status !== 'concluida'; });
    return '<h2>Visão geral</h2>' +
      '<p class="muted small">Painel 1 · acesso gerencial e técnico. Os dois painéis usam a mesma base.</p>' +
      '<div class="grid g2" style="grid-template-columns:1fr 1fr 1fr">' +
        '<div class="stat"><b data-live="users">' + users().length + '</b><span>usuários ativos</span></div>' +
        '<div class="stat"><b data-live="pros">' + pros().length + '</b><span>profissionais</span></div>' +
        '<div class="stat"><b data-live="online" style="color:#22a06b">' + onlineCount() + '</b><span><span class="livedot"></span>online agora</span></div>' +
      '</div>' +
      '<div class="grid g3" style="margin-top:10px">' +
        '<div class="stat"><b style="font-size:20px">' + pendPros.length + '</b><span>aprovações</span></div>' +
        '<div class="stat"><b style="font-size:20px">' + reqs.length + '</b><span>pedidos abertos</span></div>' +
        '<div class="stat"><b style="font-size:20px">' + db.orders.length + '</b><span>OS emitidas</span></div>' +
      '</div>' +
      '<div class="sec-title">Quem está online</div>' +
      '<div class="card tight">' + (onUsers.length ? onUsers.map(function (u) {
        return '<div class="item">' + avatar(u, 'sm') + '<div class="grow"><div class="nm">' + esc(u.nome) + '</div>' +
          '<div class="sub">' + esc(u.tipo === 'profissional' ? (u.profissao || 'profissional') : 'cliente') + '</div></div>' +
          '<span class="chip green"><span class="livedot"></span>online</span></div>';
      }).join('') : '<div class="empty">Ninguém conectado agora.</div>') + '</div>' +
      '<div class="sec-title">Pendências</div>' +
      '<div class="card tight">' +
        '<div class="item"><div class="grow"><div class="nm">' + pendPros.length + ' cadastro(s) aguardando aprovação</div><div class="sub">Profissionais enviados pelo app ou cadastrados aqui</div></div>' +
        '<button class="btn xs ghost" onclick="App.go(\'prof\')">ver</button></div>' +
        '<div class="item"><div class="grow"><div class="nm">' + pendCerts.length + ' certificação(ões) para liberar</div><div class="sub">Cópias de cursos e diplomas</div></div>' +
        '<button class="btn xs ghost" onclick="App.go(\'cert\')">ver</button></div>' +
      '</div>' +
      '<div class="sec-title">Ações rápidas</div>' +
      '<div class="grid g2">' +
        '<button class="btn ghost" onclick="App.cadastroManual()">➕ Cadastrar profissional</button>' +
        '<button class="btn ghost" onclick="App.go(\'caca\')">📡 Caça profissional</button>' +
        '<button class="btn ghost" onclick="App.exportar()">⬇️ Backup dos dados</button>' +
        '<button class="btn ghost" onclick="App.go(\'config\')">⚙️ Configurações</button>' +
      '</div>';
  }

  function masterProfs() {
    var pend = pros().filter(function (p) { return p.status === 'pendente'; });
    var aprov = pros().filter(function (p) { return p.status !== 'pendente'; });
    function linha(p) {
      return '<div class="card tight">' +
        '<div class="row">' + avatar(p) + '<div class="grow"><div class="row between"><b>' + esc(p.nome) + '</b>' +
        '<span class="chip ' + (p.status === 'aprovado' ? 'green' : p.status === 'bloqueado' ? 'red' : 'gold') + '">' + esc(p.status) + '</span></div>' +
        '<div class="muted small">' + esc(p.profissao || '—') + ' · ' + esc(areaOf(p)) + (p.apelido ? ' · "' + esc(p.apelido) + '"' : '') + '</div>' +
        '<div class="muted small">' + esc(p.whats || 'sem whatsapp') + ' · ' + esc(p.atende || 'sem região') + '</div></div></div>' +
        '<div class="kv"><span>Dias / horário</span><span>' + esc(p.dias || '—') + ' · ' + esc(p.horario || '—') + '</span></div>' +
        '<div class="kv"><span>CPF / CNPJ</span><span>' + esc(p.cpf || '—') + ' / ' + esc(p.cnpj || '—') + '</span></div>' +
        (p.faz ? '<div class="muted small" style="margin-top:6px">' + esc(p.faz) + '</div>' : '') +
        '<div class="doc-actions">' +
          (p.status === 'pendente' ? '<button class="btn xs" onclick="App.aprovar(\'' + p.id + '\')">Aprovar</button>' +
            '<button class="btn xs danger" onclick="App.recusar(\'' + p.id + '\')">Recusar</button>' : '') +
          (p.status === 'aprovado' ? '<button class="btn xs ghost" onclick="App.bloquear(\'' + p.id + '\')">Bloquear</button>' : '') +
          (p.status === 'bloqueado' ? '<button class="btn xs ghost" onclick="App.desbloquear(\'' + p.id + '\')">Desbloquear</button>' : '') +
          '<button class="btn xs ghost" onclick="App.estrelas(\'' + p.id + '\')">★ Estrelas</button>' +
          '<button class="btn xs danger" onclick="App.excluir(\'' + p.id + '\')">Remover</button>' +
        '</div></div>';
    }
    return '<h2>Profissionais</h2>' +
      '<button class="btn" onclick="App.cadastroManual()">➕ Cadastrar profissional manualmente</button>' +
      '<div class="sec-title">Aguardando aprovação · ' + pend.length + '</div>' +
      (pend.length ? pend.map(linha).join('') : '<div class="empty">Nenhum cadastro pendente.</div>') +
      '<div class="sec-title">Base cadastrada · ' + aprov.length + '</div>' +
      (aprov.length ? aprov.map(linha).join('') : '<div class="empty">Nenhum profissional aprovado.</div>');
  }

  function masterCerts() {
    var pend = pros().filter(function (p) { return p.certStatus === 'pendente'; });
    var done = pros().filter(function (p) { return p.certStatus === 'aprovado' || p.certStatus === 'recusada'; });
    function card(p) {
      return '<div class="card tight"><div class="row">' + avatar(p, 'sm') + '<div class="grow"><b class="small">' + esc(p.nome) + '</b>' +
        '<div class="muted small">' + esc(p.profissao || '') + ' · ' + esc(p.area || '') + '</div></div>' +
        '<span class="chip ' + (p.certStatus === 'aprovado' ? 'green' : p.certStatus === 'recusada' ? 'red' : 'gold') + '">' + esc(p.certStatus) + '</span></div>' +
        (p.certObs ? '<div class="small" style="margin-top:6px">' + esc(p.certObs) + '</div>' : '') +
        '<div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">' + (p.certFotos || []).map(function (f) {
          return '<img src="' + f + '" style="width:70px;height:70px;object-fit:cover;border-radius:9px;border:1px solid var(--linha);cursor:zoom-in" onclick="App.zoomImg(this.src)">';
        }).join('') + '</div>' +
        (p.certStatus === 'pendente' ? '<div class="doc-actions"><button class="btn xs" onclick="App.cert(\'' + p.id + '\',1)">Liberar selo</button>' +
          '<button class="btn xs danger" onclick="App.cert(\'' + p.id + '\',0)">Recusar</button></div>' : '') +
        '</div>';
    }
    return '<h2>Certificações</h2>' +
      '<p class="muted small">Cópia de curso, diploma ou comprovante. Ao liberar, o profissional recebe o selo verificado, as estrelas e pode emitir a carteirinha (se tiver CNPJ).</p>' +
      '<div class="sec-title">Em análise · ' + pend.length + '</div>' +
      (pend.length ? pend.map(card).join('') : '<div class="empty"><span class="big">🎖</span>Nada em análise.</div>') +
      (done.length ? '<div class="sec-title">Histórico</div>' + done.map(card).join('') : '');
  }

  function masterCaca() {
    var reqs = db.requests.slice().sort(function (a, b) { return (b.criadoEm || '').localeCompare(a.criadoEm || ''); });
    var cats = Object.keys(AREAS).map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('');
    var abertos = reqs.filter(function (r) { return r.status !== 'concluida'; }).length;
    return '<h2>Caça profissional</h2>' +
      '<div class="hintbox ' + (db.config.caca === 'admin' ? '' : 'info') + '">' +
        'Modo atual: <b>' + (db.config.caca === 'admin' ? 'teste interno — só a Central cria pedidos' : 'aberto para clientes') + '</b>. ' +
        'O pedido é distribuído para até 5 profissionais da área (online primeiro) e pode ser ampliado.</div>' +
      '<div class="grid g3">' +
        '<div class="stat"><b style="font-size:20px">' + abertos + '</b><span>em andamento</span></div>' +
        '<div class="stat"><b style="font-size:20px">' + db.requests.reduce(function (s, r) { return s + (r.propostas || []).length; }, 0) + '</b><span>orçamentos</span></div>' +
        '<div class="stat"><b style="font-size:20px">' + reqs.filter(function (r) { return r.status === 'concluida'; }).length + '</b><span>concluídos</span></div>' +
      '</div>' +
      '<form class="card" onsubmit="App.criarPedido(event)">' +
        '<h3>Novo pedido de teste</h3>' +
        '<div class="field"><label>Cliente</label><select name="clienteId"><option value="">— sem cadastro (avulso) —</option>' +
          clientes().map(function (c) { return '<option value="' + c.id + '">' + esc(c.nome) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Nome do cliente (se avulso)</label><input name="clienteNome" placeholder="Nome de quem precisa"></div>' +
        '<div class="field2"><div class="field"><label>Área</label><select name="area" onchange="App.syncProfissoes(this)"><option value="">—</option>' + cats + '</select></div>' +
        '<div class="field"><label>Profissão</label><select name="profissao" id="sel-profissao"><option value="">—</option></select></div></div>' +
        '<div class="field"><label>O que precisa</label><textarea name="descricao" required placeholder="Descreva o serviço"></textarea></div>' +
        '<div class="field2"><div class="field"><label>Endereço</label><input name="endereco" placeholder="Bairro / cidade"></div>' +
        '<div class="field"><label>Urgência</label><select name="urgencia"><option>O mais rápido possível</option><option>Hoje</option><option>Esta semana</option><option>Pode agendar</option></select></div></div>' +
        '<button class="btn" type="submit">📡 Distribuir para profissionais</button>' +
      '</form>' +
      '<div class="sec-title">Pedidos · ' + reqs.length + '</div>' +
      (reqs.length ? reqs.map(function (r) {
        var atrib = (r.atribuidos || []).map(findUser).filter(Boolean);
        var props = r.propostas || [];
        return '<div class="card tight">' +
          '<div class="row between"><div><b>' + esc(r.profissao || r.area || 'Pedido') + '</b>' +
            '<div class="muted small">#' + (r.numero || '') + ' · ' + tempoRel(r.criadoEm) + ' · ' + esc(r.urgencia || '') + '</div></div>' +
            '<span class="chip ' + (r.status === 'concluida' ? 'gray' : r.status === 'aberta' ? 'gold' : 'green') + '">' + esc(r.status.replace('_', ' ')) + '</span></div>' +
          '<div class="small" style="margin:6px 0">' + esc(r.descricao) + '</div>' +
          '<div class="muted small">👤 ' + esc(r.clienteNome || 'Cliente') + ' · 📍 ' + esc(r.endereco || '—') + '</div>' +
          '<div class="sec-title" style="margin:12px 0 4px">Distribuição · ' + atrib.length + '</div>' +
          (atrib.length ? atrib.map(function (p) {
            var cotou = props.filter(function (x) { return x.profId === p.id; })[0];
            return '<div class="row between" style="padding:5px 0;font-size:12.5px">' +
              '<span>' + esc(p.nome.split(' ')[0]) + (isOnline(p.id) ? ' <span class="dot"></span>' : '') + '</span>' +
              (cotou ? '<span class="chip gold">' + money(cotou.valor) + '</span>' : '<span class="chip gray">aguardando</span>') + '</div>';
          }).join('') : '<div class="muted small">Nenhum profissional da área aprovado.</div>') +
          timeline(r) +
          (props.length ? '<hr class="dash">' + props.map(function (pr) {
            var p = findUser(pr.profId);
            return '<div class="row between" style="font-size:13px;padding:4px 0"><span>' + esc(p ? p.nome : '—') + (pr.obs ? ' · <span class="muted small">' + esc(pr.obs) + '</span>' : '') + '</span>' +
              '<span><b>' + money(pr.valor) + '</b> ' + (r.escolhidoId === pr.profId ? '<span class="chip green">escolhido</span>' : '<button class="btn xs ghost" onclick="App.escolher(\'' + r.id + '\',\'' + pr.profId + '\')">escolher</button>') + '</span></div>';
          }).join('') : '') +
          '<div class="doc-actions">' +
            (r.status !== 'concluida' ? '<button class="btn xs ghost" onclick="App.ampliar(\'' + r.id + '\')">➕ Ampliar busca</button>' : '') +
            (r.status !== 'concluida' ? '<button class="btn xs ghost" onclick="App.concluirPedido(\'' + r.id + '\')">Concluir</button>' : '') +
            '<button class="btn xs danger" onclick="App.excluirPedido(\'' + r.id + '\')">Remover</button>' +
          '</div></div>';
      }).join('') : '<div class="empty"><span class="big">📡</span>Nenhum pedido criado.</div>');
  }

  function masterConfig() {
    return '<h2>Ajustes da Central</h2>' +
      '<form class="card" onsubmit="App.saveConfig(event)">' +
        '<div class="field"><label>Nome da plataforma</label><input name="marca" value="' + esc(db.config.marca) + '"></div>' +
        '<div class="field"><label>Nome da igreja (linha sutil)</label><input name="igreja" value="' + esc(db.config.igreja) + '"></div>' +
        '<div class="field2"><div class="field"><label>Nome do master</label><input name="masterNome" value="' + esc(db.config.masterNome) + '"></div>' +
        '<div class="field"><label>PIN de acesso</label><input name="masterPin" value="' + esc(db.config.masterPin) + '" maxlength="8"></div></div>' +
        '<div class="field"><label>Caça profissional</label><select name="caca">' +
          '<option value="admin"' + (db.config.caca === 'admin' ? ' selected' : '') + '>Teste interno (só a Central cria)</option>' +
          '<option value="todos"' + (db.config.caca === 'todos' ? ' selected' : '') + '>Aberto para clientes</option></select></div>' +
        '<button class="btn" type="submit">Salvar ajustes</button>' +
      '</form>' +
      '<div class="sec-title">Dados</div>' +
      '<div class="card tight">' +
        '<div class="kv"><span>Usuários</span><span>' + users().length + '</span></div>' +
        '<div class="kv"><span>Profissionais</span><span>' + pros().length + '</span></div>' +
        '<div class="kv"><span>Pedidos</span><span>' + db.requests.length + '</span></div>' +
        '<div class="kv"><span>Ordens de serviço</span><span>' + db.orders.length + '</span></div>' +
        '<div class="doc-actions">' +
          '<button class="btn sm ghost" onclick="App.exportar()">⬇️ Baixar backup</button>' +
          '<button class="btn sm ghost" onclick="App.removerDemo()">🧹 Remover exemplos</button>' +
          '<button class="btn sm danger" onclick="App.zerar()">Apagar tudo</button>' +
        '</div>' +
      '</div>' +
      '<div class="sec-title">Nuvem (opcional)</div>' +
      '<div class="card tight">' +
        '<div class="kv"><span>Projeto</span><span>' + esc((CFG.supabaseUrl || 'não configurado').replace('https://', '')) + '</span></div>' +
        '<div class="kv"><span>Chave anon</span><span>' + (CFG.supabaseAnonKey ? 'informada' : 'faltando') + '</span></div>' +
        '<div class="kv"><span>Status</span><span>' + (cloud.on() ? 'sincronização ativa' : (CFG.supabaseUrl && CFG.supabaseAnonKey ? 'aguardando tabelas no Supabase' : 'somente este aparelho')) + '</span></div>' +
        '<div class="muted small" style="margin-top:8px">Com a URL e a chave anon no <b>config.js</b>, cadastros, pedidos e o "online agora" passam a valer em qualquer aparelho.</div>' +
        '<button class="btn sm ghost" style="margin-top:10px" onclick="App.testarNuvem()">Testar conexão</button></div>' +
      '<div class="sec-title">Sobre</div>' +
      '<div class="card tight center"><div class="muted small">' + esc(db.config.marca) + ' · v1.0<br>' + esc(db.config.igreja) + '<br>by Elton · Sistema e Logística</div></div>';
  }

  /* ---------------- documentos ---------------- */
  var DOC_CSS = '@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:"Helvetica Neue",Arial,sans-serif;color:#16211d;margin:0;font-size:11.5px;line-height:1.5}' +
    '.doc-head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:12px;border-bottom:2px solid #12345c}' +
    '.doc-brand{display:flex;gap:10px;align-items:center}' +
    '.doc-logo{width:44px;height:44px;border-radius:10px;object-fit:cover;border:1px solid #e4e0d4}' +
    '.doc-sub{font-size:8.5px;color:#6c7a74;margin-top:1px}' +
    '.doc-mark{width:44px;height:44px;border-radius:12px;background:#12345c;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;letter-spacing:.5px}' +
    '.doc-name{font-size:18px;font-weight:800;color:#12345c;line-height:1.1;letter-spacing:-.3px}' +
    '.doc-church{font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#6c7a74;margin-top:2px}' +
    '.doc-id{text-align:right}' +
    '.doc-kind{font-size:8.5px;letter-spacing:2px;color:#6c7a74;text-transform:uppercase}' +
    '.doc-num{font-size:16px;font-weight:800;letter-spacing:-.3px}' +
    '.doc-date{font-size:9px;color:#6c7a74}' +
    'h2{font-size:8.5px;letter-spacing:1.6px;text-transform:uppercase;color:#12345c;margin:14px 0 5px;font-weight:800}' +
    '.box{border:1px solid #e4e0d4;border-radius:8px;padding:9px 11px;font-size:10.5px;line-height:1.6;background:#fcfbf7}' +
    '.box b{font-size:11.5px}' +
    '.two{display:flex;gap:10px}.two>div{flex:1}' +
    'table{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:2px}' +
    'th{background:#f3f0e7;font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#55635d;text-align:left;padding:7px 8px}' +
    'td{padding:8px;border-bottom:1px solid #ece8dc;vertical-align:top}' +
    '.tot{display:flex;justify-content:flex-end;gap:14px;align-items:baseline;margin-top:8px;border-top:1px solid #e4e0d4;padding-top:8px}' +
    '.tot span{font-size:8px;letter-spacing:1.4px;color:#6c7a74;text-transform:uppercase}' +
    '.tot b{font-size:19px;color:#12345c;letter-spacing:-.5px}' +
    '.ext{font-size:8.5px;color:#6c7a74;text-align:right;margin-top:2px;font-style:italic}' +
    '.pill{display:inline-block;font-size:7.5px;letter-spacing:1.2px;padding:2px 7px;border-radius:99px;border:1px solid #d8d2c2;text-transform:uppercase;color:#6c7a74}' +
    '.assin{margin-top:40px;display:flex;gap:40px}' +
    '.assin>div{flex:1;border-top:1px solid #9aa8a2;padding-top:6px;font-size:9px;text-align:center;color:#6c7a74}' +
    '.ft{margin-top:26px;border-top:1px solid #e4e0d4;padding-top:7px;display:flex;justify-content:space-between;gap:10px;font-size:7px;color:#9aa8a2;letter-spacing:.7px}' +
    '.cards{display:flex;flex-wrap:wrap;gap:4mm}' +
    '.card-print{width:85mm;height:54mm;border-radius:3.5mm;background:linear-gradient(140deg,#12345c,#0a2540 60%,#153f6b);color:#fff;padding:5mm;position:relative;overflow:hidden}' +
    '.card-print::after{content:"";position:absolute;right:-12mm;bottom:-18mm;width:44mm;height:44mm;border-radius:50%;border:6mm solid rgba(191,155,82,.2)}' +
    '.card-print .ct{font-size:5.5pt;letter-spacing:2px;text-transform:uppercase;color:#cbb98d;position:relative;z-index:2}' +
    '.card-print .cn{font-size:11pt;font-weight:800;letter-spacing:-.2px;position:relative;z-index:2}' +
    '.card-print .cf{display:flex;gap:3mm;margin-top:3mm;position:relative;z-index:2}' +
    '.card-print img,.card-print .ph{width:14mm;height:14mm;border-radius:2mm;object-fit:cover;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11pt}' +
    '.card-print .cp{font-size:8.5pt;font-weight:800;text-transform:uppercase;line-height:1.2}' +
    '.card-print .cs{font-size:6pt;color:#bcd3c7;margin-top:.6mm;line-height:1.35}' +
    '.card-print .cbot{position:absolute;left:5mm;right:5mm;bottom:3.2mm;display:flex;justify-content:space-between;gap:4mm;font-size:5pt;color:#a9c3b6;letter-spacing:.4px;z-index:2}' +
    '.card-print .cbot b{color:#e5d3a6;letter-spacing:1px;white-space:nowrap}' +
    '.card-print.verso{background:#fff;color:#16211d;border:1px solid #d8d2c2;display:flex;flex-direction:column}' +
    '.card-print.verso::after{border-color:rgba(14,92,68,.07)}' +
    '.verso .vt{font-size:6pt;letter-spacing:2px;text-transform:uppercase;color:#12345c;font-weight:800}' +
    '.verso .vv{font-size:7.5pt;color:#6c7a74;margin-top:1mm;border-bottom:1px solid #e4e0d4;padding-bottom:2mm}' +
    '.verso .vgrid{display:flex;flex-wrap:wrap;gap:2mm 5mm;margin-top:2.5mm;position:relative;z-index:2}' +
    '.verso .vgrid>div{width:calc(50% - 5mm)}' +
    '.verso .vgrid span{display:block;font-size:4.6pt;letter-spacing:1px;text-transform:uppercase;color:#9aa8a2}' +
    '.verso .vgrid b{font-size:7pt;line-height:1.25}' +
    '.verso .vfoot{position:absolute;left:5mm;right:5mm;bottom:3mm;font-size:4.6pt;color:#8b978f;line-height:1.5;z-index:2}' +
    '.verso .vfoot b{color:#12345c;letter-spacing:1px}';

  function printDoc(html) {
    var f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    f.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><style>' + DOC_CSS + '</style></head><body>' + html + '</body></html>';
    f.onload = function () {
      setTimeout(function () {
        try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { }
      }, 350);
    };
    setTimeout(function () { f.remove(); }, 60000);
  }
  function docHeader(titulo, numero, data, p) {
    p = p || {};
    return '<div class="doc-head"><div class="doc-brand">' +
      (p.foto ? '<img class="doc-logo" src="' + p.foto + '">' : '<div class="doc-mark">' + esc(initials(p.nome || 'PS')) + '</div>') +
      '<div><div class="doc-name">' + esc(p.empresa || p.nome || 'Prestador de serviço') + '</div>' +
      (p.empresa && p.nome ? '<div class="doc-sub">' + esc(p.nome) + '</div>' : '') +
      '<div class="doc-sub">' + esc(p.profissao || '') +
        (p.cnpj ? ' · CNPJ ' + esc(p.cnpj) : (p.cpf ? ' · CPF ' + esc(p.cpf) : '')) + '</div>' +
      (p.whats ? '<div class="doc-sub">' + esc(p.whats) + (p.endereco ? ' · ' + esc(p.endereco) : '') + '</div>' : '') +
      '</div></div>' +
      '<div class="doc-id"><div class="doc-kind">' + esc(titulo) + '</div>' +
      '<div class="doc-num">' + esc(numero) + '</div><div class="doc-date">' + esc(data) + '</div></div></div>';
  }
  function docFooter(p, numero) {
    p = p || {};
    return '<div class="ft"><span><b>' + esc(p.empresa || p.nome || '') + '</b> · ' +
      (p.cnpj ? 'CNPJ ' + esc(p.cnpj) : 'CPF ' + esc(p.cpf || '—')) + '</span>' +
      '<span>Documento gerado pelo sistema Conecta Irmãos — IPD</span>' +
      '<span>Validação ' + esc(numero || '') + '</span></div>';
  }
  function docOS(o) {
    var p = findUser(o.profId) || {};
    var num = 'OS-' + String(o.numero).padStart(4, '0');
    return '<div class="doc">' +
      docHeader('Ordem de Serviço', num, 'Emitida em ' + dbr(o.criadoEm), p) +
      '<div class="two" style="margin-top:14px">' +
        '<div><h2>Prestador de serviço</h2><div class="box"><b>' + esc(p.empresa || p.nome || '—') + '</b><br>' +
          (p.empresa ? esc(p.nome || '') + '<br>' : '') +
          esc(p.profissao || '') + (p.apelido ? ' · ' + esc(p.apelido) : '') + '<br>' +
          (p.whats ? 'WhatsApp ' + esc(p.whats) + '<br>' : '') +
          (p.cnpj ? 'CNPJ ' + esc(p.cnpj) : (p.cpf ? 'CPF ' + esc(p.cpf) : '')) +
          (p.atende ? '<br>Atende: ' + esc(p.atende) : '') + '</div></div>' +
        '<div><h2>Cliente</h2><div class="box"><b>' + esc(o.clienteNome) + '</b><br>' +
          (o.clienteCpf ? 'CPF ' + esc(o.clienteCpf) + '<br>' : '') +
          (o.clienteWhats ? esc(o.clienteWhats) + '<br>' : '') +
          (o.clienteEndereco ? esc(o.clienteEndereco) : '') + '</div></div>' +
      '</div>' +
      '<h2>Objeto do serviço</h2>' +
      '<table><tr><th style="width:74%">Descrição</th><th style="text-align:right">Valor</th></tr>' +
        '<tr><td>' + esc(o.servico).replace(/\n/g, '<br>') + '</td><td style="text-align:right">' + money(o.valor) + '</td></tr></table>' +
      '<div class="tot"><span>Total</span><b>' + money(o.valor) + '</b></div>' +
      '<div class="ext">(' + extenso(o.valor) + ')</div>' +
      '<div class="two" style="margin-top:14px">' +
        '<div><h2>Pagamento</h2><div class="box">' + esc(o.pagamento || 'A combinar') + '<br>' +
          '<span class="pill">' + (o.pago ? 'pago em ' + dbr(o.pagoEm || o.criadoEm) : 'em aberto') + '</span></div></div>' +
        '<div><h2>Observações</h2><div class="box">' + esc(o.obs || '—') + '</div></div>' +
      '</div>' +
      '<div class="assin"><div>' + esc(p.nome || 'Prestador') + '<br>Prestador de serviço</div><div>' + esc(o.clienteNome) + '<br>Cliente</div></div>' +
      docFooter(p, num) +
      '</div>';
  }
  function docRecibo(o) {
    var p = findUser(o.profId) || {};
    var num = 'REC-' + String(o.numero).padStart(4, '0');
    return '<div class="doc">' +
      docHeader('Recibo de Pagamento', num, dbr(o.pagoEm || o.criadoEm), p) +
      '<h2 style="margin-top:22px">Quitação</h2>' +
      '<div class="box" style="font-size:11.5px;line-height:2;padding:16px 18px">' +
        'Recebi de <b>' + esc(o.clienteNome) + '</b>' + (o.clienteCpf ? ', CPF ' + esc(o.clienteCpf) : '') +
        ', a importância de <b>' + money(o.valor) + '</b> <span style="color:#6c7a74">(' + extenso(o.valor) + ')</span>, ' +
        'referente a <b>' + esc(o.servico) + '</b>.' +
        '<br><br>Para clareza, firmo o presente recibo dando plena e total quitação do valor acima.' +
        '<br><br>Emitido por <b>' + esc(p.nome || '—') + '</b>' +
        (p.cnpj ? ' · CNPJ ' + esc(p.cnpj) : (p.cpf ? ' · CPF ' + esc(p.cpf) : '')) +
        (p.whats ? ' · ' + esc(p.whats) : '') + '.' +
      '</div>' +
      '<div class="tot"><span>Valor pago</span><b>' + money(o.valor) + '</b></div>' +
      '<div class="two" style="margin-top:14px">' +
        '<div><h2>Forma de pagamento</h2><div class="box">' + esc(o.pagamento || 'A combinar') + '</div></div>' +
        '<div><h2>Referência</h2><div class="box">Ordem de serviço OS-' + String(o.numero).padStart(4, '0') + '</div></div>' +
      '</div>' +
      '<div class="assin"><div>' + esc(p.nome || 'Prestador') + '<br>Emissor</div><div>____/____/______<br>Data</div></div>' +
      docFooter(p, num) +
      '</div>';
  }
  function carteiraVerso(u) {
    var validade = '31/12/' + (new Date().getFullYear() + 1);
    var val = 'CI-' + digits(u.cnpj || '').slice(-4) + '-' + String(u.id).slice(-4).toUpperCase();
    return '<div class="card-print verso">' +
      '<div class="vt">' + esc(db.config.marca || 'Conecta Irmãos') + '</div>' +
      '<div class="vv">Carteira de identificação profissional</div>' +
      '<div class="vgrid">' +
        '<div><span>Profissional</span><b>' + esc(u.nome) + '</b></div>' +
        '<div><span>Atuação</span><b>' + esc(u.profissao || '—') + '</b></div>' +
        '<div><span>CNPJ</span><b>' + esc(u.cnpj || '—') + '</b></div>' +
        '<div><span>Validade</span><b>' + validade + '</b></div>' +
      '</div>' +
      '<div class="vfoot">Certificação aprovada pela administração do ' + esc(db.config.marca || 'Conecta Irmãos') + '.<br>' +
        'Documento de identificação profissional, sem valor fiscal. <b>' + esc(val) + '</b></div>' +
      '</div>';
  }

  /* ---------------- ações ---------------- */
  var App = {
    route: function (r) { S.route = r; if (r !== 'app') S.tab = ''; render(); },
    go: function (t) { S.tab = t; render(); },
    closeModal: closeModal,
    logout: logout,
    mask: function (el, type) {
      if (type === 'cpf') el.value = maskCPF(el.value);
      else if (type === 'tel') el.value = maskPhone(el.value);
      else if (type === 'cnpj') el.value = maskCNPJ(el.value);
    },
    syncProfissoes: syncProfissoes,
    photo: function (tipo) {
      pickPhoto(function (b64) {
        TMP.foto = b64;
        var prev = $('#foto-prev');
        if (prev) prev.innerHTML = '<img class="avatar" style="width:62px;height:62px" src="' + b64 + '" alt="">';
      }, 420);
    },
    search: function (v) {
      S.q = v;
      clearTimeout(App._t);
      App._t = setTimeout(function () {
        render();
        var i = $('#busca');
        if (i) { i.focus(); try { i.setSelectionRange(i.value.length, i.value.length); } catch (e) { } }
      }, 220);
    },
    area: function (a) { S.area = (S.area === a ? '' : a); render(); },
    wa: function (num, nome) {
      var msg = 'Olá' + (nome ? ' ' + nome.split(' ')[0] : '') + '! Encontrei seu contato no ' + (db.config.marca || 'Conecta Irmãos') + ' e gostaria de solicitar um orçamento.';
      window.open(waLink(num, msg), '_blank');
    },
    openPro: function (id) {
      var p = findUser(id); if (!p) return;
      openModal(perfilProSheet(p));
    },
    choose: function () { chooser(); },
    fav: function (id) { toggleFav(id); render(); },
    zoomImg: function (src) {
      openModal('<img src="' + src + '" style="width:100%;border-radius:12px">');
    },

    doAuth: function (e, role) {
      e.preventDefault();
      var f = e.target, fd = new FormData(f);
      var nome = String(fd.get('nome') || '').trim();
      var whats = digits(fd.get('whats'));
      if (nome.length < 3) { toast('Informe o nome completo.'); return; }
      if (whats.length < 10) { toast('Informe um WhatsApp válido.'); return; }
      var existente = users().filter(function (u) {
        return u.tipo === role && norm(u.nome) === norm(nome);
      })[0];
      if (existente) {
        if (existente.status === 'bloqueado') { toast('Cadastro bloqueado. Fale com a Central.'); return; }
        login(existente);
        return;
      }
      var u = {
        id: uid(role === 'profissional' ? 'pro' : 'cli'),
        tipo: role, nome: nome, whats: String(fd.get('whats')),
        nasc: fd.get('nasc') || '', cpf: fd.get('cpf') || '', cnpj: fd.get('cnpj') || '',
        empresa: fd.get('empresa') || '', apelido: fd.get('apelido') || '', area: fd.get('area') || '', profissao: fd.get('profissao') || '',
        faz: fd.get('faz') || '', atende: fd.get('atende') || '', dias: fd.get('dias') || '',
        horario: fd.get('horario') || '', endereco: fd.get('endereco') || '',
        foto: TMP.foto || '', status: role === 'profissional' ? 'pendente' : 'aprovado',
        verificado: false, certStatus: '', certFotos: [], estrelas: 0,
        criadoEm: new Date().toISOString()
      };
      TMP.foto = null;
      db.users.push(touch(u)); save();
      cloud.push('ci_users', u);
      login(u);
      toast(role === 'profissional' ? 'Cadastro enviado para a Central.' : 'Bem-vindo!');
    },

    doMaster: function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      if (String(fd.get('pin')) !== String(db.config.masterPin)) { toast('PIN incorreto.'); return; }
      db.config.masterNome = String(fd.get('nome') || 'Elton');
      save();
      login(null, 'master');
    },

    saveCliente: function (e) {
      e.preventDefault();
      var u = me(); if (!u) return;
      var fd = new FormData(e.target);
      ['nome', 'whats', 'nasc', 'cpf', 'rg', 'endereco'].forEach(function (k) { u[k] = String(fd.get(k) || ''); });
      if (TMP.foto) { u.foto = TMP.foto; TMP.foto = null; }
      persistUser(u);
      toast('Dados salvos.');
      render();
    },

    savePro: function (e) {
      e.preventDefault();
      var u = me(); if (!u) return;
      var fd = new FormData(e.target);
      ['nome', 'empresa', 'apelido', 'whats', 'area', 'profissao', 'faz', 'atende', 'dias', 'horario', 'endereco', 'cpf', 'cnpj']
        .forEach(function (k) { u[k] = String(fd.get(k) || ''); });
      if (TMP.foto) { u.foto = TMP.foto; TMP.foto = null; }
      persistUser(u);
      toast('Perfil atualizado.');
      render();
    },

    toggleOnline: function () {
      if (!session) return;
      if (isOnline(session.uid)) { delete db.presence[session.uid]; }
      else { db.presence[session.uid] = Date.now(); }
      save(); render();
    },

    enviarCert: function () {
      var u = me(); if (!u) return;
      var atual = u.certFotos || [];
      pickPhoto(function (b64) {
        atual.push(b64);
        u.certFotos = atual.slice(0, 3);
        u.certStatus = 'pendente';
        u.certObs = '';
        persistUser(u);
        toast('Comprovante enviado para a Central.');
        render();
      }, 900);
    },

    novaOS: function (pre) {
      var u = me(); if (!u) return;
      var list = listaClientes();
      openModal('<h3>Nova ordem de serviço</h3>' +
        '<form onsubmit="App.criarOS(event)">' +
        '<div class="field"><label>Cliente cadastrado</label><select name="clienteSel" onchange="App.pickCliente(this)">' +
        '<option value="">— novo cliente —</option>' + list.map(function (c) {
          return '<option value="' + esc(c.nome) + '"' + (pre === c.nome ? ' selected' : '') + '>' + esc(c.nome) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>Nome do cliente <span class="req">*</span></label><input name="clienteNome" required value="' + esc(pre || '') + '"></div>' +
        '<div class="field2"><div class="field"><label>CPF</label><input name="clienteCpf" oninput="App.mask(this,\'cpf\')"></div>' +
        '<div class="field"><label>WhatsApp</label><input name="clienteWhats" oninput="App.mask(this,\'tel\')"></div></div>' +
        '<div class="field"><label>Endereço</label><input name="clienteEndereco"></div>' +
        '<div class="field"><label>Serviço executado <span class="req">*</span></label><textarea name="servico" required placeholder="Descreva o serviço"></textarea></div>' +
        '<div class="field2"><div class="field"><label>Valor (R$)</label><input name="valor" inputmode="decimal" placeholder="0,00"></div>' +
        '<div class="field"><label>Pagamento</label><select name="pagamento"><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Transferência</option><option>A combinar</option></select></div></div>' +
        '<div class="field"><label>Observações</label><input name="obs"></div>' +
        '<label class="row small" style="gap:8px;margin:2px 0 14px"><input type="checkbox" name="pago" style="width:auto"> <span class="muted">Pagamento já recebido (libera o recibo)</span></label>' +
        '<button class="btn" type="submit">Emitir OS</button></form>');
    },
    pickCliente: function (sel) {
      var c = listaClientes().filter(function (x) { return norm(x.nome) === norm(sel.value); })[0];
      if (!c) return;
      var f = sel.closest('form');
      f.clienteNome.value = c.nome || '';
      f.clienteCpf.value = c.cpf || '';
      f.clienteWhats.value = c.whats || '';
      f.clienteEndereco.value = c.endereco || '';
      if (f.clienteCpf.value === 'undefined') f.clienteCpf.value = '';
    },
    criarOS: function (e) {
      e.preventDefault();
      var u = me(); if (!u) return;
      var fd = new FormData(e.target);
      var valor = parseFloat(String(fd.get('valor') || '0').replace(/\./g, '').replace(',', '.')) || 0;
      var o = {
        id: uid('os'), numero: db.config.seqOS || 1, profId: u.id,
        clienteNome: String(fd.get('clienteNome')), clienteCpf: String(fd.get('clienteCpf') || ''),
        clienteWhats: String(fd.get('clienteWhats') || ''), clienteEndereco: String(fd.get('clienteEndereco') || ''),
        servico: String(fd.get('servico')), valor: valor, pagamento: String(fd.get('pagamento') || ''),
        obs: String(fd.get('obs') || ''), pago: !!fd.get('pago'), criadoEm: new Date().toISOString()
      };
      if (o.pago) o.pagoEm = o.criadoEm;
      db.config.seqOS = (db.config.seqOS || 1) + 1;
      persistObj(db.orders, o, 'ci_orders');
      closeModal();
      toast('OS emitida. Use os botões para imprimir.');
      render();
    },
    pagar: function (id) {
      var o = db.orders.filter(function (x) { return x.id === id; })[0]; if (!o) return;
      o.pago = true; o.pagoEm = new Date().toISOString();
      persistObj(db.orders, o, 'ci_orders');
      toast('Pagamento registrado.');
      render();
    },
    printOS: function (id) {
      var o = db.orders.filter(function (x) { return x.id === id; })[0]; if (o) printDoc(docOS(o));
    },
    printRecibo: function (id) {
      var o = db.orders.filter(function (x) { return x.id === id; })[0]; if (o) printDoc(docRecibo(o));
    },
    printCarteira: function () {
      var u = me(); if (!u) return;
      printDoc('<div class="cards"><div class="card-print">' + carteiraInner(u) + '</div>' + carteiraVerso(u) + '</div>');
    },

    /* caça */
    caçaCliente: function () {
      var u = me(); if (!u) return;
      if (db.config.caca !== 'todos') { toast('Caça em teste interno — peça à Central para liberar.'); return; }
      App.novoPedidoCliente();
    },
    novoPedidoCliente: function () {
      var u = me() || {};
      var cats = Object.keys(AREAS).map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('');
      openModal('<h3>Pedir um serviço</h3><p class="muted small">A plataforma envia para os profissionais disponíveis da área.</p>' +
        '<form onsubmit="App.criarPedido(event,\'cliente\')">' +
        '<div class="field"><label>Área</label><select name="area" onchange="App.syncProfissoes(this)"><option value="">Selecione…</option>' + cats + '</select></div>' +
        '<div class="field"><label>Profissão</label><select name="profissao" id="sel-profissao"><option value="">Escolha a área primeiro</option></select></div>' +
        '<div class="field"><label>O que precisa</label><textarea name="descricao" required placeholder="Descreva o serviço"></textarea></div>' +
        '<div class="field"><label>Endereço</label><input name="endereco" value="' + esc(u.endereco || '') + '" required></div>' +
        '<div class="field"><label>Urgência</label><select name="urgencia"><option>O mais rápido possível</option><option>Hoje</option><option>Esta semana</option></select></div>' +
        '<button class="btn" type="submit">Solicitar agora</button></form>');
    },
    criarPedido: function (e, origem) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var u = me();
      var area = String(fd.get('area') || '');
      var prof = String(fd.get('profissao') || '');
      var cliId = origem === 'cliente' ? (u ? u.id : '') : String(fd.get('clienteId') || '');
      var cliNome = origem === 'cliente' ? (u ? u.nome : '') : String(fd.get('clienteNome') || '');
      var cli = cliId ? findUser(cliId) : null;
      if (cli) cliNome = cli.nome;
      if (!cliNome) { toast('Informe o cliente.'); return; }
      var elegiveis = pros().filter(function (p) {
        if (p.status !== 'aprovado') return false;
        if (prof && norm(p.profissao) !== norm(prof) && norm(areaOf(p)) !== norm(area)) return false;
        if (!prof && area && areaOf(p) !== area) return false;
        return true;
      }).sort(function (a, b) {
        return (isOnline(b.id) ? 1 : 0) - (isOnline(a.id) ? 1 : 0) || (b.estrelas || 0) - (a.estrelas || 0);
      }).slice(0, 5);
      var r = {
        id: uid('req'), numero: db.config.seqReq || 1,
        clienteId: cliId, clienteNome: cliNome,
        area: area, profissao: prof || area,
        descricao: String(fd.get('descricao')), endereco: String(fd.get('endereco') || (cli && cli.endereco) || ''),
        urgencia: String(fd.get('urgencia') || ''), status: 'aberta',
        atribuidos: elegiveis.map(function (p) { return p.id; }), propostas: [],
        criadoEm: new Date().toISOString(), origem: origem || 'central',
        historico: [{ em: new Date().toISOString(), texto: 'Pedido criado e enviado para ' + elegiveis.length + ' profissional(is)' }],
        vistos: {}
      };
      db.config.seqReq = (db.config.seqReq || 1) + 1;
      persistObj(db.requests, r, 'ci_requests');
      closeModal();
      toast(elegiveis.length ? 'Pedido enviado para ' + elegiveis.length + ' profissional(is).' : 'Pedido criado, mas ninguém da área está cadastrado.');
      render();
    },
    orcamento: function (id) {
      var r = db.requests.filter(function (x) { return x.id === id; })[0]; if (!r) return;
      var u = me(); if (!u) return;
      openModal('<h3>Enviar orçamento</h3><form onsubmit="App.enviarOrc(event,\'' + id + '\')">' +
        '<div class="field"><label>Valor (R$)</label><input name="valor" inputmode="decimal" placeholder="0,00" required></div>' +
        '<div class="field"><label>Observação</label><input name="obs" placeholder="Ex.: material incluso, prazo…"></div>' +
        '<button class="btn" type="submit">Enviar</button></form>');
    },
    enviarOrc: function (e, id) {
      e.preventDefault();
      var r = db.requests.filter(function (x) { return x.id === id; })[0]; if (!r) return;
      var u = me(); if (!u) return;
      var fd = new FormData(e.target);
      var valor = parseFloat(String(fd.get('valor') || '0').replace(/\./g, '').replace(',', '.')) || 0;
      r.propostas = r.propostas || [];
      r.propostas.push({ profId: u.id, valor: valor, obs: String(fd.get('obs') || ''), em: new Date().toISOString() });
      r.status = 'com_orcamento';
      (r.historico = r.historico || []).push({ em: new Date().toISOString(), texto: 'Orçamento de ' + money(valor) + ' de ' + String(u.nome).split(' ')[0] });
      persistObj(db.requests, r, 'ci_requests');
      closeModal();
      toast('Orçamento enviado.');
      render();
    },
    escolher: function (rid, pid) {
      var r = db.requests.filter(function (x) { return x.id === rid; })[0]; if (!r) return;
      r.escolhidoId = pid; r.status = 'aceita';
      var esc1 = findUser(pid);
      (r.historico = r.historico || []).push({ em: new Date().toISOString(), texto: 'Cliente escolheu ' + (esc1 ? String(esc1.nome).split(' ')[0] : 'profissional') });
      persistObj(db.requests, r, 'ci_requests');
      toast('Profissional escolhido.');
      render();
    },
    concluirPedido: function (id) {
      var r = db.requests.filter(function (x) { return x.id === id; })[0]; if (!r) return;
      r.status = 'concluida';
      (r.historico = r.historico || []).push({ em: new Date().toISOString(), texto: 'Pedido concluído' });
      persistObj(db.requests, r, 'ci_requests');
      render();
    },
    excluirPedido: function (id) {
      confirmar('Remover este pedido?', function () {
        db.requests = db.requests.filter(function (x) { return x.id !== id; });
        save(); render();
      });
    },

    /* master */
    aprovar: function (id) {
      var p = findUser(id); if (!p) return;
      p.status = 'aprovado'; persistUser(p);
      toast('Profissional aprovado.');
      render();
    },
    recusar: function (id) {
      var p = findUser(id); if (!p) return;
      p.status = 'recusado'; persistUser(p);
      render();
    },
    bloquear: function (id) {
      var p = findUser(id); if (!p) return;
      p.status = 'bloqueado'; persistUser(p); render();
    },
    desbloquear: function (id) {
      var p = findUser(id); if (!p) return;
      p.status = 'aprovado'; persistUser(p); render();
    },
    excluir: function (id) {
      confirmar('Remover este cadastro?', function () {
        db.users = db.users.filter(function (x) { return x.id !== id; });
        save(); render();
      });
    },
    estrelas: function (id) {
      var p = findUser(id); if (!p) return;
      openModal('<h3>Estrelas de ' + esc(p.nome) + '</h3><form onsubmit="App.setEstrelas(event,\'' + id + '\')">' +
        '<div class="field"><label>Quantidade (0 a 5)</label><select name="n">' +
        [0, 1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (Number(p.estrelas || 0) === n ? ' selected' : '') + '>' + n + ' ★</option>'; }).join('') +
        '</select></div><button class="btn" type="submit">Salvar</button></form>');
    },
    setEstrelas: function (e, id) {
      e.preventDefault();
      var p = findUser(id); if (!p) return;
      p.estrelas = Number(new FormData(e.target).get('n'));
      persistUser(p); closeModal(); render();
    },
    cert: function (id, ok) {
      var p = findUser(id); if (!p) return;
      if (ok) {
        p.certStatus = 'aprovado'; p.verificado = true;
        p.estrelas = p.estrelas || 5;
      } else {
        p.certStatus = 'recusada'; p.verificado = false;
        p.certObs = 'Comprovante insuficiente. Envie novamente.';
      }
      persistUser(p);
      toast(ok ? 'Selo liberado.' : 'Certificação recusada.');
      render();
    },
    cadastroManual: function () {
      var areas = Object.keys(AREAS).map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('');
      openModal('<h3>Cadastrar profissional</h3><p class="muted small">Use os dados enviados pelo profissional.</p>' +
        '<form onsubmit="App.criarPro(event)">' +
        '<div class="field"><label>Nome <span class="req">*</span></label><input name="nome" required></div>' +
        '<div class="field"><label>Empresa / fantasia</label><input name="empresa"></div>' +
        '<div class="field2"><div class="field"><label>Apelido</label><input name="apelido"></div><div class="field"><label>WhatsApp <span class="req">*</span></label><input name="whats" required oninput="App.mask(this,\'tel\')"></div></div>' +
        '<div class="field2"><div class="field"><label>Área</label><select name="area" onchange="App.syncProfissoes(this)"><option value="">—</option>' + areas + '</select></div>' +
        '<div class="field"><label>Profissão</label><select name="profissao" id="sel-profissao"><option value="">—</option></select></div></div>' +
        '<div class="field"><label>O que faz</label><textarea name="faz"></textarea></div>' +
        '<div class="field2"><div class="field"><label>Onde atende</label><input name="atende"></div><div class="field"><label>Endereço</label><input name="endereco"></div></div>' +
        '<div class="field2"><div class="field"><label>Dias</label><input name="dias"></div><div class="field"><label>Horário</label><input name="horario"></div></div>' +
        '<div class="field2"><div class="field"><label>CPF</label><input name="cpf" oninput="App.mask(this,\'cpf\')"></div><div class="field"><label>CNPJ</label><input name="cnpj" oninput="App.mask(this,\'cnpj\')"></div></div>' +
        '<button class="btn" type="submit">Cadastrar e aprovar</button></form>');
    },
    criarPro: function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      var p = {
        id: uid('pro'), tipo: 'profissional', nome: String(fd.get('nome')), whats: String(fd.get('whats')),
        empresa: String(fd.get('empresa') || ''), apelido: String(fd.get('apelido') || ''), area: String(fd.get('area') || ''), profissao: String(fd.get('profissao') || ''),
        faz: String(fd.get('faz') || ''), atende: String(fd.get('atende') || ''), endereco: String(fd.get('endereco') || ''),
        dias: String(fd.get('dias') || ''), horario: String(fd.get('horario') || ''),
        cpf: String(fd.get('cpf') || ''), cnpj: String(fd.get('cnpj') || ''),
        status: 'aprovado', verificado: false, certStatus: '', certFotos: [], estrelas: 0,
        criadoEm: new Date().toISOString(), criadoPor: 'central'
      };
      persistUser(p);
      closeModal(); toast('Profissional cadastrado.');
      render();
    },
    saveConfig: function (e) {
      e.preventDefault();
      var fd = new FormData(e.target);
      db.config.marca = String(fd.get('marca') || 'Conecta Irmãos');
      db.config.igreja = String(fd.get('igreja') || 'Igreja Presença de Deus');
      db.config.masterNome = String(fd.get('masterNome') || 'Elton');
      db.config.masterPin = String(fd.get('masterPin') || '1234');
      db.config.caca = String(fd.get('caca') || 'admin');
      save(); toast('Ajustes salvos.'); render();
    },
    exportar: function () {
      var blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'conecta-irmaos-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    },
    removerDemo: function () {
      confirmar('Remover os cadastros de exemplo?', function () {
        db.users = db.users.filter(function (u) { return !u.demo; });
        db.requests = db.requests.filter(function (r) { return !r.demo; });
        save(); toast('Exemplos removidos.'); render();
      });
    },
    zerar: function () {
      confirmar('Apagar TODOS os dados deste aparelho?', function () {
        db = defaultDB(); save();
        session = null; localStorage.removeItem(LS_SESSION);
        S.route = 'start'; S.tab = '';
        render();
      });
    }
  };
  window.App = App;

  App.filtro = function (f) { S.filtro = f; render(); };

  App.testarNuvem = function () {
    if (!cloud.on()) { toast('Configure a URL e a chave anon em config.js.'); return; }
    toast('Testando…');
    fetch(cloud.base() + 'ci_users?select=id&limit=1', { headers: cloud.headers() })
      .then(function (r) {
        if (r.ok) toast('Conexão OK com o Supabase.');
        else if (r.status === 404) toast('Chave OK, mas as tabelas ainda não existem. Rode o schema.');
        else toast('Erro ' + r.status + ': verifique o schema e a chave.');
      })
      .catch(function () { toast('Sem conexão com o Supabase.'); });
  };

  App.ampliar = function (id) {
    var r = db.requests.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    var ja = r.atribuidos || [];
    var extras = pros().filter(function (p) {
      if (p.status !== 'aprovado' || ja.indexOf(p.id) >= 0) return false;
      if (r.profissao && norm(p.profissao) === norm(r.profissao)) return true;
      if (r.area && areaOf(p) === r.area) return true;
      return false;
    }).slice(0, 5);
    if (!extras.length) { toast('Não há mais profissionais dessa área para ampliar.'); return; }
    r.atribuidos = ja.concat(extras.map(function (p) { return p.id; }));
    (r.historico = r.historico || []).push({ em: new Date().toISOString(), texto: 'Busca ampliada para mais ' + extras.length + ' profissional(is)' });
    persistObj(db.requests, r, 'ci_requests');
    toast('Busca ampliada.');
    render();
  };

  App.recusarPedido = function (id) {
    var r = db.requests.filter(function (x) { return x.id === id; })[0];
    if (!r || !session) return;
    r.atribuidos = (r.atribuidos || []).filter(function (x) { return x !== session.uid; });
    (r.historico = r.historico || []).push({ em: new Date().toISOString(), texto: 'Profissional recusou o pedido' });
    persistObj(db.requests, r, 'ci_requests');
    toast('Pedido recusado.');
    render();
  };

  /* ---------------- seed de exemplo ---------------- */
  function seed() {
    if (db.config.seeded || db.users.length) return;
    var agora = new Date().toISOString();
    var perfis = [
      {
        id: 'pro_elton', nome: 'Elton Miranda da Silva', empresa: 'Elton Miranda — Gestão de Dados',
        apelido: 'Elton', whats: '(61) 99527-6545', area: 'Gestão', profissao: 'Gestor de dados',
        faz: 'Gestão e organização de dados, planilhas, relatórios, controle de estoque e apoio administrativo.',
        atende: 'Brasília e região · também online', dias: 'Seg a Sáb', horario: '8h às 20h',
        endereco: 'Brasília - DF', cpf: '014.144.951-96', cnpj: '00.000.000/0001-00',
        foto: 'data:image/jpeg;base64,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', verificado: true, certStatus: 'aprovado', estrelas: 5, modelo: true
      },
      {
        id: 'demo_pro_1', nome: 'João Ferreira', apelido: 'Irmão João', whats: '(11) 98888-1010',
        area: 'Construção', profissao: 'Encanador',
        faz: 'Instalações hidráulicas, caça-vazamentos e manutenção residencial.',
        atende: 'Zona Sul e Centro', dias: 'Seg a Sáb', horario: '8h às 18h',
        estrelas: 5, verificado: true, certStatus: 'aprovado', cnpj: '12.345.678/0001-90'
      },
      {
        id: 'demo_pro_2', nome: 'Maria Oliveira', apelido: 'Irmã Maria', whats: '(11) 97777-2020',
        area: 'Alimentação', profissao: 'Confeiteira',
        faz: 'Bolos, doces e salgados para festas e encomendas.',
        atende: 'Toda a cidade', dias: 'Ter a Dom', horario: '9h às 19h',
        estrelas: 5, verificado: true, certStatus: 'aprovado'
      },
      {
        id: 'demo_pro_3', nome: 'Carlos Andrade', apelido: 'Cacá', whats: '(11) 96666-3030',
        area: 'Construção', profissao: 'Eletricista',
        faz: 'Instalações elétricas, troca de disjuntores e quadros.',
        atende: 'Zona Norte', dias: 'Seg a Sex', horario: '7h às 17h',
        estrelas: 4, verificado: true, certStatus: 'aprovado', cnpj: '98.765.432/0001-10'
      },
      {
        id: 'demo_pro_4', nome: 'Ana Paula Souza', apelido: 'Ana', whats: '(11) 95555-4040',
        area: 'Beleza', profissao: 'Cabeleireira',
        faz: 'Cortes, escova e tratamentos capilares a domicílio.',
        atende: 'Zona Oeste', dias: 'Seg a Sáb', horario: '10h às 20h', estrelas: 5
      }
    ];
    perfis.forEach(function (p) {
      db.users.push(touch({
        id: p.id, tipo: 'profissional', status: 'aprovado', demo: true, modelo: !!p.modelo,
        nome: p.nome, empresa: p.empresa || '', apelido: p.apelido || '', whats: p.whats || '',
        area: p.area, profissao: p.profissao, faz: p.faz || '', atende: p.atende || '',
        dias: p.dias || '', horario: p.horario || '', endereco: p.endereco || '',
        cpf: p.cpf || '', cnpj: p.cnpj || '', foto: p.foto || '',
        verificado: !!p.verificado, certStatus: p.certStatus || '', certFotos: [],
        estrelas: p.estrelas || 0, criadoEm: agora
      }));
    });
    db.users.push(touch({
      id: 'cli_elton', tipo: 'cliente', nome: 'Elton Cliente Teste', whats: '(61) 99527-6545',
      cpf: '000.000.000-00', rg: '0000000', nasc: '1990-01-01', foto: '',
      endereco: 'Brasília - DF', status: 'aprovado', demo: true, modelo: true, criadoEm: agora
    }));
    db.requests.push(touch({
      id: 'req_demo_1', numero: 1, clienteId: 'cli_elton', clienteNome: 'Elton Cliente Teste',
      area: 'Gestão', profissao: 'Gestor de dados',
      descricao: 'Preciso de apoio na organização das planilhas de estoque do restaurante e de um relatório mensal de consumo.',
      endereco: 'Brasília - DF', urgencia: 'Hoje', status: 'aberta',
      atribuidos: ['pro_elton'], propostas: [], criadoEm: agora, origem: 'central',
      historico: [{ em: agora, texto: 'Pedido criado e enviado para 1 profissional(is)' }], vistos: {}
    }));
    db.orders.push(touch({
      id: 'os_demo_1', numero: 1, profId: 'pro_elton',
      clienteNome: 'Elton Cliente Teste', clienteCpf: '000.000.000-00', clienteWhats: '(61) 99527-6545',
      clienteEndereco: 'Brasília - DF',
      servico: 'Implantação de controle de estoque e planilha de custos do restaurante (modelo de teste).',
      valor: 850, pagamento: 'Pix', obs: 'Modelo de demonstração com documentação aprovada.',
      pago: true, criadoEm: agora, pagoEm: agora
    }));
    db.config.seqReq = 2;
    db.config.seqOS = 2;
    db.config.seeded = true;
    save();
    if (cloud.on()) {
      db.users.forEach(function (u) { cloud.push('ci_users', u); });
      db.requests.forEach(function (r) { cloud.push('ci_requests', r); });
      db.orders.forEach(function (o) { cloud.push('ci_orders', o); });
    }
  }

  /* ---------------- render ---------------- */
  function viewAuthMaster() {
    return '<div class="wrap">' + brandBlock(true) +
      '<h2>Central gerencial e técnica</h2>' +
      '<p class="muted small">Painel 1. Aqui ficam as aprovações, certificações, cadastros, estatísticas e o caça profissional em teste.</p>' +
      '<form class="card" onsubmit="App.doMaster(event)">' +
        '<div class="field"><label>Seu nome</label><input name="nome" value="' + esc(db.config.masterNome || 'Elton') + '"></div>' +
        '<div class="field"><label>PIN de acesso <span class="req">*</span></label><input name="pin" type="password" inputmode="numeric" required placeholder="••••"><div class="hint">PIN inicial: 1234 — troque em Ajustes.</div></div>' +
        '<button class="btn" type="submit">Entrar na Central</button>' +
        '<button class="btn link" type="button" onclick="App.route(\'start\')">‹ voltar</button>' +
      '</form></div>' + footer();
  }

  function render() {
    var u = me();
    var html = '';
    if (!session) {
      if (S.route === 'cliente') html = viewAuth('cliente');
      else if (S.route === 'profissional') html = viewAuth('profissional');
      else if (S.route === 'master') html = viewAuthMaster();
      else html = viewStart();
    } else if (isMaster()) {
      html = viewMaster();
    } else if (u && u.tipo === 'profissional') {
      if (u.status === 'recusado') { html = topbar(u) + '<div class="wrap"><div class="card"><h2>Cadastro não aprovado</h2><p class="muted">Fale com a Central para revisar seus dados.</p><button class="btn ghost" onclick="App.logout()">Sair</button></div></div>' + footer(); }
      else html = viewPro(u);
    } else if (u) {
      html = viewCliente(u);
    } else {
      session = null; html = viewStart();
    }
    $('#app').innerHTML = html;
    window.scrollTo(0, 0);
  }

  function updateLive() {
    var el = document.querySelector('[data-live="online"]');
    if (el) el.textContent = onlineCount();
  }

  /* ---------------- init ---------------- */
  load();
  seed();
  render();
  setInterval(function () {
    if (!session) return;
    db.presence[session.uid] = Date.now();
    save();
    if (cloud.on()) { cloud.presencePush(); if (document.visibilityState === 'visible') cloud.presencePull(); }
    updateLive();
  }, 25000);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && session) { heartbeat(); cloud.pullAll().then(function (c) { if (c) render(); }); }
  });
})();
