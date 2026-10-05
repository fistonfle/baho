// Static Kinyarwanda health content used by the learner screens.
// It ships with the app so exercises, checks and a basic NCD module work offline;
// diseases added by staff come from the API.
// Wording should be reviewed by a health professional before field testing.

import type { Category, Curriculum, Interest, Lesson } from '../types';

// Built-in categories, used until the API's list (which staff can extend) has loaded.
export const defaultCategories: Category[] = [
  { id: 1, name: 'Imirire', slug: 'nutrition' },
  { id: 2, name: 'Umuvuduko w\'amaraso', slug: 'blood-pressure' },
  { id: 3, name: 'Diyabete', slug: 'diabetes' },
  { id: 4, name: 'Ubuzima bw\'umutima', slug: 'heart-health' },
  { id: 5, name: 'Kanseri', slug: 'cancer' },
  { id: 6, name: 'Imyitozo ngororamubiri', slug: 'exercise' }
];

export type NcdTopic = {
  id: string;
  title: string;
  category: Interest;
  icon: string;
  description: string;
  riskFactors: string[];
  warningSigns: string[];
  prevention: string[];
};

export const ncdTopics: NcdTopic[] = [
  {
    id: 'blood-pressure',
    title: 'Umuvuduko w\'amaraso ukabije',
    category: 'Umuvuduko w\'amaraso',
    icon: '❤',
    description: 'Umuvuduko w\'amaraso ukabije ni igihe amaraso asunika imitsi ku ngufu nyinshi kurusha uko bikwiye. Akenshi nta bimenyetso ugaragaza, ni yo mpamvu kwipimisha buri gihe ari ingenzi.',
    riskFactors: ['Kurya umunyu mwinshi', 'Kunywa itabi n\'inzoga nyinshi', 'Kudakora imyitozo ngororamubiri', 'Umubyibuho ukabije', 'Kugira abo mu muryango bayirwaye'],
    warningSigns: ['Kuribwa umutwe cyane', 'Kuzungera', 'Kubona ibikezikezi', 'Umutima utera vuba bidasanzwe'],
    prevention: ['Gabanya umunyu mu biryo', 'Kora imyitozo iminota 30 ku munsi', 'Rya imboga n\'imbuto buri munsi', 'Irinde itabi n\'inzoga', 'Ipimishe umuvuduko w\'amaraso nibura rimwe mu mwaka']
  },
  {
    id: 'diabetes',
    title: 'Diyabete',
    category: 'Diyabete',
    icon: '◉',
    description: 'Diyabete ni indwara ituma isukari mu maraso izamuka cyane kuko umubiri udakoresha neza insuline. Iyo idakurikiranwe, ishobora kwangiza amaso, impyiko, imitsi n\'umutima.',
    riskFactors: ['Umubyibuho ukabije', 'Kudakora imyitozo', 'Kunywa ibinyobwa birimo isukari nyinshi', 'Kugira abo mu muryango bayirwaye', 'Kurenza imyaka 40'],
    warningSigns: ['Inyota nyinshi', 'Kunyara kenshi', 'Gucika intege', 'Kunanuka nta mpamvu', 'Ibisebe bitinda gukira'],
    prevention: ['Gabanya isukari n\'ibinyobwa biryohereye', 'Rya ibinyampeke byuzuye n\'imboga', 'Kora imyitozo buri munsi', 'Gumana ibiro bikwiye', 'Ipimishe isukari mu maraso']
  },
  {
    id: 'heart-health',
    title: 'Indwara z\'umutima',
    category: 'Ubuzima bw\'umutima',
    icon: '♥',
    description: 'Indwara z\'umutima n\'imitsi zirimo umutima udakora neza no guturika cyangwa gufungana kw\'imitsi yo mu bwonko (stroke). Akenshi ziterwa n\'umuvuduko w\'amaraso ukabije, diyabete, itabi n\'imirire mibi.',
    riskFactors: ['Itabi', 'Umuvuduko w\'amaraso ukabije', 'Ibinure byinshi mu maraso', 'Kudakora imyitozo', 'Umunaniro n\'impungenge bihoraho'],
    warningSigns: ['Kubabara mu gituza', 'Guhumeka nabi', 'Kunanirwa vuba', 'Kubyimba amaguru', 'Igice kimwe cy\'umubiri kinanirwa gitunguranye'],
    prevention: ['Ntunywe itabi', 'Rya ibiryo bidafite amavuta menshi', 'Kora imyitozo buri munsi', 'Kurikirana umuvuduko w\'amaraso n\'isukari', 'Sinzira neza kandi uruhuke']
  },
  {
    id: 'cancer',
    title: 'Kanseri',
    category: 'Kanseri',
    icon: '✚',
    description: 'Kanseri ni indwara ituma uturemangingo tw\'umubiri dukura mu buryo budasanzwe. Iyo imenyekanye kare, akenshi iravurwa igakira.',
    riskFactors: ['Itabi', 'Inzoga nyinshi', 'Imirire mibi', 'Virusi zimwe nka HPV na hepatite B', 'Kudakora imyitozo'],
    warningSigns: ['Ikibyimba kidasanzwe', 'Kunanuka nta mpamvu', 'Kuva amaraso bidasanzwe', 'Inkorora idashira', 'Igisebe kidakira'],
    prevention: ['Irinde itabi n\'inzoga', 'Rya imboga n\'imbuto', 'Ikingize HPV na hepatite B', 'Ipimishe kanseri y\'inkondo y\'umura n\'iy\'ibere', 'Jya kwa muganga kare niba ubonye ikimenyetso']
  }
];

