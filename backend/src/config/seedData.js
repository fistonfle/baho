// Demo content shared by the PostgreSQL seed and the in-memory demo store.
// Audio files are optional: record them (e.g. with Audacity, MP3 64 kbps) and
// place them in frontend/public/audio/ using the file names below. Until then
// the app reads each lesson aloud with the browser's speech voice.

export const seedCategories = [
  { id: 1, name: 'Imirire', slug: 'nutrition' },
  { id: 2, name: 'Umuvuduko w\'amaraso', slug: 'blood-pressure' },
  { id: 3, name: 'Diyabete', slug: 'diabetes' },
  { id: 4, name: 'Ubuzima bw\'umutima', slug: 'heart-health' },
  { id: 5, name: 'Kanseri', slug: 'cancer' },
  { id: 6, name: 'Imyitozo ngororamubiri', slug: 'exercise' }
];

export const seedLessons = [
  {
    categoryId: 2,
    title: 'Umuvuduko w\'amaraso ni iki?',
    summary: 'Menya umuvuduko w\'amaraso ukabije n\'uburyo bwo kuwirinda.',
    body: 'Umuvuduko w\'amaraso ni ingufu amaraso akoresha asunika imitsi. Iyo uri hejuru igihe kirekire, umutima ukora cyane kandi bishobora gutera stroke. Akenshi nta bimenyetso bigaragara, ni yo mpamvu ugomba kwipimisha. Gabanya umunyu, kora imyitozo kandi wirinde itabi.',
    audioUrl: '/audio/blood-pressure.mp3',
    imageUrl: '/images/bp-heart.svg',
    quiz: [
      { question: 'Umuvuduko w\'amaraso ukabije akenshi ugaragaza ibimenyetso?', options: ['Buri gihe', 'Akenshi nta bimenyetso'], answerIndex: 1, explanation: 'Akenshi nta bimenyetso, ni yo mpamvu kwipimisha ari ngombwa.' },
      { question: 'Ni iki gifasha kugabanya umuvuduko w\'amaraso?', options: ['Kurya umunyu mwinshi', 'Gukora imyitozo no kugabanya umunyu', 'Kunywa itabi'], answerIndex: 1, explanation: 'Imyitozo n\'umunyu muke bigabanya umuvuduko w\'amaraso.' }
    ]
  },
  {
    categoryId: 3,
    title: 'Diyabete n\'ubuzima',
    summary: 'Ibimenyetso bya diyabete n\'uko wayirinda.',
    body: 'Diyabete ituma isukari mu maraso izamuka. Ibimenyetso birimo inyota nyinshi, kunyara kenshi no gucika intege. Kurya ibiryo bifite isukari nkeya, gukora imyitozo no kwipimisha bifasha kuyirinda.',
    audioUrl: '/audio/diabetes.mp3',
    imageUrl: '/images/glucose.svg',
    quiz: [
      { question: 'Ni ikihe kimenyetso cya diyabete?', options: ['Inyota nyinshi no kunyara kenshi', 'Kwitsamura', 'Kubabara amenyo'], answerIndex: 0, explanation: 'Inyota nyinshi no kunyara kenshi ni ibimenyetso bisanzwe.' },
      { question: 'Diyabete ituma iki kizamuka mu maraso?', options: ['Isukari', 'Amazi', 'Umunyu'], answerIndex: 0, explanation: 'Diyabete ituma isukari mu maraso izamuka.' }
    ]
  },
  {
    categoryId: 1,
    title: 'Imirire myiza',
    summary: 'Uko wategura isahani ifite ubuzima bwiza.',
    body: 'Isahani nziza igira imboga nyinshi, ibinyampeke byuzuye n\'ibiryo byubaka umubiri nk\'ibishyimbo. Gabanya umunyu, isukari n\'amavuta menshi. Rya imbuto aho kurya ibiryo biryohereye.',
    audioUrl: '/audio/nutrition.mp3',
    imageUrl: '/images/plate.svg',
    quiz: [
      { question: 'Isahani nziza igomba kugira iki kinshi?', options: ['Imboga', 'Isukari', 'Amavuta'], answerIndex: 0, explanation: 'Imboga zigomba kuba nibura igice cy\'isahani.' },
      { question: 'Aho kurya ibiryo biryohereye, ni byiza kurya:', options: ['Imbuto', 'Bombo', 'Keke'], answerIndex: 0, explanation: 'Imbuto zitanga vitamini n\'isukari karemano.' }
    ]
  },
  {
    categoryId: 1,
    title: 'Umunyu muke, umutima muzima',
    summary: 'Impamvu umunyu mwinshi wangiza n\'uko wawugabanya.',
    body: 'Umunyu mwinshi wongera umuvuduko w\'amaraso. Umuntu mukuru ntagomba kurenza ikiyiko gito kimwe cy\'umunyu ku munsi. Teka ushyiramo umunyu muke, wirinde ibiryo bitunganyirijwe mu nganda, kandi ukoreshe ibirungo nk\'igitunguru na tungurusumu.',
    audioUrl: '/audio/salt.mp3',
    imageUrl: '/images/salt.svg',
    quiz: [
      { question: 'Umuntu mukuru ntagomba kurenza umunyu ungana iki ku munsi?', options: ['Ikiyiko gito kimwe', 'Ibiyiko bitanu', 'Igikombe kimwe'], answerIndex: 0, explanation: 'Ikiyiko gito kimwe (garama 5) ku munsi ni cyo kigero.' },
      { question: 'Ni ibihe birungo bishobora gusimbura umunyu?', options: ['Igitunguru na tungurusumu', 'Isukari', 'Amavuta'], answerIndex: 0, explanation: 'Ibirungo bitanga uburyohe nta munyu mwinshi.' }
    ]
  },
  {
    categoryId: 1,
    title: 'Ibinyobwa biryohereye',
    summary: 'Soda n\'imitobe irimo isukari byongera ibyago bya diyabete.',
    body: 'Soda n\'imitobe yongewemo isukari bifite isukari nyinshi. Kubinywa kenshi byongera ibiro n\'ibyago bya diyabete. Nywa amazi meza cyangwa amata adafite isukari. Kurya urubuto rwose biruta kunywa umutobe.',
    audioUrl: '/audio/sugary-drinks.mp3',
    imageUrl: '/images/water.svg',
    quiz: [
      { question: 'Ni ikihe kinyobwa cyiza ku buzima?', options: ['Soda', 'Amazi meza', 'Umutobe wongewemo isukari'], answerIndex: 1, explanation: 'Amazi meza nta sukari agira.' },
      { question: 'Kunywa soda kenshi byongera ibyago bya:', options: ['Diyabete', 'Malariya', 'Inkorora'], answerIndex: 0, explanation: 'Isukari nyinshi yongera ibiro n\'ibyago bya diyabete.' }
    ]
  },
  {
    categoryId: 3,
    title: 'Kwipimisha isukari mu maraso',
    summary: 'Igihe n\'aho wakwipimishiriza diyabete.',
    body: 'Kwipimisha isukari ni bwo buryo bwonyine bwo kumenya niba ufite diyabete. Ku kigo nderabuzima bakoresha agatonyanga gato k\'amaraso, bigatwara iminota mike. Niba urengeje imyaka 40 cyangwa ufite abo mu muryango barwaye diyabete, ipimishe buri mwaka.',
    audioUrl: '/audio/sugar-test.mp3',
    imageUrl: '/images/glucose.svg',
    quiz: [
      { question: 'Ni ubuhe buryo bwizewe bwo kumenya ko ufite diyabete?', options: ['Kwipimisha isukari mu maraso', 'Kureba ibiro', 'Kubaza umuturanyi'], answerIndex: 0, explanation: 'Ikizamini cy\'isukari ni cyo cyizewe.' },
      { question: 'Ni nde ukwiye kwipimisha isukari buri mwaka?', options: ['Urengeje imyaka 40', 'Abana gusa', 'Nta we'], answerIndex: 0, explanation: 'Ibyago byiyongera nyuma y\'imyaka 40.' }
    ]
  },
  {
    categoryId: 4,
    title: 'Rinda umutima wawe',
    summary: 'Intambwe eshanu zoroshye zirinda umutima.',
    body: 'Umutima ukora ubudahwema. Kugira ngo uwurinde: ntunywe itabi, kora imyitozo iminota 30 ku munsi, rya imboga n\'imbuto, gabanya amavuta n\'umunyu, kandi wipimishe umuvuduko w\'amaraso. Kubabara mu gituza cyangwa guhumeka nabi bitunguranye bisaba kujya kwa muganga ako kanya.',
    audioUrl: '/audio/heart.mp3',
    imageUrl: '/images/heart.svg',
    quiz: [
      { question: 'Ni iki cyangiza umutima?', options: ['Itabi', 'Imboga', 'Gusinzira neza'], answerIndex: 0, explanation: 'Itabi ryangiza imitsi y\'amaraso n\'umutima.' },
      { question: 'Kubabara mu gituza bitunguranye bisaba:', options: ['Gutegereza iminsi mike', 'Kujya kwa muganga ako kanya', 'Kunywa icyayi'], answerIndex: 1, explanation: 'Ni ikimenyetso gikomeye, jya kwa muganga vuba.' }
    ]
  },
  {
    categoryId: 4,
    title: 'Ibimenyetso bya stroke',
    summary: 'Menya ibimenyetso kandi ukore vuba.',
    body: 'Stroke ibaho iyo amaraso atagera mu gice cy\'ubwonko. Ibimenyetso ni isura yihengamye, ukuboko kunanirwa no kuvuga nabi. Iyo ubibonye, jyana umurwayi kwa muganga vuba cyangwa uhamagare 912. Buri munota ni ingenzi.',
    audioUrl: '/audio/stroke.mp3',
    imageUrl: '/images/stroke.svg',
    quiz: [
      { question: 'Ni ikihe kimenyetso cya stroke?', options: ['Isura yihengamye no kuvuga nabi', 'Inkorora', 'Kuribwa mu nda'], answerIndex: 0, explanation: 'Isura, ukuboko n\'imvugo ni byo bimenyetso by\'ingenzi.' },
      { question: 'Iyo ubonye ibimenyetso bya stroke ukora iki?', options: ['Ujyana umurwayi kwa muganga vuba', 'Utegereza ejo', 'Umuha ibiryo'], answerIndex: 0, explanation: 'Buri munota ni ingenzi.' }
    ]
  },
  {
    categoryId: 5,
    title: 'Kanseri: kuyimenya kare',
    summary: 'Kwipimisha no kwikingiza birokora ubuzima.',
    body: 'Kanseri nyinshi zishobora kuvurwa iyo zimenyekanye kare. Abagore bagirwa inama yo kwipimisha kanseri y\'inkondo y\'umura n\'iy\'ibere. Ikingize HPV na hepatite B, kandi wirinde itabi n\'inzoga. Niba ubona ikibyimba, kunanuka nta mpamvu cyangwa kuva amaraso bidasanzwe, jya kwa muganga.',
    audioUrl: '/audio/cancer.mp3',
    imageUrl: '/images/screening.svg',
    quiz: [
      { question: 'Kanseri ivurwa neza iyo:', options: ['Imenyekanye kare', 'Imaze igihe kirekire'], answerIndex: 0, explanation: 'Kumenya kare bitanga amahirwe yo gukira.' },
      { question: 'Ni uruhe rukingo rufasha kwirinda kanseri y\'inkondo y\'umura?', options: ['HPV', 'Iseru', 'Imbasa'], answerIndex: 0, explanation: 'Urukingo rwa HPV rurinda kanseri y\'inkondo y\'umura.' }
    ]
  },
  {
    categoryId: 6,
    title: 'Imyitozo ya buri munsi',
    summary: 'Iminota 30 ku munsi irinda indwara nyinshi.',
    body: 'Imyitozo ngororamubiri igabanya ibyago bya diyabete, umuvuduko w\'amaraso n\'indwara z\'umutima. Gerageza iminota 30 ku munsi, iminsi 5 mu cyumweru. Kugenda n\'amaguru, guhinga, kubyina no kuzamuka amadarajya byose ni imyitozo.',
    audioUrl: '/audio/exercise.mp3',
    imageUrl: '/images/walking.svg',
    quiz: [
      { question: 'Ni iminota ingahe y\'imyitozo igirwa inama ku munsi?', options: ['30', '5', '120'], answerIndex: 0, explanation: 'Iminota 30, iminsi 5 mu cyumweru.' },
      { question: 'Ni iki muri ibi ari imyitozo ngororamubiri?', options: ['Guhinga no kugenda n\'amaguru', 'Kureba televiziyo', 'Kuryama'], answerIndex: 0, explanation: 'Imirimo ikoresha umubiri ni imyitozo.' }
    ]
  },
  {
    categoryId: 2,
    title: 'Gupima umuvuduko w\'amaraso',
    summary: 'Uko bapima n\'icyo imibare isobanura.',
    body: 'Umuvuduko w\'amaraso upimwa n\'akuma gashyirwa ku kuboko. Haboneka imibare ibiri, urugero 120/80. Umubare wa mbere ugaragaza ingufu iyo umutima utera, uwa kabiri iyo uruhuka. Iyo imibare ihora iri ku 140/90 cyangwa hejuru, ni ngombwa kubonana na muganga. Ipimishe ku kigo nderabuzima cyangwa ku mujyanama w\'ubuzima.',
    audioUrl: '/audio/bp-check.mp3',
    imageUrl: '/images/bp-check.svg',
    quiz: [
      { question: 'Umuvuduko w\'amaraso ugaragazwa n\'imibare ingahe?', options: ['Umwe', 'Ibiri, urugero 120/80', 'Itatu'], answerIndex: 1, explanation: 'Imibare ibiri: iyo umutima utera n\'iyo uruhuka.' },
      { question: 'Iyo imibare ihora iri ku 140/90 cyangwa hejuru, ukora iki?', options: ['Ubonana na muganga', 'Ubyirengagiza', 'Wongera umunyu'], answerIndex: 0, explanation: 'Baho ntipima indwara; muganga ni we ugufasha.' }
    ]
  },
  {
    categoryId: 2,
    title: 'Gufata imiti neza',
    summary: 'Impamvu imiti ifatwa buri munsi.',
    body: 'Niba muganga yaraguhaye imiti y\'umuvuduko w\'amaraso cyangwa diyabete, yifate buri munsi ku isaha imwe, kabone n\'iyo wumva umeze neza. Ntuhagarike imiti utabajije muganga. Shyiraho icyibutsa muri Baho kugira ngo utibagirwa. Jyana imiti yawe igihe ugiye kwa muganga.',
    audioUrl: '/audio/medicine.mp3',
    imageUrl: '/images/medicine.svg',
    quiz: [
      { question: 'Ufata imiti ariko wumva umeze neza. Ukora iki?', options: ['Ukomeza kuyifata nk\'uko muganga yabivuze', 'Uyihagarika', 'Uyifata rimwe mu cyumweru'], answerIndex: 0, explanation: 'Imiti ikora neza iyo ifashwe buri munsi.' },
      { question: 'Ni iki cyagufasha kutibagirwa imiti?', options: ['Icyibutsa muri Baho', 'Kuyibika kure'], answerIndex: 0, explanation: 'Ibyibutsa bigufasha gufata imiti ku gihe.' }
    ]
  },
  {
    categoryId: 3,
    title: 'Kwita ku birenge ku barwayi ba diyabete',
    summary: 'Igisebe gito gishobora kuba ikibazo gikomeye.',
    body: 'Diyabete ishobora kwangiza imitsi yo mu birenge, ugatinda kumva igisebe. Reba ibirenge byawe buri munsi, ubyoze kandi ubyumutse neza. Ambara inkweto zikwiriye, ntugende utambaye inkweto. Igisebe kidakira vuba kigomba kwerekwa muganga.',
    audioUrl: '/audio/foot-care.mp3',
    imageUrl: '/images/foot-care.svg',
    quiz: [
      { question: 'Umurwayi wa diyabete akwiye kureba ibirenge bye ryari?', options: ['Buri munsi', 'Rimwe mu mwaka'], answerIndex: 0, explanation: 'Kureba buri munsi bifasha kubona igisebe kare.' },
      { question: 'Igisebe kidakira ku kirenge gisaba:', options: ['Kwerekwa muganga', 'Kugitwikira gusa'], answerIndex: 0, explanation: 'Muganga agufasha kukirinda kwandura.' }
    ]
  },
  {
    categoryId: 5,
    title: 'Itabi n\'inzoga',
    summary: 'Uko byongera ibyago bya kanseri n\'indwara z\'umutima.',
    body: 'Itabi ritera kanseri y\'ibihaha, iy\'umunwa n\'izindi, kandi ryangiza umutima. Inzoga nyinshi zongera ibyago bya kanseri y\'umwijima n\'iy\'ibere. Kureka itabi bigira akamaro ku myaka yose. Saba ubufasha ku kigo nderabuzima niba ushaka kurireka.',
    audioUrl: '/audio/tobacco.mp3',
    imageUrl: '/images/no-smoking.svg',
    quiz: [
      { question: 'Itabi ritera:', options: ['Kanseri n\'indwara z\'umutima', 'Amagufa akomeye'], answerIndex: 0, explanation: 'Itabi ryangiza ibihaha, umutima n\'imitsi.' },
      { question: 'Kureka itabi bigira akamaro:', options: ['Ku myaka yose', 'Ku rubyiruko gusa'], answerIndex: 0, explanation: 'Umubiri utangira gukira ako kanya.' }
    ]
  }
];

