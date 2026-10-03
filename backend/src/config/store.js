export const inMemoryStore = {
  users: [],
  staff: [],
  reminders: [],
  progress: [],
  categories: [
    { id: 1, name: 'Imirire', slug: 'nutrition' },
    { id: 2, name: 'Umuvuduko w\'amaraso', slug: 'blood-pressure' },
    { id: 3, name: 'Diyabete', slug: 'diabetes' },
    { id: 4, name: 'Umutima', slug: 'heart-health' }
  ],
  content: [
    {
      id: 1,
      categoryId: 2,
      title: 'Umuvuduko w\'amaraso ni iki?',
      summary: 'Kumenya ibimenyetso n\'ukubungabunga umuvuduko w\'amaraso.',
      body: 'Umuvuduko w\'amaraso ni igipimo cy\'amaraso y\'ingome mu mitsi. Akenshi ni ingenzi kugaragaza uko umutima ukora.',
      audioUrl: '/audio/blood-pressure.mp3',
      status: 'published'
    },
    {
      id: 2,
      categoryId: 3,
      title: 'Diyabete n\'ubuzima',
      summary: 'Uburyo bwo kurinda diyabete no kumenya ibimenyetso.',
      body: 'Diyabete irashobora kugaragara mu buryo butandukanye. Kurya byiza, imyitozo kandi no kwipimisha ni ingirakamaro.',
      audioUrl: '/audio/diabetes.mp3',
      status: 'published'
    },
    {
      id: 3,
      categoryId: 1,
      title: 'Imirire myiza',
      summary: 'Gukoresha ibiryo bihaza umubiri byiza.',
      body: 'Kurya ibiryo bitandukanye, ibinyampeke, imbuto, n\'imboga no kugabanya umunyu ni intambwe nziza mu kubungabunga ubuzima.',
      audioUrl: '/audio/nutrition.mp3',
      status: 'published'
    }
  ],
  faqs: [
    { id: 1, question: 'Baho ikora gute?', answer: 'Baho itanga amakuru, amajwi, imyitozo n\'ibibutsa kugira ngo abantu babashe kwibanda ku buzima bwabo.' },
    { id: 2, question: 'Ese Baho ikora nta internet?', answer: 'Yego, ibice byabitswe mbere birashobora gukoreshwa no hanze ya internet.' },
    { id: 3, question: 'Nabasha kwigira mu Kinyarwanda?', answer: 'Yego, ibirimo byateguwe mu Kinyarwanda.' }
  ],
  issues: [],
  questions: []
};