// The built-in topics in the same shape as diseases from the API (offline fallback).
export const offlineDiseases: Curriculum[] = ncdTopics.map((topic, index) => ({
  id: -(index + 1),
  slug: topic.id,
  title: topic.title,
  condition: topic.title,
  description: '',
  imageUrl: '',
  lessonIds: [],
  categoryId: defaultCategories.find((category) => category.name === topic.category)?.id ?? null,
  icon: topic.icon,
  about: topic.description,
  riskFactors: topic.riskFactors,
  warningSigns: topic.warningSigns,
  prevention: topic.prevention
}));

export type ExerciseLevel = 'Nshya' | 'Hagati' | 'Nabimenyereye';

export type Exercise = {
  id: string;
  level: ExerciseLevel;
  title: string;
  minutes: number;
  icon: string;
  steps: string[];
};

export const exerciseLevels: { level: ExerciseLevel; hint: string }[] = [
  { level: 'Nshya', hint: 'Ntabwo nkunda gukora imyitozo' },
  { level: 'Hagati', hint: 'Nkora imyitozo rimwe na rimwe' },
  { level: 'Nabimenyereye', hint: 'Nkora imyitozo kenshi' }
];

export const exercises: Exercise[] = [
  {
    id: 'walk-10',
    level: 'Nshya',
    title: 'Kugenda buhoro',
    minutes: 10,
    icon: '🚶',
    steps: ['Ambara inkweto zikworoheye.', 'Genda buhoro iminota 10 hafi y\'urugo.', 'Humeka neza, ushobora kuvuga utaruhutse.', 'Hagarara niba wumva uzungera cyangwa ubabara mu gituza.']
  },
  {
    id: 'stretch',
    level: 'Nshya',
    title: 'Kurambura imitsi',
    minutes: 5,
    icon: '🙆',
    steps: ['Hagarara wemye, uzamure amaboko buhoro.', 'Hindukiza ijosi ibumoso n\'iburyo inshuro 5.', 'Kora ku birenge byawe niba bishoboka, utababara.', 'Subiramo inshuro 3.']
  },
  {
    id: 'walk-30',
    level: 'Hagati',
    title: 'Kugenda iminota 30',
    minutes: 30,
    icon: '🚶',
    steps: ['Tangira ugenda buhoro iminota 5.', 'Ongera umuvuduko iminota 20, ugenda nk\'ugiye ku isoko.', 'Garuka ku muvuduko muto iminota 5.', 'Nywa amazi nyuma y\'imyitozo.']
  },
  {
    id: 'farm',
    level: 'Hagati',
    title: 'Imirimo yo mu murima',
    minutes: 30,
    icon: '🌱',
    steps: ['Guhinga, kuvomera no gutunda nabyo ni imyitozo.', 'Fata akaruhuko buri minota 10.', 'Unama ukoresheje amavi, si umugongo.', 'Nywa amazi kenshi.']
  },
  {
    id: 'brisk',
    level: 'Nabimenyereye',
    title: 'Kugenda vuba no kuzamuka umusozi',
    minutes: 40,
    icon: '⛰',
    steps: ['Shyushya umubiri ugenda buhoro iminota 5.', 'Zamuka agasozi cyangwa amadarajya iminota 25.', 'Kora squats 10 inshuro 3.', 'Rangiza urambura imitsi iminota 5.']
  },
  {
    id: 'dance',
    level: 'Nabimenyereye',
    title: 'Kubyina',
    minutes: 20,
    icon: '💃',
    steps: ['Shyiraho indirimbo ukunda.', 'Byina iminota 20 udahagaze.', 'Kubyina hamwe n\'umuryango bitera imbaraga.', 'Hagarara niba uhumeka nabi cyane.']
  }
];

