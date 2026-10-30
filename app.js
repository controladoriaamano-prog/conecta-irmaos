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
    'Outros': ['Outro serviço']
  };
  var AREA_ICON = {
    'Construção': '🧱', 'Alimentação': '🍞', 'Beleza': '✂️', 'Saúde': '🩺',
    'Automotivo': '🔧', 'Tecnologia': '💻', 'Serviços': '🛠️', 'Eventos': '🎉', 'Outros': '📦'
  };

  var LS_DB = 'ci_db_v1';
  var LS_SESSION = 'ci_session';
  var ONLINE_MS = 120000;

  var db = null;
  var session = null;
  var TMP = { foto: null, cert: [], clientes: null };
  var S = { route: 'start', tab: '', q: '', area: '', doc: null, selPro: null };

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
        masterPin: '1234', masterNome: 'Elton', caca: 'admin',
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
    function on() {
      return !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.fetch);
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
      }).catch(function () { });
    }
    function pullAll() {
      if (!on()) return Promise.resolve();
      var tables = ['ci_users', 'ci_requests', 'ci_orders'];
      return Promise.all(tables.map(function (t) {
        return fetch(base() + t + '?select=id,data', { headers: headers() })
          .then(function (r) { return r.ok ? r.json() : []; })
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
      }).catch(function () { });
    }
    function presencePull() {
      if (!on()) return Promise.resolve();
      return fetch(base() + 'ci_presence?select=id,data', { headers: headers() })
        .then(function (r) { return r.ok ? r.json() : []; })
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
      return '<button class="' + (current === it.id ? 'on' : '') + '" onclick="App.go(\'' + it.id + '\')">' +
        '<span class="ic">' + it.ic + '</span>' + it.label + '</button>';
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
    var wa = p.whats ? '<button class="btn sm ghost" onclick="App.wa(\'' + esc(p.whats) + '\',\'' + esc(p.nome) + '\')">WhatsApp</button>' : '';
    return '<div class="pro-card">' +
      '<div class="head">' + avatar(p, 'sm') +
        '<div class="grow"><div class="row" style="gap:6px;flex-wrap:wrap"><span class="nm">' + esc(p.nome) + '</span>' +
        (verified(p) ? '<span class="badge-verif">✔ verificado</span>' : '') + (p.demo ? '<span class="badge-demo">exemplo</span>' : '') + '</div>' +
        '<div class="area">' + esc(p.profissao || areaOf(p)) + '</div>' +
        '<div class="muted small">' + esc(p.atende || 'Atendimento na região') + (isOnline(p.id) ? ' · <span style="color:#22a06b;font-weight:700">online</span>' : '') + '</div></div>' +
      '</div>' +
      (p.apelido ? '<div class="muted small" style="margin-top:4px">"' + esc(p.apelido) + '"</div>' : '') +
      (p.faz ? '<div class="desc">' + esc(p.faz) + '</div>' : '') +
      '<div class="foot">' + stars(p.estrelas) + (p.cnpj ? '<span class="chip green">CNPJ</span>' : '') +
        wa + '<button class="btn sm ghost" onclick="App.openPro(\'' + p.id + '\')">Ver perfil</button></div>' +
      '</div>';
  }

  /* ---------------- telas de entrada ---------------- */
  function viewStart() {
    var totalPros = pros().filter(function (p) { return p.status === 'aprovado'; }).length;
    var on = onlineCount();
    return '<div class="wrap">' + brandBlock() +
      '<div class="card" style="text-align:center">' +
        '<div class="row" style="justify-content:center;gap:16px;flex-wrap:wrap">' +
          '<div><b style="font-size:22px;color:var(--verde)">' + totalPros + '</b><div class="muted small">profissionais</div></div>' +
          '<div style="width:1px;height:32px;background:var(--linha)"></div>' +
          '<div><b style="font-size:22px;color:var(--verde)">' + on + '</b><div class="muted small"><span class="livedot"></span>online agora</div></div>' +
          '<div style="width:1px;height:32px;background:var(--linha)"></div>' +
          '<div><b style="font-size:22px;color:var(--verde)">' + users().length + '</b><div class="muted small">na comunidade</div></div>' +
        '</div>' +
      '</div>' +
      '<p class="center muted" style="margin:16px 4px 14px">Talentos que servem.<br>Pessoas que se ajudam.</p>' +
      '<button class="card" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center;cursor:pointer;border:1px solid var(--linha)" onclick="App.route(\'cliente\')">' +
        '<div style="font-size:26px">🔎</div><div class="grow"><b> Sou cliente</b><div class="muted small">Encontrar um profissional ou pedir um serviço</div></div><div style="color:var(--cinza)">›</div></button>' +
      '<button class="card" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center;cursor:pointer;border:1px solid var(--linha)" onclick="App.route(\'profissional\')">' +
        '<div style="font-size:26px">🧑‍🔧</div><div class="grow"><b> Sou profissional</b><div class="muted small">Divulgar meu serviço e atender clientes</div></div><div style="color:var(--cinza)">›</div></button>' +
      '<button class="btn ghost" style="margin-top:4px" onclick="App.route(\'master\')">⚙️ Central gerencial e técnica</button>' +
      '<p class="center small" style="color:#9aa8a2;margin-top:14px">A Central reúne os dois painéis: cadastros, aprovações, certificações e o modo caça profissional em teste.</p>' +
      '</div>' + footer();
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
    var target = $('#sel-profissao');
    target.innerHTML = '<option value="">Selecione…</option>' + list.map(function (p) { return '<option>' + esc(p) + '</option>'; }).join('');
  }

  /* ---------------- cliente ---------------- */
  function viewCliente(u) {
    var tab = S.tab || 'buscar';
    var content = '';
    if (tab === 'buscar') content = clienteBuscar(u);
    else if (tab === 'pedidos') content = clientePedidos(u);
    else content = clientePerfil(u);
    return topbar(u) + '<div class="wrap">' + content + '</div>' + footer() +
      tabbar([{ id: 'buscar', ic: '🔎', label: 'Buscar' }, { id: 'pedidos', ic: '📋', label: 'Pedidos' }, { id: 'perfil', ic: '👤', label: 'Perfil' }], tab);
  }

  function clienteBuscar(u) {
    var q = norm(S.q);
    var list = pros().filter(function (p) {
      if (p.status !== 'aprovado') return false;
      if (S.area && areaOf(p) !== S.area) return false;
      if (!q) return true;
      return norm([p.nome, p.apelido, p.profissao, p.faz, p.atende, p.area].join(' ')).indexOf(q) >= 0;
    }).sort(function (a, b) { return (isOnline(b.id) ? 1 : 0) - (isOnline(a.id) ? 1 : 0); });

    var cats = Object.keys(AREAS).map(function (a) {
      return '<button class="card tight" style="text-align:center;border:1px solid ' + (S.area === a ? 'var(--verde)' : 'var(--linha)') + ';cursor:pointer;padding:12px 6px" onclick="App.area(\'' + esc(a) + '\')">' +
        '<div style="font-size:22px">' + (AREA_ICON[a] || '📦') + '</div><div class="small" style="font-weight:700;margin-top:2px">' + esc(a) + '</div></button>';
    }).join('');

    return '<h2>Olá, ' + esc((u.nome || '').split(' ')[0]) + '</h2>' +
      '<p class="muted small">Encontre um irmão profissional ou peça um serviço.</p>' +
      '<div class="field" style="margin:12px 0 10px"><input id="busca" placeholder="O que você procura? Ex.: eletricista, bolo…" value="' + esc(S.q) + '" oninput="App.search(this.value)"></div>' +
      '<div class="grid g3" style="grid-template-columns:repeat(3,1fr)">' + cats + '</div>' +
      (S.area ? '<div class="row between" style="margin:14px 0 8px"><b style="font-size:14px">' + (AREA_ICON[S.area] || '') + ' ' + esc(S.area) + '</b><button class="btn xs ghost" onclick="App.area(\'\')">limpar</button></div>'
        : '<div class="sec-title">Profissionais' + (list.length ? ' · ' + list.length : '') + '</div>') +
      (list.length ? '<div class="grid">' + list.map(proCard).join('') + '</div>'
        : '<div class="empty"><span class="big">🔍</span>Nenhum profissional encontrado.<br><span class="small">Tente outra palavra ou área.</span></div>') +
      '<div class="card flat" style="margin-top:16px"><div class="row between"><div><b>Pedir um serviço</b><div class="muted small">A plataforma procura profissionais disponíveis para você.</div></div>' +
      '<button class="btn sm" onclick="App.caçaCliente()">Solicitar</button></div></div>';
  }

  function clientePedidos(u) {
    var reqs = db.requests.filter(function (r) { return r.clienteId === u.id || norm(r.clienteNome) === norm(u.nome); })
      .sort(function (a, b) { return (b.criadoEm || '').localeCompare(a.criadoEm || ''); });
    var bloqueado = db.config.caca !== 'todos';
    return '<h2>Meus pedidos</h2>' +
      (bloqueado ? '<div class="hintbox">O caça profissional está em <b>teste interno</b>. Por enquanto só a Central cria solicitações. Em breve liberamos para todos.</div>' : '') +
      '<div class="sec-title">Solicitações</div>' +
      (reqs.length ? reqs.map(function (r) {
        var p = r.escolhidoId ? findUser(r.escolhidoId) : null;
        return '<div class="card tight"><div class="row between"><b>' + esc(r.profissao || r.categoria) + '</b><span class="chip ' + (r.status === 'concluida' ? 'gray' : r.status === 'aberta' ? 'gold' : 'green') + '">' + esc(r.status) + '</span></div>' +
          '<div class="muted small">' + esc(r.descricao) + '</div>' +
          '<div class="muted small" style="margin-top:6px">' + dtbr(r.criadoEm) + ' · ' + (r.propostas || []).length + ' orçamento(s)' + (p ? ' · escolhido: <b>' + esc(p.nome) + '</b>' : '') + '</div></div>';
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
        { id: 'caca', ic: '📡', label: 'Caça' },
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
    var jaTem = {};
    meus.forEach(function (r) { (r.propostas || []).forEach(function (p) { if (p.profId === u.id) jaTem[r.id] = true; }); });
    return '<h2>Caça profissional</h2>' +
      '<div class="hintbox ' + (db.config.caca === 'admin' ? '' : 'info') + '">' +
        (db.config.caca === 'admin'
          ? 'Modo teste: só a Central cria solicitações. Os pedidos aparecem aqui quando a Central distribui para você.'
          : 'Modo aberto: clientes também podem solicitar serviços.') + '</div>' +
      '<div class="sec-title">Pedidos para você · ' + meus.length + '</div>' +
      (u.status !== 'aprovado' ? '<div class="hintbox warn">Aguarde a aprovação da Central para receber pedidos.</div>' : '') +
      (meus.length ? meus.map(function (r) {
        var dono = r.propostas && r.propostas.filter(function (p) { return p.profId === u.id; })[0];
        return '<div class="card tight">' +
          '<div class="row between"><b>' + esc(r.profissao || r.categoria) + '</b><span class="chip ' + (r.status === 'aberta' ? 'gold' : 'green') + '">' + esc(r.status) + '</span></div>' +
          '<div class="small" style="margin:6px 0">' + esc(r.descricao) + '</div>' +
          '<div class="muted small">' + esc(r.urgencia || '') + ' · ' + esc(r.endereco || 'endereço no aceite') + ' · ' + dtbr(r.criadoEm) + '</div>' +
          (dono ? '<div class="chip gold" style="margin-top:8px">seu orçamento: ' + money(dono.valor) + '</div>'
            : '<button class="btn sm" style="margin-top:10px" onclick="App.orcamento(\'' + r.id + '\')">Aceitar e enviar orçamento</button>') +
          '</div>';
      }).join('') : '<div class="empty"><span class="big">📡</span>Nenhum pedido no momento.</div>') +
      '<div class="card flat" style="margin-top:10px"><div class="muted small">O caça profissional está disponível neste Painel 2. A Central acompanha cada pedido, os orçamentos e a escolha do cliente.</div></div>';
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
    return '<div class="ct">' + esc(nomeMarca) + ' · profissional</div>' +
      '<div class="cn">' + esc(nomeMarca) + '</div>' +
      '<div class="cf">' + (u.foto ? '<img src="' + u.foto + '">' : '<div class="ph">' + esc(initials(u.nome)) + '</div>') +
      '<div><div class="cp">' + esc(u.nome) + '</div><div class="cs">' + esc(u.profissao || '') + '</div>' +
      '<div class="cs">CNPJ ' + esc(u.cnpj || '') + '</div>' +
      '<div class="cs">Validação ' + esc(val) + '</div></div></div>' +
      '<div class="cbot"><span>' + esc(db.config.igreja || '') + '</span><b>BY ELTON · SISTEMA E LOGÍSTICA</b></div>';
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
        { id: 'caca', ic: '📡', label: 'Caça' },
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
    return '<h2>Caça profissional</h2>' +
      '<div class="hintbox ' + (db.config.caca === 'admin' ? '' : 'info') + '">' +
        'Modo atual: <b>' + (db.config.caca === 'admin' ? 'teste interno — só a Central cria pedidos' : 'aberto para clientes') + '</b>. ' +
        'O pedido é distribuído para até 5 profissionais da área (online primeiro).</div>' +
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
        return '<div class="card tight">' +
          '<div class="row between"><b>' + esc(r.profissao || r.area || 'Pedido') + '</b>' +
          '<span class="chip ' + (r.status === 'concluida' ? 'gray' : r.status === 'aberta' ? 'gold' : 'green') + '">' + esc(r.status) + '</span></div>' +
          '<div class="small" style="margin:5px 0">' + esc(r.descricao) + '</div>' +
          '<div class="muted small">' + esc(r.clienteNome || 'Cliente') + ' · ' + esc(r.endereco || '—') + ' · ' + dtbr(r.criadoEm) + '</div>' +
          '<div class="muted small" style="margin-top:6px">Enviado para: ' + (atrib.length ? atrib.map(function (p) { return esc(p.nome.split(' ')[0]); }).join(', ') : 'nenhum profissional da área') + '</div>' +
          ((r.propostas || []).length ? '<hr class="dash">' + r.propostas.map(function (pr) {
            var p = findUser(pr.profId);
            return '<div class="row between" style="font-size:13px"><span>' + esc(p ? p.nome : '—') + (pr.obs ? ' · <span class="muted small">' + esc(pr.obs) + '</span>' : '') + '</span>' +
              '<span><b>' + money(pr.valor) + '</b> ' + (r.escolhidoId === pr.profId ? '<span class="chip green">escolhido</span>' : '<button class="btn xs ghost" onclick="App.escolher(\'' + r.id + '\',\'' + pr.profId + '\')">escolher</button>') + '</span></div>';
          }).join('') : '<div class="muted small" style="margin-top:6px">Aguardando orçamentos…</div>') +
          '<div class="doc-actions">' +
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
      '<div class="card tight"><div class="muted small">Para acessar de qualquer aparelho com os mesmos dados, informe a URL e a chave pública do Supabase em <b>config.js</b>. Sem isso, o app funciona 100% neste aparelho.</div>' +
      '<div class="kv" style="margin-top:8px"><span>Status</span><span>' + (cloud.on() ? 'conectado' : 'local') + '</span></div></div>' +
      '<div class="sec-title">Sobre</div>' +
      '<div class="card tight center"><div class="muted small">' + esc(db.config.marca) + ' · v1.0<br>' + esc(db.config.igreja) + '<br>by Elton · Sistema e Logística</div></div>';
  }

  /* ---------------- documentos ---------------- */
  var DOC_CSS = '@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#16211d;margin:0}' +
    '.dh{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0e5c44;padding-bottom:10px;margin-bottom:16px}' +
    '.dl{font-size:19px;font-weight:800;color:#0e5c44;letter-spacing:-.3px}.ds{font-size:10px;letter-spacing:2px;color:#6c7a74;text-transform:uppercase}' +
    '.dn{text-align:right;font-size:10px;color:#6c7a74;line-height:1.6}.dn b{font-size:14px;color:#16211d}' +
    'h2{font-size:13px;text-transform:uppercase;letter-spacing:1.2px;color:#0e5c44;margin:16px 0 8px}' +
    '.box{border:1px solid #e4e0d4;border-radius:8px;padding:10px 12px;font-size:12.5px;line-height:1.6}' +
    '.two{display:flex;gap:12px}.two>div{flex:1}' +
    '.lbl{font-size:10px;color:#6c7a74;text-transform:uppercase;letter-spacing:.6px}' +
    'table{width:100%;border-collapse:collapse;font-size:12.5px;margin-top:6px}th,td{padding:7px 8px;border-bottom:1px solid #eee;text-align:left}th{background:#f6f4ee;font-size:10.5px;text-transform:uppercase;letter-spacing:.6px}' +
    '.tot{text-align:right;font-size:18px;font-weight:800;margin-top:12px;color:#0e5c44}' +
    '.assin{margin-top:42px;display:flex;gap:30px}.assin div{flex:1;border-top:1px solid #999;padding-top:5px;font-size:10.5px;text-align:center;color:#6c7a74}' +
    '.ft{margin-top:34px;border-top:1px solid #e4e0d4;padding-top:8px;font-size:9px;color:#9aa8a2;text-align:center;letter-spacing:.6px}' +
    '.card-print{width:85mm;height:54mm;border-radius:4mm;background:linear-gradient(140deg,#0e5c44,#0a3c2c 60%,#0d4c38);color:#fff;padding:5mm;position:relative;overflow:hidden}' +
    '.card-print .ct{font-size:6pt;letter-spacing:2px;text-transform:uppercase;color:#cbb98d}.card-print .cn{font-size:11pt;font-weight:800}' +
    '.card-print .cf{display:flex;gap:3mm;margin-top:3mm}.card-print img,.card-print .ph{width:14mm;height:14mm;border-radius:2mm;object-fit:cover;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-weight:800}' +
    '.card-print .cp{font-size:9pt;font-weight:800;text-transform:uppercase}.card-print .cs{font-size:6.5pt;color:#bcd3c7;margin-top:.6mm}' +
    '.card-print .cbot{position:absolute;left:5mm;right:5mm;bottom:3.5mm;display:flex;justify-content:space-between;font-size:5.5pt;color:#a9c3b6;letter-spacing:.4px}' +
    '.card-print .cbot b{color:#e5d3a6;font-size:5.5pt;letter-spacing:1px}';

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
  function docHeader(titulo, numero, data) {
    return '<div class="dh"><div><div class="dl">' + esc(db.config.marca || 'Conecta Irmãos') + '</div>' +
      '<div class="ds">' + esc(db.config.igreja || 'Igreja Presença de Deus') + '</div></div>' +
      '<div class="dn">' + esc(titulo) + '<br><b>' + esc(numero) + '</b><br>' + esc(data) + '</div></div>';
  }
  function docFooter() {
    return '<div class="ft">' + esc(db.config.marca || 'Conecta Irmãos') + ' · ' + esc(db.config.igreja || 'Igreja Presença de Deus') + '<br>BY ELTON · SISTEMA E LOGÍSTICA</div>';
  }
  function docOS(o) {
    var p = findUser(o.profId) || {};
    return docHeader('Ordem de Serviço', 'OS-' + String(o.numero).padStart(4, '0'), dbr(o.criadoEm)) +
      '<h2>Prestador</h2><div class="box"><b>' + esc(p.nome || '—') + '</b><br>' +
      esc(p.profissao || '') + ' · ' + esc(p.whats || '') + (p.cnpj ? '<br>CNPJ ' + esc(p.cnpj) : '') + '</div>' +
      '<h2>Cliente</h2><div class="box"><b>' + esc(o.clienteNome) + '</b><br>' + (o.clienteCpf ? 'CPF ' + esc(o.clienteCpf) + '<br>' : '') +
      esc(o.clienteWhats || '') + (o.clienteEndereco ? '<br>' + esc(o.clienteEndereco) : '') + '</div>' +
      '<h2>Serviço</h2><div class="box">' + esc(o.servico).replace(/\n/g, '<br>') + '</div>' +
      '<table><tr><th>Descrição</th><th style="text-align:right">Valor</th></tr>' +
      '<tr><td>Serviço prestado</td><td style="text-align:right">' + money(o.valor) + '</td></tr></table>' +
      '<div class="tot">Total: ' + money(o.valor) + '</div>' +
      '<div class="two" style="margin-top:14px"><div class="box"><span class="lbl">Pagamento</span><br>' + esc(o.pagamento || 'a combinar') + ' · ' + (o.pago ? 'PAGO' : 'EM ABERTO') + '</div>' +
      '<div class="box"><span class="lbl">Observações</span><br>' + esc(o.obs || '—') + '</div></div>' +
      '<div class="assin"><div>' + esc(p.nome || 'Prestador') + '<br>Prestador</div><div>' + esc(o.clienteNome) + '<br>Cliente</div></div>' +
      docFooter();
  }
  function docRecibo(o) {
    var p = findUser(o.profId) || {};
    return docHeader('Recibo de Pagamento', 'REC-' + String(o.numero).padStart(4, '0'), dbr(o.pagoEm || o.criadoEm)) +
      '<div class="box" style="font-size:14px;line-height:1.9;padding:20px">' +
      'Recebi(emos) de <b>' + esc(o.clienteNome) + '</b>' + (o.clienteCpf ? ', CPF ' + esc(o.clienteCpf) : '') +
      ' a importância de <b>' + money(o.valor) + '</b> referente a <b>' + esc(o.servico) + '</b>.<br>' +
      'Para clareza, firmo o presente recibo dando plena e total quitação do valor acima. ' +
      (p.cnpj ? '<br><br>Emitido por <b>' + esc(p.nome) + '</b> · CNPJ ' + esc(p.cnpj) + '.' : '<br><br>Emitido por <b>' + esc(p.nome) + '</b>.') +
      '</div>' +
      '<div class="tot">Valor: ' + money(o.valor) + '</div>' +
      '<div class="box" style="margin-top:14px"><span class="lbl">Forma de pagamento</span><br>' + esc(o.pagamento || 'a combinar') + '</div>' +
      '<div class="assin"><div>' + esc(p.nome || 'Prestador') + '<br>Emissor</div><div>____/____/______<br>Data</div></div>' +
      docFooter();
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
      openModal('<div class="row">' + avatar(p, 'lg') + '<div class="grow"><h3 style="margin:0">' + esc(p.nome) + '</h3>' +
        '<div class="small" style="color:var(--verde);font-weight:700">' + esc(p.profissao || '') + '</div>' +
        '<div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap">' + (verified(p) ? '<span class="badge-verif">✔ verificado</span>' : '') + stars(p.estrelas) + '</div></div></div>' +
        '<div class="card flat" style="margin-top:12px">' +
        '<div class="kv"><span>Área</span><span>' + esc(areaOf(p)) + '</span></div>' +
        '<div class="kv"><span>Atende</span><span>' + esc(p.atende || '—') + '</span></div>' +
        '<div class="kv"><span>Dias / horário</span><span>' + esc(p.dias || '—') + ' · ' + esc(p.horario || '—') + '</span></div>' +
        '<div class="kv"><span>Situação</span><span>' + (isOnline(p.id) ? 'online agora' : 'offline') + '</span></div>' +
        (p.faz ? '<div style="margin-top:8px" class="small">' + esc(p.faz) + '</div>' : '') + '</div>' +
        '<button class="btn" onclick="App.wa(\'' + esc(p.whats || '') + '\',\'' + esc(p.nome) + '\')">Falar no WhatsApp</button>');
    },
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
        apelido: fd.get('apelido') || '', area: fd.get('area') || '', profissao: fd.get('profissao') || '',
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
      ['nome', 'apelido', 'whats', 'area', 'profissao', 'faz', 'atende', 'dias', 'horario', 'endereco', 'cpf', 'cnpj']
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
      printDoc('<div style="padding:10mm 0"><div class="card-print">' + carteiraInner(u) + '</div></div>');
    },

    /* caça */
    caçaCliente: function () {
      if (db.config.caca !== 'todos') { toast('Caça profissional em teste interno.'); return; }
      var u = me(); if (!u) return;
      if (!u.cpf || !u.endereco) { toast('Complete seu cadastro (CPF e endereço) para solicitar.'); S.tab = 'perfil'; render(); return; }
      App.novoPedidoCliente();
    },
    novoPedidoCliente: function () {
      openModal('<h3>Pedir um serviço</h3><form onsubmit="App.criarPedido(event,\'cliente\')">' +
        '<div class="field"><label>Área</label><select name="area" onchange="App.syncProfissoes(this)"><option value="">—</option>' +
        Object.keys(AREAS).map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Profissão</label><select name="profissao" id="sel-profissao"><option value="">—</option></select></div>' +
        '<div class="field"><label>O que precisa</label><textarea name="descricao" required></textarea></div>' +
        '<div class="field"><label>Endereço</label><input name="endereco" required></div>' +
        '<div class="field"><label>Urgência</label><select name="urgencia"><option>O mais rápido possível</option><option>Hoje</option><option>Esta semana</option></select></div>' +
        '<button class="btn" type="submit">Solicitar</button></form>');
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
        criadoEm: new Date().toISOString(), origem: origem || 'central'
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
      persistObj(db.requests, r, 'ci_requests');
      closeModal();
      toast('Orçamento enviado.');
      render();
    },
    escolher: function (rid, pid) {
      var r = db.requests.filter(function (x) { return x.id === rid; })[0]; if (!r) return;
      r.escolhidoId = pid; r.status = 'aceita';
      persistObj(db.requests, r, 'ci_requests');
      toast('Profissional escolhido.');
      render();
    },
    concluirPedido: function (id) {
      var r = db.requests.filter(function (x) { return x.id === id; })[0]; if (!r) return;
      r.status = 'concluida';
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
        apelido: String(fd.get('apelido') || ''), area: String(fd.get('area') || ''), profissao: String(fd.get('profissao') || ''),
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

  /* ---------------- seed de exemplo ---------------- */
  function seed() {
    if (db.config.seeded || db.users.length) return;
    var demo = [
      { nome: 'João Ferreira', apelido: 'Irmão João', whats: '(11) 98888-1010', area: 'Construção', profissao: 'Encanador', faz: 'Instalações hidráulicas, caça-vazamentos e manutenção residencial.', atende: 'Zona Sul e Centro', dias: 'Seg a Sáb', horario: '8h às 18h', estrelas: 5, verificado: true, certStatus: 'aprovado', cnpj: '12.345.678/0001-90' },
      { nome: 'Maria Oliveira', apelido: 'Irmã Maria', whats: '(11) 97777-2020', area: 'Alimentação', profissao: 'Confeiteira', faz: 'Bolos, doces e salgados para festas e encomendas.', atende: 'Toda a cidade', dias: 'Ter a Dom', horario: '9h às 19h', estrelas: 5, verificado: true, certStatus: 'aprovado' },
      { nome: 'Carlos Andrade', apelido: 'Cacá', whats: '(11) 96666-3030', area: 'Construção', profissao: 'Eletricista', faz: 'Instalações elétricas, troca de disjuntores e quadros.', atende: 'Zona Norte', dias: 'Seg a Sex', horario: '7h às 17h', estrelas: 4, verificado: true, certStatus: 'aprovado', cnpj: '98.765.432/0001-10' },
      { nome: 'Ana Paula Souza', apelido: 'Ana', whats: '(11) 95555-4040', area: 'Beleza', profissao: 'Cabeleireira', faz: 'Cortes, escova e tratamentos capilares a domicílio.', atende: 'Zona Oeste', dias: 'Seg a Sáb', horario: '10h às 20h', estrelas: 5 },
      { nome: 'Rafael Lima', apelido: 'Rafa', whats: '(11) 94444-5050', area: 'Tecnologia', profissao: 'Técnico de informática', faz: 'Formatação, manutenção de notebooks e redes.', atende: 'Centro e Zona Leste', dias: 'Seg a Sáb', horario: '9h às 18h', estrelas: 4 },
      { nome: 'Pedro Santos', apelido: 'Pedrinho', whats: '(11) 93333-6060', area: 'Automotivo', profissao: 'Mecânico', faz: 'Revisão, freios e suspensão.', atende: 'Zona Sul', dias: 'Seg a Sex', horario: '8h às 18h', estrelas: 3 }
    ];
    demo.forEach(function (d, i) {
      db.users.push(touch({
        id: 'demo_pro_' + (i + 1), tipo: 'profissional', status: 'aprovado', demo: true,
        cpf: '', endereco: '', foto: '', certFotos: [], criadoEm: new Date().toISOString(),
        faz: d.faz, atende: d.atende, dias: d.dias, horario: d.horario,
        nome: d.nome, apelido: d.apelido, whats: d.whats, area: d.area, profissao: d.profissao,
        estrelas: d.estrelas, verificado: !!d.verificado, certStatus: d.certStatus || '', cnpj: d.cnpj || ''
      }));
    });
    db.users.push(touch({
      id: 'demo_cli_1', tipo: 'cliente', nome: 'Elton (exemplo)', whats: '(11) 90000-0000',
      cpf: '000.000.000-00', nasc: '1990-01-01', foto: '', status: 'aprovado', demo: true,
      criadoEm: new Date().toISOString()
    }));
    db.config.seeded = true;
    save();
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
