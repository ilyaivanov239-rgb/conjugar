/* Движок спряжений европейского португальского (pt-PT).
   Лица: eu, tu, ele/ela/você, nós, eles/elas/vocês (vós не используется). */
(function (root) {
  'use strict';

  var PERSONS = ['eu', 'tu', 'ele/ela/você', 'nós', 'eles/elas/vocês'];
  var VOWELS = 'aeiou';

  // ---------- таблицы неправильных глаголов ----------
  // pres, pps, imp: массивы из 5 форм. part, ger, fut (основа для Futuro/Condicional),
  // conj: Presente do Conjuntivo, когда форма eu не оканчивается на -o.
  var IRR = {
    ser:   { pres: ['sou', 'és', 'é', 'somos', 'são'],
             pps: ['fui', 'foste', 'foi', 'fomos', 'foram'],
             imp: ['era', 'eras', 'era', 'éramos', 'eram'],
             part: 'sido', conj: ['seja', 'sejas', 'seja', 'sejamos', 'sejam'], imper: 'sê' },
    estar: { pres: ['estou', 'estás', 'está', 'estamos', 'estão'],
             pps: ['estive', 'estiveste', 'esteve', 'estivemos', 'estiveram'],
             conj: ['esteja', 'estejas', 'esteja', 'estejamos', 'estejam'], strong: true },
    ter:   { pres: ['tenho', 'tens', 'tem', 'temos', 'têm'],
             pps: ['tive', 'tiveste', 'teve', 'tivemos', 'tiveram'],
             imp: ['tinha', 'tinhas', 'tinha', 'tínhamos', 'tinham'],
             part: 'tido', strong: true },
    ir:    { pres: ['vou', 'vais', 'vai', 'vamos', 'vão'],
             pps: ['fui', 'foste', 'foi', 'fomos', 'foram'],
             part: 'ido', conj: ['vá', 'vás', 'vá', 'vamos', 'vão'] },
    vir:   { pres: ['venho', 'vens', 'vem', 'vimos', 'vêm'],
             pps: ['vim', 'vieste', 'veio', 'viemos', 'vieram'],
             imp: ['vinha', 'vinhas', 'vinha', 'vínhamos', 'vinham'],
             part: 'vindo', strong: true },
    ver:   { pres: ['vejo', 'vês', 'vê', 'vemos', 'veem'],
             pps: ['vi', 'viste', 'viu', 'vimos', 'viram'],
             part: 'visto' },
    ler:   { pres: ['leio', 'lês', 'lê', 'lemos', 'leem'],
             pps: ['li', 'leste', 'leu', 'lemos', 'leram'] },
    crer:  { pres: ['creio', 'crês', 'crê', 'cremos', 'creem'],
             pps: ['cri', 'creste', 'creu', 'cremos', 'creram'] },
    dar:   { pres: ['dou', 'dás', 'dá', 'damos', 'dão'],
             pps: ['dei', 'deste', 'deu', 'demos', 'deram'],
             conj: ['dê', 'dês', 'dê', 'demos', 'deem'], strong: true },
    fazer: { pres: ['faço', 'fazes', 'faz', 'fazemos', 'fazem'],
             pps: ['fiz', 'fizeste', 'fez', 'fizemos', 'fizeram'],
             part: 'feito', fut: 'far', strong: true },
    dizer: { pres: ['digo', 'dizes', 'diz', 'dizemos', 'dizem'],
             pps: ['disse', 'disseste', 'disse', 'dissemos', 'disseram'],
             part: 'dito', fut: 'dir', strong: true },
    trazer:{ pres: ['trago', 'trazes', 'traz', 'trazemos', 'trazem'],
             pps: ['trouxe', 'trouxeste', 'trouxe', 'trouxemos', 'trouxeram'],
             fut: 'trar', strong: true },
    poder: { pres: ['posso', 'podes', 'pode', 'podemos', 'podem'],
             pps: ['pude', 'pudeste', 'pôde', 'pudemos', 'puderam'], strong: true },
    querer:{ pres: ['quero', 'queres', 'quer', 'queremos', 'querem'],
             pps: ['quis', 'quiseste', 'quis', 'quisemos', 'quiseram'],
             conj: ['queira', 'queiras', 'queira', 'queiramos', 'queiram'], strong: true },
    saber: { pres: ['sei', 'sabes', 'sabe', 'sabemos', 'sabem'],
             pps: ['soube', 'soubeste', 'soube', 'soubemos', 'souberam'],
             conj: ['saiba', 'saibas', 'saiba', 'saibamos', 'saibam'], strong: true },
    'pôr': { pres: ['ponho', 'pões', 'põe', 'pomos', 'põem'],
             pps: ['pus', 'puseste', 'pôs', 'pusemos', 'puseram'],
             imp: ['punha', 'punhas', 'punha', 'púnhamos', 'punham'],
             part: 'posto', ger: 'pondo', fut: 'por', strong: true },
    haver: { pres: ['hei', 'hás', 'há', 'havemos', 'hão'],
             pps: ['houve', 'houveste', 'houve', 'houvemos', 'houveram'],
             conj: ['haja', 'hajas', 'haja', 'hajamos', 'hajam'], strong: true },
    caber: { pres: ['caibo', 'cabes', 'cabe', 'cabemos', 'cabem'],
             pps: ['coube', 'coubeste', 'coube', 'coubemos', 'couberam'], strong: true },
    valer: { pres: ['valho', 'vales', 'vale', 'valemos', 'valem'] },
    rir:   { pres: ['rio', 'ris', 'ri', 'rimos', 'riem'],
             pps: ['ri', 'riste', 'riu', 'rimos', 'riram'] },
    ouvir: { pres: ['ouço', 'ouves', 'ouve', 'ouvimos', 'ouvem'] },
    pedir: { pres: ['peço', 'pedes', 'pede', 'pedimos', 'pedem'] },
    medir: { pres: ['meço', 'medes', 'mede', 'medimos', 'medem'] },
    dormir:{ pres: ['durmo', 'dormes', 'dorme', 'dormimos', 'dormem'] },
    vestir:{ pres: ['visto', 'vestes', 'veste', 'vestimos', 'vestem'] },
    seguir:{ pres: ['sigo', 'segues', 'segue', 'seguimos', 'seguem'] },
    sentir:{ pres: ['sinto', 'sentes', 'sente', 'sentimos', 'sentem'] },
    mentir:{ pres: ['minto', 'mentes', 'mente', 'mentimos', 'mentem'] },
    servir:{ pres: ['sirvo', 'serves', 'serve', 'servimos', 'servem'] },
    repetir:{ pres: ['repito', 'repetes', 'repete', 'repetimos', 'repetem'] },
    preferir:{ pres: ['prefiro', 'preferes', 'prefere', 'preferimos', 'preferem'] },
    sugerir:{ pres: ['sugiro', 'sugeres', 'sugere', 'sugerimos', 'sugerem'] },
    divertir:{ pres: ['divirto', 'divertes', 'diverte', 'divertimos', 'divertem'] },
    competir:{ pres: ['compito', 'competes', 'compete', 'competimos', 'competem'] },
    cobrir:{ pres: ['cubro', 'cobres', 'cobre', 'cobrimos', 'cobrem'], part: 'coberto' },
    descobrir:{ pres: ['descubro', 'descobres', 'descobre', 'descobrimos', 'descobrem'], part: 'descoberto' },
    abrir: { part: 'aberto' },
    escrever:{ part: 'escrito' },
    subir: { pres: ['subo', 'sobes', 'sobe', 'subimos', 'sobem'] },
    fugir: { pres: ['fujo', 'foges', 'foge', 'fugimos', 'fogem'] },
    sair:  { pres: ['saio', 'sais', 'sai', 'saímos', 'saem'] },
    cair:  { pres: ['caio', 'cais', 'cai', 'caímos', 'caem'] },
    trair: { pres: ['traio', 'trais', 'trai', 'traímos', 'traem'] },
    descrever:{ part: 'descrito' },
    construir:{ pres: ['construo', 'constróis', 'constrói', 'construímos', 'constroem'] },
    destruir: { pres: ['destruo', 'destróis', 'destrói', 'destruímos', 'destroem'] },
    pagar: { part: 'pago' },
    gastar:{ part: 'gasto' },
    ganhar:{ part: 'ganho' }
  };

  // Глаголы с двойным причастием: [для ter, для ser/estar]
  var DOUBLE_PART = {
    aceitar: ['aceitado', 'aceite'], entregar: ['entregado', 'entregue'],
    matar: ['matado', 'morto'], salvar: ['salvado', 'salvo'],
    prender: ['prendido', 'preso'], eleger: ['elegido', 'eleito'],
    expulsar: ['expulsado', 'expulso'], imprimir: ['imprimido', 'impresso'],
    limpar: ['limpado', 'limpo'], acender: ['acendido', 'aceso'],
    envolver: ['envolvido', 'envolto'], suspender: ['suspendido', 'suspenso'],
    morrer: ['morrido', 'morto']
  };

  // Производные глаголы: префикс + база. Формы базы получают префикс.
  var COMPOUNDS = {};
  [['ter', ['man', 'con', 'ob', 're', 'de', 'ater', 'abs', 'entre', 'sus']],
   ['vir', ['con', 'inter', 'pro', 'sobre', 'ad']],
   ['pôr', ['com', 're', 'pro', 'su', 'dis', 'ex', 'im', 'op', 'de', 'ante', 'sobre']],
   ['ver', ['pre', 're', 'ante']],
   ['fazer', ['des', 're', 'satis', 'contra']],
   ['dizer', ['contra', 'des', 'pre']],
   ['ler', ['re']],
   ['seguir', ['con', 'per']],
   ['trair', ['a', 'dis', 'con', 'sub', 'abs', 're']]].forEach(function (pair) {
    var base = pair[0];
    pair[1].forEach(function (pre) {
      var baseStem = base === 'pôr' ? 'por' : base;
      COMPOUNDS[pre + baseStem] = { base: base, prefix: pre };
    });
  });

  // Исключения: полные ряды форм, проверенные по таблице (перекрывают правила).
  // Источник: сверка движка с листом «Спряжения» (null = формы нет).
  var EXC = {
   "perder": {
    "cpres": [
     "perca",
     "percas",
     "perca",
     "percamos",
     "percam"
    ],
    "impa": [
     null,
     "perde",
     "perca",
     "percamos",
     "percam"
    ],
    "impn": [
     null,
     "não percas",
     "não perca",
     "não percamos",
     "não percam"
    ],
    "pres": [
     "perco",
     "perdes",
     "perde",
     "perdemos",
     "perdem"
    ]
   },
   "colorir": {
    "cpres": [
     null,
     null,
     null,
     null,
     null
    ],
    "impa": [
     null,
     "colore",
     null,
     null,
     null
    ],
    "impn": [
     null,
     null,
     null,
     null,
     null
    ],
    "pres": [
     null,
     "colores",
     "colore",
     "colorimos",
     "colorem"
    ]
   },
   "doer": {
    "cfut": [
     null,
     null,
     "doer",
     null,
     "doerem"
    ],
    "cimp": [
     null,
     null,
     "doesse",
     null,
     "doessem"
    ],
    "cmqpc": [
     null,
     null,
     "tivesse doído",
     null,
     "tivessem doído"
    ],
    "cond": [
     null,
     null,
     "doeria",
     null,
     "doeriam"
    ],
    "cppc": [
     null,
     null,
     "tenha doído",
     null,
     "tenham doído"
    ],
    "cpres": [
     null,
     null,
     "doa",
     null,
     "doam"
    ],
    "fut": [
     null,
     null,
     "doerá",
     null,
     "doerão"
    ],
    "imp": [
     null,
     null,
     "doía",
     null,
     "doíam"
    ],
    "impa": [
     null,
     null,
     null,
     null,
     null
    ],
    "impn": [
     null,
     null,
     null,
     null,
     null
    ],
    "infp": [
     null,
     null,
     "doer",
     null,
     "doerem"
    ],
    "mqpc": [
     null,
     null,
     "tinha doído",
     null,
     "tinham doído"
    ],
    "ppc": [
     null,
     null,
     "tem doído",
     null,
     "têm doído"
    ],
    "pps": [
     null,
     null,
     "doeu",
     null,
     "doeram"
    ],
    "pres": [
     null,
     null,
     "dói",
     null,
     "doem"
    ]
   },
   "despir": {
    "cpres": [
     "dispa",
     "dispas",
     "dispa",
     "dispamos",
     "dispam"
    ],
    "impa": [
     null,
     "despe",
     "dispa",
     "dispamos",
     "dispam"
    ],
    "impn": [
     null,
     "não dispas",
     "não dispa",
     "não dispamos",
     "não dispam"
    ],
    "pres": [
     "dispo",
     "despes",
     "despe",
     "despimos",
     "despem"
    ]
   },
   "impedir": {
    "cpres": [
     "impeça",
     "impeças",
     "impeça",
     "impeçamos",
     "impeçam"
    ],
    "impa": [
     null,
     "impede",
     "impeça",
     "impeçamos",
     "impeçam"
    ],
    "impn": [
     null,
     "não impeças",
     "não impeça",
     "não impeçamos",
     "não impeçam"
    ],
    "pres": [
     "impeço",
     "impedes",
     "impede",
     "impedimos",
     "impedem"
    ]
   },
   "produzir": {
    "impa": [
     null,
     "produz",
     "produza",
     "produzamos",
     "produzam"
    ],
    "pres": [
     "produzo",
     "produzes",
     "produz",
     "produzimos",
     "produzem"
    ]
   },
   "reduzir": {
    "impa": [
     null,
     "reduz",
     "reduza",
     "reduzamos",
     "reduzam"
    ],
    "pres": [
     "reduzo",
     "reduzes",
     "reduz",
     "reduzimos",
     "reduzem"
    ]
   },
   "referir": {
    "cpres": [
     "refira",
     "refiras",
     "refira",
     "refiramos",
     "refiram"
    ],
    "impa": [
     null,
     "refere",
     "refira",
     "refiramos",
     "refiram"
    ],
    "impn": [
     null,
     "não refiras",
     "não refira",
     "não refiramos",
     "não refiram"
    ],
    "pres": [
     "refiro",
     "referes",
     "refere",
     "referimos",
     "referem"
    ]
   },
   "traduzir": {
    "impa": [
     null,
     "traduz",
     "traduza",
     "traduzamos",
     "traduzam"
    ],
    "pres": [
     "traduzo",
     "traduzes",
     "traduz",
     "traduzimos",
     "traduzem"
    ]
   },
   "perseguir": {
    "cmqpc": [
     "tivesse perseguido",
     "tivesses perseguido",
     "tivesse perseguido",
     "tivéssemos perseguido",
     "tivessem perseguido"
    ],
    "cppc": [
     "tenha perseguido",
     "tenhas perseguido",
     "tenha perseguido",
     "tenhamos perseguido",
     "tenham perseguido"
    ],
    "imp": [
     "perseguia",
     "perseguias",
     "perseguia",
     "perseguíamos",
     "perseguiam"
    ],
    "mqpc": [
     "tinha perseguido",
     "tinhas perseguido",
     "tinha perseguido",
     "tínhamos perseguido",
     "tinham perseguido"
    ],
    "part": [
     "perseguido",
     null,
     null,
     null,
     null
    ],
    "ppc": [
     "tenho perseguido",
     "tens perseguido",
     "tem perseguido",
     "temos perseguido",
     "têm perseguido"
    ]
   },
   "reescrever": {
    "cmqpc": [
     "tivesse reescrito",
     "tivesses reescrito",
     "tivesse reescrito",
     "tivéssemos reescrito",
     "tivessem reescrito"
    ],
    "cppc": [
     "tenha reescrito",
     "tenhas reescrito",
     "tenha reescrito",
     "tenhamos reescrito",
     "tenham reescrito"
    ],
    "mqpc": [
     "tinha reescrito",
     "tinhas reescrito",
     "tinha reescrito",
     "tínhamos reescrito",
     "tinham reescrito"
    ],
    "part": [
     "reescrito",
     null,
     null,
     null,
     null
    ],
    "ppc": [
     "tenho reescrito",
     "tens reescrito",
     "tem reescrito",
     "temos reescrito",
     "têm reescrito"
    ]
   },
   "demolir": {
    "cpres": [
     null,
     null,
     null,
     null,
     null
    ],
    "impa": [
     null,
     "demole",
     null,
     null,
     null
    ],
    "impn": [
     null,
     null,
     null,
     null,
     null
    ],
    "pres": [
     null,
     "demoles",
     "demole",
     "demolimos",
     "demolem"
    ]
   },
   "reunir": {
    "cpres": [
     "reúna",
     "reúnas",
     "reúna",
     "reunamos",
     "reúnam"
    ],
    "impa": [
     null,
     "reúne",
     "reúna",
     "reunamos",
     "reúnam"
    ],
    "impn": [
     null,
     "não reúnas",
     "não reúna",
     "não reunamos",
     "não reúnam"
    ],
    "pres": [
     "reúno",
     "reúnes",
     "reúne",
     "reunimos",
     "reúnem"
    ]
   },
   "despedir": {
    "cpres": [
     "despeça",
     "despeças",
     "despeça",
     "despeçamos",
     "despeçam"
    ],
    "impa": [
     null,
     "despede",
     "despeça",
     "despeçamos",
     "despeçam"
    ],
    "impn": [
     null,
     "não despeças",
     "não despeça",
     "não despeçamos",
     "não despeçam"
    ],
    "pres": [
     "despeço",
     "despedes",
     "despede",
     "despedimos",
     "despedem"
    ]
   },
   "interferir": {
    "cpres": [
     "interfira",
     "interfiras",
     "interfira",
     "interfiramos",
     "interfiram"
    ],
    "impa": [
     null,
     "interfere",
     "interfira",
     "interfiramos",
     "interfiram"
    ],
    "impn": [
     null,
     "não interfiras",
     "não interfira",
     "não interfiramos",
     "não interfiram"
    ],
    "pres": [
     "interfiro",
     "interferes",
     "interfere",
     "interferimos",
     "interferem"
    ]
   },
   "enxaguar": {
    "cpres": [
     "enxágue",
     "enxágues",
     "enxágue",
     "enxaguemos",
     "enxáguem"
    ],
    "impa": [
     null,
     "enxágua",
     "enxágue",
     "enxaguemos",
     "enxáguem"
    ],
    "impn": [
     null,
     "não enxágues",
     "não enxágue",
     "não enxaguemos",
     "não enxáguem"
    ],
    "pres": [
     "enxáguo",
     "enxáguas",
     "enxágua",
     "enxaguamos",
     "enxaguam"
    ]
   },
   "ingerir": {
    "cpres": [
     "ingira",
     "ingiras",
     "ingira",
     "ingiramos",
     "ingiram"
    ],
    "impa": [
     null,
     "ingere",
     "ingira",
     "ingiramos",
     "ingiram"
    ],
    "impn": [
     null,
     "não ingiras",
     "não ingira",
     "não ingiramos",
     "não ingiram"
    ],
    "pres": [
     "ingiro",
     "ingeres",
     "ingere",
     "ingerimos",
     "ingerem"
    ]
   },
   "seduzir": {
    "impa": [
     null,
     "seduz",
     "seduza",
     "seduzamos",
     "seduzam"
    ],
    "pres": [
     "seduzo",
     "seduzes",
     "seduz",
     "seduzimos",
     "seduzem"
    ]
   },
   "reproduzir": {
    "impa": [
     null,
     "reproduz",
     "reproduza",
     "reproduzamos",
     "reproduzam"
    ],
    "pres": [
     "reproduzo",
     "reproduzes",
     "reproduz",
     "reproduzimos",
     "reproduzem"
    ]
   },
   "opor": {
    "cfut": [
     "opuser",
     "opuseres",
     "opuser",
     "opusermos",
     "opuserem"
    ],
    "cimp": [
     "opusesse",
     "opusesses",
     "opusesse",
     "opuséssemos",
     "opusessem"
    ],
    "cmqpc": [
     "tivesse oposto",
     "tivesses oposto",
     "tivesse oposto",
     "tivéssemos oposto",
     "tivessem oposto"
    ],
    "cppc": [
     "tenha oposto",
     "tenhas oposto",
     "tenha oposto",
     "tenhamos oposto",
     "tenham oposto"
    ],
    "cpres": [
     "oponha",
     "oponhas",
     "oponha",
     "oponhamos",
     "oponham"
    ],
    "ger": [
     "opondo",
     null,
     null,
     null,
     null
    ],
    "imp": [
     "opunha",
     "opunhas",
     "opunha",
     "opúnhamos",
     "opunham"
    ],
    "impa": [
     null,
     "opõe",
     "oponha",
     "oponhamos",
     "oponham"
    ],
    "impn": [
     null,
     "não oponhas",
     "não oponha",
     "não oponhamos",
     "não oponham"
    ],
    "mqpc": [
     "tinha oposto",
     "tinhas oposto",
     "tinha oposto",
     "tínhamos oposto",
     "tinham oposto"
    ],
    "part": [
     "oposto",
     null,
     null,
     null,
     null
    ],
    "ppc": [
     "tenho oposto",
     "tens oposto",
     "tem oposto",
     "temos oposto",
     "têm oposto"
    ],
    "pps": [
     "opus",
     "opuseste",
     "opôs",
     "opusemos",
     "opuseram"
    ],
    "pres": [
     "oponho",
     "opões",
     "opõe",
     "opomos",
     "opõem"
    ]
   },
   "decompor": {
    "cfut": [
     "decompuser",
     "decompuseres",
     "decompuser",
     "decompusermos",
     "decompuserem"
    ],
    "cimp": [
     "decompusesse",
     "decompusesses",
     "decompusesse",
     "decompuséssemos",
     "decompusessem"
    ],
    "cmqpc": [
     "tivesse decomposto",
     "tivesses decomposto",
     "tivesse decomposto",
     "tivéssemos decomposto",
     "tivessem decomposto"
    ],
    "cppc": [
     "tenha decomposto",
     "tenhas decomposto",
     "tenha decomposto",
     "tenhamos decomposto",
     "tenham decomposto"
    ],
    "cpres": [
     "decomponha",
     "decomponhas",
     "decomponha",
     "decomponhamos",
     "decomponham"
    ],
    "ger": [
     "decompondo",
     null,
     null,
     null,
     null
    ],
    "imp": [
     "decompunha",
     "decompunhas",
     "decompunha",
     "decompúnhamos",
     "decompunham"
    ],
    "impa": [
     null,
     "decompõe",
     "decomponha",
     "decomponhamos",
     "decomponham"
    ],
    "impn": [
     null,
     "não decomponhas",
     "não decomponha",
     "não decomponhamos",
     "não decomponham"
    ],
    "mqpc": [
     "tinha decomposto",
     "tinhas decomposto",
     "tinha decomposto",
     "tínhamos decomposto",
     "tinham decomposto"
    ],
    "part": [
     "decomposto",
     null,
     null,
     null,
     null
    ],
    "ppc": [
     "tenho decomposto",
     "tens decomposto",
     "tem decomposto",
     "temos decomposto",
     "têm decomposto"
    ],
    "pps": [
     "decompus",
     "decompuseste",
     "decompôs",
     "decompusemos",
     "decompuseram"
    ],
    "pres": [
     "decomponho",
     "decompões",
     "decompõe",
     "decompomos",
     "decompõem"
    ]
   },
   "distinguir": {
    "cmqpc": [
     "tivesse distinguido",
     "tivesses distinguido",
     "tivesse distinguido",
     "tivéssemos distinguido",
     "tivessem distinguido"
    ],
    "cppc": [
     "tenha distinguido",
     "tenhas distinguido",
     "tenha distinguido",
     "tenhamos distinguido",
     "tenham distinguido"
    ],
    "imp": [
     "distinguia",
     "distinguias",
     "distinguia",
     "distinguíamos",
     "distinguiam"
    ],
    "mqpc": [
     "tinha distinguido",
     "tinhas distinguido",
     "tinha distinguido",
     "tínhamos distinguido",
     "tinham distinguido"
    ],
    "part": [
     "distinguido",
     null,
     null,
     null,
     null
    ],
    "ppc": [
     "tenho distinguido",
     "tens distinguido",
     "tem distinguido",
     "temos distinguido",
     "têm distinguido"
    ]
   },
   "ansiar": {
    "cpres": [
     "anseie",
     "anseies",
     "anseie",
     "ansiemos",
     "anseiem"
    ],
    "impa": [
     null,
     "anseia",
     "anseie",
     "ansiemos",
     "anseiem"
    ],
    "impn": [
     null,
     "não anseies",
     "não anseie",
     "não ansiemos",
     "não anseiem"
    ],
    "pres": [
     "anseio",
     "anseias",
     "anseia",
     "ansiamos",
     "anseiam"
    ]
   },
   "incendiar": {
    "cpres": [
     "incendeie",
     "incendeies",
     "incendeie",
     "incendiemos",
     "incendeiem"
    ],
    "impa": [
     null,
     "incendeia",
     "incendeie",
     "incendiemos",
     "incendeiem"
    ],
    "impn": [
     null,
     "não incendeies",
     "não incendeie",
     "não incendiemos",
     "não incendeiem"
    ],
    "pres": [
     "incendeio",
     "incendeias",
     "incendeia",
     "incendiamos",
     "incendeiam"
    ]
   },
   "requerer": {
    "cpres": [
     "requeira",
     "requeiras",
     "requeira",
     "requeiramos",
     "requeiram"
    ],
    "impa": [
     null,
     "requer",
     "requeira",
     "requeiramos",
     "requeiram"
    ],
    "impn": [
     null,
     "não requeiras",
     "não requeira",
     "não requeiramos",
     "não requeiram"
    ],
    "pres": [
     "requeiro",
     "requeres",
     "requer",
     "requeremos",
     "requerem"
    ]
   },
   "prevenir": {
    "cpres": [
     "previna",
     "previnas",
     "previna",
     "previnamos",
     "previnam"
    ],
    "impa": [
     null,
     "previne",
     "previna",
     "previnamos",
     "previnam"
    ],
    "impn": [
     null,
     "não previnas",
     "não previna",
     "não previnamos",
     "não previnam"
    ],
    "pres": [
     "previno",
     "prevines",
     "previne",
     "prevenimos",
     "previnem"
    ]
   },
   "prosseguir": {
    "cpres": [
     "prossiga",
     "prossigas",
     "prossiga",
     "prossigamos",
     "prossigam"
    ],
    "impa": [
     null,
     "prossegue",
     "prossiga",
     "prossigamos",
     "prossigam"
    ],
    "impn": [
     null,
     "não prossigas",
     "não prossiga",
     "não prossigamos",
     "não prossigam"
    ],
    "pres": [
     "prossigo",
     "prossegues",
     "prossegue",
     "prosseguimos",
     "prosseguem"
    ]
   },
   "conduzir": {
    "impa": [
     null,
     "conduz",
     "conduza",
     "conduzamos",
     "conduzam"
    ],
    "pres": [
     "conduzo",
     "conduzes",
     "conduz",
     "conduzimos",
     "conduzem"
    ]
   }
  };

  // ---------- вспомогательные ----------
  function group(inf) {
    if (/ôr$/.test(inf)) return 'or';
    return inf.slice(-2);
  }
  function stem(inf) {
    if (/ôr$/.test(inf)) return inf.slice(0, -2);
    return inf.slice(0, -2);
  }
  function endsVowel(s) { return s.length > 0 && VOWELS.indexOf(s[s.length - 1]) >= 0; }
  function accentLast(s) {
    // ставит ударение на последнюю гласную основы перед -ssemos / -ramos
    var map = { a: 'á', e: 'ê', i: 'í', o: 'ô', u: 'ú' };
    var c = s[s.length - 1];
    return map[c] ? s.slice(0, -1) + map[c] : s;
  }
  function addPrefix(prefix, arr) {
    return arr.map(function (f) { return prefix + f; });
  }

  // ---------- разбор глагола: (irr, prefix) ----------
  function resolve(inf) {
    var key = inf;
    var prefix = '';
    var base = null;
    if (IRR[inf]) { base = IRR[inf]; key = inf; }
    else if (COMPOUNDS[inf]) {
      var c = COMPOUNDS[inf];
      base = IRR[c.base]; key = c.base; prefix = c.prefix;
    }
    return { irr: base, key: key, prefix: prefix, inf: inf };
  }

  function strongOf(inf) {
    var r = resolve(inf);
    return !!(r.irr && r.irr.strong);
  }

  // ---------- Presente ----------
  function presente(inf) {
    var r = resolve(inf);
    if (r.irr && r.irr.pres) {
      var forms = addPrefix(r.prefix, r.irr.pres);
      if (r.prefix && r.key === 'ter') { forms[1] = forms[1].replace(/tens$/, 'téns'); forms[2] = forms[2].replace(/tem$/, 'tém'); }
      if (r.prefix && r.key === 'vir') { forms[1] = forms[1].replace(/vens$/, 'véns'); forms[2] = forms[2].replace(/vem$/, 'vém'); }
      return forms;
    }
    var g = group(inf), s = stem(inf);
    if (/ear$/.test(inf)) {
      return [s + 'io', s + 'ias', s + 'ia', s + 'amos', s + 'iam'];
    }
    if (g === 'ar') return [s + 'o', s + 'as', s + 'a', s + 'amos', s + 'am'];
    if (/uir$/.test(inf) && !/(gu|qu)ir$/.test(inf)) {
      return [s + 'o', s + 'is', s + 'i', s + 'ímos', s + 'em'];
    }
    var eu = s;
    if (g === 'er' || g === 'ir') {
      if (/gu$/.test(s)) eu = s.slice(0, -1);
      else if (/g$/.test(s)) eu = s.slice(0, -1) + 'j';
      else if (/c$/.test(s)) eu = s.slice(0, -1) + 'ç';
    }
    if (g === 'er') return [eu + 'o', s + 'es', s + 'e', s + 'emos', s + 'em'];
    return [eu + 'o', s + 'es', s + 'e', s + 'imos', s + 'em'];
  }

  // ---------- Pretérito Perfeito Simples ----------
  function pps(inf) {
    var r = resolve(inf);
    if (r.irr && r.irr.pps) return addPrefix(r.prefix, r.irr.pps);
    var g = group(inf), s = stem(inf);
    if (g === 'ar') {
      var eu = s + 'ei';
      if (/c$/.test(s)) eu = s.slice(0, -1) + 'quei';
      else if (/g$/.test(s)) eu = s + 'uei';
      else if (/ç$/.test(s)) eu = s.slice(0, -1) + 'cei';
      return [eu, s + 'aste', s + 'ou', s + 'ámos', s + 'aram'];
    }
    if (/(a|u)ir$/.test(inf) && !/(gu|qu)ir$/.test(inf)) {
      return [s + 'í', s + 'íste', s + 'iu', s + 'ímos', s + 'íram'];
    }
    if (g === 'er') return [s + 'i', s + 'este', s + 'eu', s + 'emos', s + 'eram'];
    return [s + 'i', s + 'iste', s + 'iu', s + 'imos', s + 'iram'];
  }

  // ---------- Imperfeito ----------
  function imperfeito(inf) {
    var r = resolve(inf);
    if (r.irr && r.irr.imp) return addPrefix(r.prefix, r.irr.imp);
    var g = group(inf), s = stem(inf);
    if (g === 'ar') return [s + 'ava', s + 'avas', s + 'ava', s + 'ávamos', s + 'avam'];
    if (endsVowel(s)) return [s + 'ía', s + 'ías', s + 'ía', s + 'íamos', s + 'íam'];
    return [s + 'ia', s + 'ias', s + 'ia', s + 'íamos', s + 'iam'];
  }

  // ---------- Particípio / Gerúndio ----------
  var EXC_PART = {perseguir:'perseguido', reescrever:'reescrito', opor:'oposto', decompor:'decomposto', distinguir:'distinguido'};
  var EXC_GER = {opor:'opondo', decompor:'decompondo'};
  function participio(inf, forSer) {
    if (EXC_PART[inf]) return EXC_PART[inf];
    if (DOUBLE_PART[inf]) return DOUBLE_PART[inf][forSer ? 1 : 0];
    var r = resolve(inf);
    if (r.irr && r.irr.part) return r.prefix + r.irr.part;
    var g = group(inf), s = stem(inf);
    if (g === 'ar') return s + 'ado';
    if (endsVowel(s)) return s + 'ído';
    return s + 'ido';
  }
  function gerundio(inf) {
    if (EXC_GER[inf]) return EXC_GER[inf];
    var r = resolve(inf);
    if (r.irr && r.irr.ger) return r.prefix + r.irr.ger;
    var g = group(inf), s = stem(inf);
    if (g === 'ar') return s + 'ando';
    if (g === 'er') return s + 'endo';
    return s + 'indo';
  }

  // ---------- Futuro / Condicional ----------
  function futStem(inf) {
    var r = resolve(inf);
    if (r.irr && r.irr.fut) return r.prefix + r.irr.fut;
    return inf;
  }
  function futuro(inf) {
    var f = futStem(inf);
    return [f + 'ei', f + 'ás', f + 'á', f + 'emos', f + 'ão'];
  }
  function condicional(inf) {
    var f = futStem(inf);
    return [f + 'ia', f + 'ias', f + 'ia', f + 'íamos', f + 'iam'];
  }

  // ---------- Conjuntivo ----------
  function conjPresente(inf) {
    var r = resolve(inf);
    if (r.irr && r.irr.conj) return addPrefix(r.prefix, r.irr.conj);
    var eu = presente(inf)[0];
    var g = group(inf);
    var s = eu.replace(/o$/, '');
    if (g === 'ar') {
      if (/ear$/.test(inf)) {
        var t = inf.slice(0, -2);
        return [s + 'e', s + 'es', s + 'e', t + 'emos', s + 'em'];
      }
      var s2 = s;
      if (/c$/.test(s)) s2 = s.slice(0, -1) + 'qu';
      else if (/g$/.test(s)) s2 = s + 'u';
      else if (/ç$/.test(s)) s2 = s.slice(0, -1) + 'c';
      return [s2 + 'e', s2 + 'es', s2 + 'e', s2 + 'emos', s2 + 'em'];
    }
    return [s + 'a', s + 'as', s + 'a', s + 'amos', s + 'am'];
  }
  function conjImperfeito(inf) {
    var eles = pps(inf)[4];
    var st = eles.replace(/ram$/, '');
    var nos = st;
    if (!/[áéíóúâêô]$/.test(st)) {
      if (/e$/.test(st) && strongOf(inf)) nos = st.slice(0, -1) + 'é';
      else nos = accentLast(st);
    }
    return [st + 'sse', st + 'sses', st + 'sse', nos + 'ssemos', st + 'ssem'];
  }
  function personalInf(inf, base) {
    // eu/ele: сам инфинитив; остальные лица: основа без циркумфлекса (pôr → por)
    var b = base || inf;
    var bb = /ôr$/.test(b) ? b.slice(0, -2) + 'or' : b;
    var tuForm = bb + 'es', elesForm = bb + 'em';
    if (/(a|u)ir$/.test(bb) && !/(gu|qu)ir$/.test(bb)) {
      tuForm = bb.slice(0, -2) + 'íres';
      elesForm = bb.slice(0, -2) + 'írem';
    }
    return [b, tuForm, b, bb + 'mos', elesForm];
  }
  function conjFuturo(inf) {
    var eles = pps(inf)[4];
    var b = eles.replace(/am$/, '');
    if (/(a|u)ír$/.test(b)) b = b.slice(0, -2) + 'ir';
    return personalInf(inf, b);
  }

  // ---------- Составные времена ----------
  function composto(auxForms, inf) {
    var p = participio(inf, false);
    return auxForms.map(function (a) { return a + ' ' + p; });
  }

  // ---------- Императив ----------
  function imperAfirm(inf) {
    var r = resolve(inf);
    var pr = presente(inf), cj = conjPresente(inf);
    var tu = (r.irr && r.irr.imper && !r.prefix) ? r.irr.imper : pr[2];
    return [null, tu, cj[2], cj[3], cj[4]];
  }
  function imperNeg(inf) {
    var cj = conjPresente(inf);
    return [null, 'não ' + cj[1], 'não ' + cj[2], 'não ' + cj[3], 'não ' + cj[4]];
  }

  // ---------- публичный API ----------
  var TENSES = {
    pres:     { id: 'pres', name: 'Presente', mood: 'ind', persons: 5, fn: presente },
    pps:      { id: 'pps', name: 'Pretérito Perfeito Simples', mood: 'ind', persons: 5, fn: pps },
    imp:      { id: 'imp', name: 'Pretérito Imperfeito', mood: 'ind', persons: 5, fn: imperfeito },
    ppc:      { id: 'ppc', name: 'Pretérito Perfeito Composto', mood: 'ind', persons: 5,
                fn: function (v) { return composto(presente('ter'), v); } },
    mqpc:     { id: 'mqpc', name: 'Pretérito Mais-que-Perfeito Composto', mood: 'ind', persons: 5,
                fn: function (v) { return composto(imperfeito('ter'), v); } },
    prog:     { id: 'prog', name: 'Estar a + infinitivo', mood: 'ind', persons: 5,
                fn: function (v) { return presente('estar').map(function (a) { return a + ' a ' + v; }); } },
    fprox:    { id: 'fprox', name: 'Ir + infinitivo', mood: 'ind', persons: 5,
                fn: function (v) { return presente('ir').map(function (a) { return a + ' ' + v; }); } },
    fut:      { id: 'fut', name: 'Futuro Simples', mood: 'ind', persons: 5, fn: futuro },
    cond:     { id: 'cond', name: 'Condicional', mood: 'ind', persons: 5, fn: condicional },
    cpres:    { id: 'cpres', name: 'Presente do Conjuntivo', mood: 'conj', persons: 5, fn: conjPresente },
    cimp:     { id: 'cimp', name: 'Imperfeito do Conjuntivo', mood: 'conj', persons: 5, fn: conjImperfeito },
    cfut:     { id: 'cfut', name: 'Futuro do Conjuntivo', mood: 'conj', persons: 5, fn: conjFuturo },
    cppc:     { id: 'cppc', name: 'Pretérito Perfeito Composto do Conjuntivo', mood: 'conj', persons: 5,
                fn: function (v) { return composto(conjPresente('ter'), v); } },
    cmqpc:    { id: 'cmqpc', name: 'Mais-que-Perfeito Composto do Conjuntivo', mood: 'conj', persons: 5,
                fn: function (v) { return composto(conjImperfeito('ter'), v); } },
    impa:     { id: 'impa', name: 'Imperativo afirmativo', mood: 'imp', persons: 5, fn: imperAfirm },
    impn:     { id: 'impn', name: 'Imperativo negativo', mood: 'imp', persons: 5, fn: imperNeg },
    infp:     { id: 'infp', name: 'Infinitivo Pessoal', mood: 'nom', persons: 5,
                fn: function (v) { return personalInf(v); } },
    ger:      { id: 'ger', name: 'Gerúndio', mood: 'nom', persons: 0, single: true,
                fn: function (v) { return [gerundio(v)]; } },
    part:     { id: 'part', name: 'Particípio passado', mood: 'nom', persons: 0, single: true,
                fn: function (v) { return [participio(v, false)]; } }
  };

  function conjugate(inf, tenseId) {
    if (EXC[inf] && EXC[inf][tenseId]) return EXC[inf][tenseId].slice();
    return TENSES[tenseId].fn(inf);
  }

  // Короткое объяснение, как получена форма (по-русски, для разбора ошибок).
  function explain(inf, t) {
    if (EXC[inf] && EXC[inf][t]) return 'Форма особая, её нужно знать: ' + EXC[inf][t].filter(Boolean).join(', ');
    var r = resolve(inf);
    var irr = !!r.irr;
    var g = group(inf);
    var eu = presente(inf)[0];
    var ppsEles = pps(inf)[4];
    switch (t) {
      case 'pres':
        return irr || /ear$|uir$|air$/.test(inf)
          ? 'Presente: форма особая, её нужно знать: ' + presente(inf).join(', ')
          : 'Presente: основа ' + stem(inf) + '- + окончания (-o, -' + (g === 'ar' ? 'as, -a, -amos, -am' : 'es, -e, -' + (g === 'er' ? 'emos' : 'imos') + ', -em') + ').';
      case 'pps':
        return irr && r.irr.pps
          ? 'PPS: неправильный глагол, весь ряд: ' + pps(inf).join(', ')
          : 'PPS: основа ' + stem(inf) + '- + окончания (tu -ste, eles -ram). Ряд: ' + pps(inf).join(', ');
      case 'imp':
        return 'Imperfeito: ' + (g === 'ar' ? '-ava, -avas, -ava, -ávamos, -avam' : '-ia, -ias, -ia, -íamos, -iam') + (irr && r.irr.imp ? ' (у этого глагола особая основа)' : '') + '. Ряд: ' + imperfeito(inf).join(', ');
      case 'fut':
        return futStem(inf) !== inf ? 'Futuro: у этого глагола инфинитив сокращается (' + inf + ' → ' + futStem(inf) + '-), и к основе добавляются -ei, -ás, -á, -emos, -ão.' : 'Futuro: целый инфинитив + -ei, -ás, -á, -emos, -ão.';
      case 'cond':
        return futStem(inf) !== inf ? 'Condicional: у этого глагола инфинитив сокращается (' + inf + ' → ' + futStem(inf) + '-), и к основе добавляются -ia, -ias, -ia, -íamos, -iam.' : 'Condicional: целый инфинитив + -ia, -ias, -ia, -íamos, -iam.';
      case 'cpres':
        return r.irr && r.irr.conj
          ? 'Presente do Conjuntivo: особые формы: ' + conjPresente(inf).join(', ')
          : 'Presente do Conjuntivo: форма eu в presente (' + eu + ') без -o, затем «противоположная» гласная: ' + (g === 'ar' ? '-e, -es, -e, -emos, -em' : '-a, -as, -a, -amos, -am') + '.';
      case 'cimp':
        return 'Imperfeito do Conjuntivo: PPS eles (' + ppsEles + ') без -ram = ' + ppsEles.replace(/ram$/, '') + '-, плюс -sse, -sses, -sse, -ssemos, -ssem. В nós ударение на гласной перед -ssemos.';
      case 'cfut':
        return 'Futuro do Conjuntivo: PPS eles (' + ppsEles + ') без -am = ' + ppsEles.replace(/am$/, '') + ', плюс (-), -es, (-), -mos, -em.';
      case 'prog':
        return 'Estar a + infinitivo: estar в presente (estou, estás, está, estamos, estão) + a + инфинитив без изменений. Действие идёт прямо сейчас.';
      case 'fprox':
        return 'Ir + infinitivo: ir в presente (vou, vais, vai, vamos, vão) + инфинитив без изменений. Ближайшее будущее, в речи чаще, чем Futuro.';
      case 'ppc':
        return 'PPC: ter в presente (tenho, tens, tem, temos, têm) + particípio (' + participio(inf, false) + ').';
      case 'mqpc':
        return 'Mais-que-Perfeito Composto: ter в imperfeito (tinha, tinhas, tinha, tínhamos, tinham) + particípio (' + participio(inf, false) + ').';
      case 'cppc':
        return 'PPCC: ter в Presente do Conjuntivo (tenha, tenhas, tenha, tenhamos, tenham) + particípio (' + participio(inf, false) + ').';
      case 'cmqpc':
        return 'Mais-que-Perfeito do Conjuntivo: ter в Imperfeito do Conjuntivo (tivesse, tivesses, tivesse, tivéssemos, tivessem) + particípio (' + participio(inf, false) + ').';
      case 'impa':
        return 'Imperativo afirmativo: tu = форма ele из presente; você, nós, vocês = Presente do Conjuntivo.';
      case 'impn':
        return 'Imperativo negativo: não + Presente do Conjuntivo для всех лиц (não faças).';
      case 'infp':
        return 'Infinitivo Pessoal: инфинитив + (-), -es, (-), -mos, -em.';
      case 'ger':
        return 'Gerúndio: инфинитив без -r + -ndo' + (r.irr && r.irr.ger ? ' (особая форма)' : '') + '.';
      case 'part':
        return DOUBLE_PART[inf]
          ? 'Particípio: две формы. С ter: ' + DOUBLE_PART[inf][0] + '; с ser/estar/ficar: ' + DOUBLE_PART[inf][1] + '.'
          : 'Particípio: -ar → -ado, -er/-ir → -ido' + (irr && r.irr.part ? ' (у этого глагола особая форма)' : '') + '.';
    }
    return '';
  }

  var api = {
    PERSONS: PERSONS, TENSES: TENSES, conjugate: conjugate, explain: explain,
    participio: participio, gerundio: gerundio, doublePart: DOUBLE_PART,
    resolve: resolve
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PTEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