export type KnowledgeQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

// Same five items as the knowledge check in Appendix A of the proposal.
export const knowledgeCheck: KnowledgeQuestion[] = [
  {
    id: 'k1',
    question: 'Ni iki muri ibi gishobora kongera ibyago byo kugira umuvuduko w\'amaraso ukabije?',
    options: ['Kurya umunyu mwinshi', 'Kugenda n\'amaguru buri munsi', 'Kunywa amazi', 'Gusinzira neza'],
    answer: 0,
    explanation: 'Umunyu mwinshi wongera umuvuduko w\'amaraso.'
  },
  {
    id: 'k2',
    question: 'Umuntu mukuru agirwa inama yo gukora imyitozo ingana iki?',
    options: ['Nta na mike', 'Iminota 30 iminsi myinshi mu cyumweru', 'Iminota 5 mu cyumweru', 'Mu mpera z\'icyumweru gusa'],
    answer: 1,
    explanation: 'Iminota 30 ku munsi, nibura iminsi 5 mu cyumweru, ifasha umutima.'
  },
  {
    id: 'k3',
    question: 'Umuntu ashobora kumva ameze neza ariko afite umuvuduko w\'amaraso ukabije.',
    options: ['Ni ukuri', 'Si byo'],
    answer: 0,
    explanation: 'Akenshi nta bimenyetso bigaragara. Kwipimisha ni bwo buryo bwo kumenya.'
  },
  {
    id: 'k4',
    question: 'Ni ikihe kimenyetso gikunze kugaragaza diyabete?',
    options: ['Kunyara kenshi n\'inyota nyinshi', 'Kwitsamura', 'Amaso ararya', 'Kugira isepfu'],
    answer: 0,
    explanation: 'Inyota nyinshi no kunyara kenshi ni ibimenyetso bisanzwe bya diyabete.'
  },
  {
    id: 'k5',
    question: 'Kunywa itabi byongera ibyago byo kurwara indwara z\'umutima.',
    options: ['Ni ukuri', 'Si byo'],
    answer: 0,
    explanation: 'Itabi ryangiza imitsi y\'amaraso n\'umutima.'
  }
];

export type RiskQuestion = {
  id: string;
  question: string;
  // Answering "yes" (or "no" when riskOnNo is set) adds these tags.
  tags: Interest[];
  riskOnNo?: boolean;
};