// Learning paths: an ordered list of lesson titles for each diagnosed condition.
// A path with a condition is also a disease in the NCD module: it has a lesson
// category and its own risk factors, warning signs and prevention advice.
// "prevention" is the default path for learners without a diagnosis.
export const seedCurricula = [
  {
    slug: 'prevention',
    title: 'Inzira yo kwirinda',
    condition: null,
    description: 'Amasomo y\'ibanze yo kwirinda indwara zitandura.',
    imageUrl: '/images/walking.svg',
    lessons: ['Imirire myiza', 'Imyitozo ya buri munsi', 'Umuvuduko w\'amaraso ni iki?', 'Diyabete n\'ubuzima', 'Kanseri: kuyimenya kare']
  },
  {
    slug: 'hypertension',
    title: 'Inzira y\'umuvuduko w\'amaraso',
    condition: 'Umuvuduko w\'amaraso ukabije',
    description: 'Wige kubana neza n\'umuvuduko w\'amaraso ukabije.',
    imageUrl: '/images/bp-check.svg',
    categorySlug: 'blood-pressure',
    icon: '❤',
    about: 'Umuvuduko w\'amaraso ukabije ni igihe amaraso asunika imitsi ku ngufu nyinshi kurusha uko bikwiye. Akenshi nta bimenyetso ugaragaza, ni yo mpamvu kwipimisha buri gihe ari ingenzi.',
    riskFactors: ['Kurya umunyu mwinshi', 'Kunywa itabi n\'inzoga nyinshi', 'Kudakora imyitozo ngororamubiri', 'Umubyibuho ukabije', 'Kugira abo mu muryango bayirwaye'],
    warningSigns: ['Kuribwa umutwe cyane', 'Kuzungera', 'Kubona ibikezikezi', 'Umutima utera vuba bidasanzwe'],
    prevention: ['Gabanya umunyu mu biryo', 'Kora imyitozo iminota 30 ku munsi', 'Rya imboga n\'imbuto buri munsi', 'Irinde itabi n\'inzoga', 'Ipimishe umuvuduko w\'amaraso nibura rimwe mu mwaka'],
    lessons: ['Umuvuduko w\'amaraso ni iki?', 'Gupima umuvuduko w\'amaraso', 'Umunyu muke, umutima muzima', 'Imyitozo ya buri munsi', 'Gufata imiti neza', 'Ibimenyetso bya stroke']
  },
  {
    slug: 'diabetes',
    title: 'Inzira ya diyabete',
    condition: 'Diyabete',
    description: 'Wige gucunga isukari n\'imibereho ya buri munsi.',
    imageUrl: '/images/glucose.svg',
    categorySlug: 'diabetes',
    icon: '◉',
    about: 'Diyabete ni indwara ituma isukari mu maraso izamuka cyane kuko umubiri udakoresha neza insuline. Iyo idakurikiranwe, ishobora kwangiza amaso, impyiko, imitsi n\'umutima.',
    riskFactors: ['Umubyibuho ukabije', 'Kudakora imyitozo', 'Kunywa ibinyobwa birimo isukari nyinshi', 'Kugira abo mu muryango bayirwaye', 'Kurenza imyaka 40'],
    warningSigns: ['Inyota nyinshi', 'Kunyara kenshi', 'Gucika intege', 'Kunanuka nta mpamvu', 'Ibisebe bitinda gukira'],
    prevention: ['Gabanya isukari n\'ibinyobwa biryohereye', 'Rya ibinyampeke byuzuye n\'imboga', 'Kora imyitozo buri munsi', 'Gumana ibiro bikwiye', 'Ipimishe isukari mu maraso'],
    lessons: ['Diyabete n\'ubuzima', 'Kwipimisha isukari mu maraso', 'Ibinyobwa biryohereye', 'Imirire myiza', 'Imyitozo ya buri munsi', 'Kwita ku birenge ku barwayi ba diyabete', 'Gufata imiti neza']
  },
  {
    slug: 'heart',
    title: 'Inzira y\'umutima muzima',
    condition: 'Indwara z\'umutima',
    description: 'Wige kurinda umutima no kumenya ibimenyetso by\'ingenzi.',
    imageUrl: '/images/heart.svg',
    categorySlug: 'heart-health',
    icon: '♥',
    about: 'Indwara z\'umutima n\'imitsi zirimo umutima udakora neza no guturika cyangwa gufungana kw\'imitsi yo mu bwonko (stroke). Akenshi ziterwa n\'umuvuduko w\'amaraso ukabije, diyabete, itabi n\'imirire mibi.',
    riskFactors: ['Itabi', 'Umuvuduko w\'amaraso ukabije', 'Ibinure byinshi mu maraso', 'Kudakora imyitozo', 'Umunaniro n\'impungenge bihoraho'],
    warningSigns: ['Kubabara mu gituza', 'Guhumeka nabi', 'Kunanirwa vuba', 'Kubyimba amaguru', 'Igice kimwe cy\'umubiri kinanirwa gitunguranye'],
    prevention: ['Ntunywe itabi', 'Rya ibiryo bidafite amavuta menshi', 'Kora imyitozo buri munsi', 'Kurikirana umuvuduko w\'amaraso n\'isukari', 'Sinzira neza kandi uruhuke'],
    lessons: ['Rinda umutima wawe', 'Umuvuduko w\'amaraso ni iki?', 'Umunyu muke, umutima muzima', 'Itabi n\'inzoga', 'Imyitozo ya buri munsi', 'Ibimenyetso bya stroke']
  },
  {
    slug: 'cancer',
    title: 'Inzira yo kwirinda kanseri',
    condition: 'Kanseri',
    description: 'Kwipimisha kare n\'imibereho igabanya ibyago bya kanseri.',
    imageUrl: '/images/screening.svg',
    categorySlug: 'cancer',
    icon: '✚',
    about: 'Kanseri ni indwara ituma uturemangingo tw\'umubiri dukura mu buryo budasanzwe. Iyo imenyekanye kare, akenshi iravurwa igakira.',
    riskFactors: ['Itabi', 'Inzoga nyinshi', 'Imirire mibi', 'Virusi zimwe nka HPV na hepatite B', 'Kudakora imyitozo'],
    warningSigns: ['Ikibyimba kidasanzwe', 'Kunanuka nta mpamvu', 'Kuva amaraso bidasanzwe', 'Inkorora idashira', 'Igisebe kidakira'],
    prevention: ['Irinde itabi n\'inzoga', 'Rya imboga n\'imbuto', 'Ikingize HPV na hepatite B', 'Ipimishe kanseri y\'inkondo y\'umura n\'iy\'ibere', 'Jya kwa muganga kare niba ubonye ikimenyetso'],
    lessons: ['Kanseri: kuyimenya kare', 'Itabi n\'inzoga', 'Imirire myiza', 'Imyitozo ya buri munsi']
  }
];

export const seedFaqs = [
  { question: 'Nshobora gukoresha Baho nta internet?', answer: 'Yego. Amasomo umaze gufungura abikwa kuri telefoni yawe. Raporo wohereje nta internet zoherezwa internet igarutse.' },
  { question: 'Ijwi ry\'isomo ntirikora. Nakora iki?', answer: 'Reba ko ijwi rya telefoni rifunguye. Niba isomo ridafite ijwi ryafashwe, Baho irisoma ikoresheje ijwi rya mudasobwa. Ushobora no kongera gufungura isomo.' },
  { question: 'Ibisubizo by\'isuzuma ryanjye birinzwe?', answer: 'Yego. Ibisubizo by\'isuzuma ryihuse bibikwa kuri telefoni yawe gusa, birinzwe, kandi ntibyoherezwa kuri seriveri ya Baho.' },
  { question: 'Ese Baho isimbura muganga?', answer: 'Oya. Baho itanga amakuru yo kwirinda gusa, ntipima indwara. Niba ufite impungenge ku buzima bwawe, jya ku kigo nderabuzima.' },
  { question: 'Nibagiwe ijambo ry\'ibanga. Nakora iki?', answer: 'Saba umuyobozi wa Baho cyangwa umujyanama w\'ubuzima kugufasha. Amasomo ushobora kuyakoresha nta konti.' },
  { question: 'Amasomo ya Baho ategurwa na nde?', answer: 'Amasomo yandikwa n\'inzobere z\'ubuzima, agasuzumwa n\'umuyobozi mbere yo gusohoka.' }
];