// Optional six-question self-assessment. Answers never leave the device.
export const riskQuestions: RiskQuestion[] = [
  { id: 'age', question: 'Ufite imyaka 40 cyangwa irenga?', tags: ['Diyabete', 'Umuvuduko w\'amaraso'] },
  { id: 'family', question: 'Hari uwo mu muryango wawe urwaye diyabete cyangwa umuvuduko w\'amaraso ukabije?', tags: ['Diyabete', 'Umuvuduko w\'amaraso'] },
  { id: 'salt', question: 'Ukunda kongera umunyu mu biryo cyangwa kurya ibiryo birimo umunyu mwinshi?', tags: ['Umuvuduko w\'amaraso', 'Imirire'] },
  { id: 'activity', question: 'Ukora imyitozo nko kugenda n\'amaguru iminota 30, nibura iminsi 5 mu cyumweru?', tags: ['Imyitozo ngororamubiri', 'Ubuzima bw\'umutima'], riskOnNo: true },
  { id: 'tobacco', question: 'Unywa itabi cyangwa inzoga kenshi?', tags: ['Ubuzima bw\'umutima', 'Kanseri'] },
  { id: 'sugar', question: 'Ukunda kunywa ibinyobwa biryohereye (nka soda) cyangwa kurya isukari nyinshi?', tags: ['Diyabete', 'Imirire'] }
];

export const dailyTips = [
  'Gabanya umunyu mu mafunguro yawe, kandi ugende iminota 20 ku munsi kugira ngo umutima wawe ugire ubuzima bwiza.',
  'Nywa amazi aho kunywa soda. Ibinyobwa biryohereye byongera ibyago bya diyabete.',
  'Shyira imboga mu isahani yawe buri munsi. Zigomba kuba nibura igice cy\'isahani.',
  'Ipimishe umuvuduko w\'amaraso ku kigo nderabuzima nibura rimwe mu mwaka.',
  'Itabi ryangiza umutima n\'ibihaha. Kurireka igihe icyo ari cyo cyose bigira akamaro.',
  'Sinzira amasaha 7 kugeza ku 8. Ibitotsi byiza bifasha umubiri kuruhuka.',
  'Imirimo yo mu murima no kugenda ujya ku isoko nabyo ni imyitozo ngororamubiri.'
];

export const tipOfTheDay = () => dailyTips[new Date().getDate() % dailyTips.length];

// Built-in lessons used when the API cannot be reached and nothing is cached.
export const offlineLessons: Lesson[] = [
  {
    id: 1,
    title: 'Umuvuduko w\'amaraso ni iki?',
    categoryId: 2,
    category: 'Umuvuduko w\'amaraso',
    summary: 'Menya umuvuduko w\'amaraso ukabije n\'uburyo bwo kuwirinda.',
    body: 'Umuvuduko w\'amaraso ni ingufu amaraso akoresha asunika imitsi. Iyo uri hejuru igihe kirekire, umutima ukora cyane kandi bishobora gutera stroke. Akenshi nta bimenyetso bigaragara, ni yo mpamvu ugomba kwipimisha. Gabanya umunyu, kora imyitozo kandi wirinde itabi.',
    duration: '02:30',
    audioUrl: '/audio/blood-pressure.mp3',
    imageUrl: '/images/bp-heart.svg',
    quiz: []
  },
  {
    id: 2,
    title: 'Diyabete n\'ubuzima',
    categoryId: 3,
    category: 'Diyabete',
    summary: 'Ibimenyetso bya diyabete n\'uko wayirinda.',
    body: 'Diyabete ituma isukari mu maraso izamuka. Ibimenyetso birimo inyota nyinshi, kunyara kenshi no gucika intege. Kurya ibiryo bifite isukari nkeya, gukora imyitozo no kwipimisha bifasha kuyirinda.',
    duration: '02:10',
    audioUrl: '/audio/diabetes.mp3',
    imageUrl: '/images/glucose.svg',
    quiz: []
  },
  {
    id: 3,
    title: 'Imirire myiza',
    categoryId: 1,
    category: 'Imirire',
    summary: 'Uko wategura isahani ifite ubuzima bwiza.',
    body: 'Isahani nziza igira imboga nyinshi, ibinyampeke byuzuye n\'ibiryo byubaka umubiri nk\'ibishyimbo. Gabanya umunyu, isukari n\'amavuta menshi. Rya imbuto aho kurya ibiryo biryohereye.',
    duration: '02:00',
    audioUrl: '/audio/nutrition.mp3',
    imageUrl: '/images/plate.svg',
    quiz: []
  }
];
