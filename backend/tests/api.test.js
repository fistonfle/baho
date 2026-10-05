import test from 'node:test';
import assert from 'node:assert/strict';

process.env.BAHO_DEMO_MODE = 'true';
const { default: app } = await import('../src/app.js');
const { seedInitialAdmin } = await import('../src/modules/auth/bootstrap.js');

const startServer = async () => {
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
};

const postJson = (url, body, token) => fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  },
  body: JSON.stringify(body)
});

let adminToken;
let creatorToken;
let learnerToken;
let createdContentId;

 test('GET /api/v1/health responds successfully', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.status, 'ok');
    assert.equal(data.service, 'baho-backend');
  } finally {
    server.close();
  }
});

test('Public catalogue covers all six NCD education categories', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const categories = await (await fetch(`${baseUrl}/api/v1/categories`)).json();
    assert.deepEqual(
      categories.categories.map((category) => category.slug),
      ['nutrition', 'blood-pressure', 'diabetes', 'heart-health', 'cancer', 'exercise']
    );

    const content = await (await fetch(`${baseUrl}/api/v1/content`)).json();
    const coveredCategories = new Set(content.content.map((lesson) => lesson.categoryId));
    assert.equal(coveredCategories.size, 6);
    assert.ok(content.content.every((lesson) => lesson.status === 'published' && lesson.body));

    const faqs = await (await fetch(`${baseUrl}/api/v1/faq`)).json();
    assert.ok(faqs.faqs.some((faq) => faq.question.includes('internet')));
  } finally {
    server.close();
  }
});

test('Configured admin seed creates the first protected administrator once', async () => {
  const { server, baseUrl } = await startServer();
  try {
    process.env.BAHO_ADMIN_NAME = 'Seeded Test Admin';
    process.env.BAHO_ADMIN_EMAIL = 'seeded-admin@example.test';
    process.env.BAHO_ADMIN_PASSWORD = 'seeded-admin-pass-123';
    const seededAdmin = await seedInitialAdmin();
    assert.equal(seededAdmin.seeded, true);
    assert.equal(seededAdmin.user.role, 'admin');
    adminToken = seededAdmin.token;

    const secondSeed = await seedInitialAdmin();
    assert.equal(secondSeed.seeded, false);

    // There is no public way to create an admin: the first one comes from the server's environment.
    const response = await postJson(`${baseUrl}/api/v1/auth/setup-admin`, {
      name: 'Baho Admin',
      email: 'admin@example.test',
      password: 'admin-pass-123'
    });
    assert.equal(response.status, 404);
  } finally {
    server.close();
  }
});

test('Admin routes reject anonymous users and learner role escalation', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const anonymous = await fetch(`${baseUrl}/api/v1/admin/content`);
    assert.equal(anonymous.status, 401);

    const registerResponse = await postJson(`${baseUrl}/api/v1/auth/register`, {
      name: 'Learner One',
      email: 'learner@example.test',
      password: 'learner-pass-123'
    });
    assert.equal(registerResponse.status, 201);
    const learner = await registerResponse.json();
    learnerToken = learner.token;

    const escalated = await postJson(`${baseUrl}/api/v1/admin/creators`, {
      fullName: 'Attacker',
      email: 'attacker@example.test',
      password: 'attacker-pass-123',
      role: 'admin'
    }, learnerToken);
    assert.equal(escalated.status, 403);
  } finally {
    server.close();
  }
});

test('Registered users can log in and duplicate registrations are rejected', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const loginResponse = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: 'learner@example.test',
      password: 'learner-pass-123'
    });
    assert.equal(loginResponse.status, 200);
    const login = await loginResponse.json();
    assert.equal(login.user.role, 'learner');
    learnerToken = login.token;

    const duplicate = await postJson(`${baseUrl}/api/v1/auth/register`, {
      name: 'Learner Duplicate',
      email: 'learner@example.test',
      password: 'learner-pass-123'
    });
    assert.equal(duplicate.status, 409);
  } finally {
    server.close();
  }
});

test('Admin can create a creator who can submit content for review', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const creatorResponse = await postJson(`${baseUrl}/api/v1/admin/creators`, {
      fullName: 'Aline Uwase',
      email: 'aline.creator@example.test',
      password: 'creator-pass-123',
      role: 'creator'
    }, adminToken);
    assert.equal(creatorResponse.status, 201, await creatorResponse.clone().text());
    const creatorPayload = await creatorResponse.json();
    assert.equal(creatorPayload.user.role, 'creator');

    const loginResponse = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: 'aline.creator@example.test',
      password: 'creator-pass-123'
    });
    assert.equal(loginResponse.status, 200);
    creatorToken = (await loginResponse.json()).token;

    const contentResponse = await postJson(`${baseUrl}/api/v1/admin/content`, {
      categoryId: 1,
      title: 'Kugabanya umunyu mu mirire',
      summary: 'Ibiryo birimo umunyu muke bifasha ubuzima.',
      body: 'Kugabanya umunyu mu mafunguro bishobora gufasha mu kurinda ubuzima.',
      audioUrl: '/audio/salt-reduction.mp3',
      status: 'published'
    }, creatorToken);
    assert.equal(contentResponse.status, 201);
    const contentPayload = await contentResponse.json();
    assert.equal(contentPayload.content.status, 'review');
    createdContentId = contentPayload.content.id;
  } finally {
    server.close();
  }
});

test('Admin can create another administrator, while creators can only view and edit their own unpublished work', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const adminCreateResponse = await postJson(`${baseUrl}/api/v1/admin/creators`, {
      fullName: 'Second Administrator',
      email: 'second-admin@example.test',
      password: 'second-admin-pass-123',
      role: 'admin'
    }, adminToken);
    assert.equal(adminCreateResponse.status, 201);
    const createdAdmin = await adminCreateResponse.json();
    assert.equal(createdAdmin.user.role, 'admin');

    const secondAdminLogin = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: 'second-admin@example.test',
      password: 'second-admin-pass-123'
    });
    assert.equal(secondAdminLogin.status, 200);
    assert.equal((await secondAdminLogin.json()).user.role, 'admin');

    const ownContentResponse = await fetch(`${baseUrl}/api/v1/admin/content`, {
      headers: { Authorization: `Bearer ${creatorToken}` }
    });
    assert.equal(ownContentResponse.status, 200);
    const ownContent = (await ownContentResponse.json()).content;
    assert.equal(ownContent.length, 1);
    assert.equal(ownContent[0].id, createdContentId);

    const updateResponse = await fetch(`${baseUrl}/api/v1/admin/content/${createdContentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creatorToken}` },
      body: JSON.stringify({
        categoryId: 1,
        title: 'Isomo ryanjye nahinduye',
        summary: 'Incamake yahinduwe.',
        body: 'Ibisobanuro bishya ku isomo ryubuzima.',
        audioUrl: '',
        status: 'review'
      })
    });
    assert.equal(updateResponse.status, 200);
    assert.equal((await updateResponse.json()).content.title, 'Isomo ryanjye nahinduye');

    const otherCreatorResponse = await postJson(`${baseUrl}/api/v1/admin/creators`, {
      fullName: 'Other Creator',
      email: 'other-creator@example.test',
      password: 'other-creator-pass-123',
      role: 'creator'
    }, adminToken);
    assert.equal(otherCreatorResponse.status, 201);
    const otherCreatorLogin = await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: 'other-creator@example.test',
      password: 'other-creator-pass-123'
    });
    const otherCreatorToken = (await otherCreatorLogin.json()).token;

    const otherCreatorContent = await fetch(`${baseUrl}/api/v1/admin/content`, {
      headers: { Authorization: `Bearer ${otherCreatorToken}` }
    });
    assert.deepEqual((await otherCreatorContent.json()).content, []);

    const forbiddenUpdate = await fetch(`${baseUrl}/api/v1/admin/content/${createdContentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherCreatorToken}` },
      body: JSON.stringify({ categoryId: 1, title: 'Not mine', body: 'Trying to edit another creator lesson' })
    });
    assert.equal(forbiddenUpdate.status, 403);
  } finally {
    server.close();
  }
});

test('Draft/review content stays private until admin publishes it', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const publicResponse = await fetch(`${baseUrl}/api/v1/content`);
    assert.equal(publicResponse.status, 200);
    const publicContent = await publicResponse.json();
    assert.ok(!publicContent.content.some((item) => item.id === createdContentId));

    const publishResponse = await fetch(`${baseUrl}/api/v1/admin/content/${createdContentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'published' })
    });
    assert.equal(publishResponse.status, 200);

    const afterPublish = await fetch(`${baseUrl}/api/v1/content`);
    const published = await afterPublish.json();
    assert.ok(published.content.some((item) => item.id === createdContentId));

    const deleteResponse = await fetch(`${baseUrl}/api/v1/admin/content/${createdContentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(deleteResponse.status, 200);
  } finally {
    server.close();
  }
});

test('Learner questions are authenticated and private to their owner', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const anonymous = await postJson(`${baseUrl}/api/v1/questions`, { topic: 'Imirire', question: 'Question?' });
    assert.equal(anonymous.status, 401);

    const response = await postJson(`${baseUrl}/api/v1/questions`, {
      topic: 'Imirire',
      question: 'Ni gute wamenya ko ibiryo bigirira ubuzima?'
    }, learnerToken);
    assert.equal(response.status, 201, await response.clone().text());
    assert.equal((await response.json()).question.status, 'Pending');

    const listResponse = await fetch(`${baseUrl}/api/v1/questions`, { headers: { Authorization: `Bearer ${learnerToken}` } });
    assert.equal(listResponse.status, 200);
    const questions = await listResponse.json();

    const secondLearnerResponse = await postJson(`${baseUrl}/api/v1/auth/register`, {
      name: 'Learner Two',
      email: 'learner-two@example.test',
      password: 'learner-two-pass-123'
    });
    const secondLearner = await secondLearnerResponse.json();
    const privateList = await fetch(`${baseUrl}/api/v1/questions`, { headers: { Authorization: `Bearer ${secondLearner.token}` } });
    assert.deepEqual((await privateList.json()).questions, []);
  } finally {
    server.close();
  }
});

test('Admin can create, update and delete FAQs and review issues', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const createdFaq = await postJson(`${baseUrl}/api/v1/admin/faqs`, {
      question: 'Can I listen offline?',
      answer: 'Previously downloaded lessons may be available offline.'
    }, adminToken);
    assert.equal(createdFaq.status, 201);
    const faq = (await createdFaq.json()).faq;

    const updateFaq = await fetch(`${baseUrl}/api/v1/admin/faqs/${faq.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ question: 'Can lessons play offline?', answer: 'Only lessons saved on this device.' })
    });
    assert.equal(updateFaq.status, 200);

    const issueResponse = await postJson(`${baseUrl}/api/v1/issues`, { title: 'Audio issue', description: 'The audio did not load.' });
    assert.equal(issueResponse.status, 201);
    const issue = (await issueResponse.json()).issue;
    const issueStatus = await fetch(`${baseUrl}/api/v1/admin/issues/${issue.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'Resolved' })
    });
    assert.equal(issueStatus.status, 200);

    const deletedFaq = await fetch(`${baseUrl}/api/v1/admin/faqs/${faq.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(deletedFaq.status, 200);
  } finally {
    server.close();
  }
});

test('Authenticated reminder and progress endpoints validate and persist records', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const reminder = await postJson(`${baseUrl}/api/v1/reminders`, { time: '08:30', label: 'Drink water' }, learnerToken);
    assert.equal(reminder.status, 201);
    const created = (await reminder.json()).reminder;
    assert.equal(created.time, '08:30');

    const reminders = await fetch(`${baseUrl}/api/v1/reminders`, { headers: { Authorization: `Bearer ${learnerToken}` } });
    assert.ok((await reminders.json()).reminders.some((item) => item.id === created.id));

    const complete = await postJson(`${baseUrl}/api/v1/progress/1/complete`, {}, learnerToken);
    assert.ok([200, 404].includes(complete.status));
  } finally {
    server.close();
  }
});

test('Learning paths list ordered published lessons for each condition', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const { curricula } = await (await fetch(`${baseUrl}/api/v1/curricula`)).json();
    const slugs = curricula.map((curriculum) => curriculum.slug);
    assert.deepEqual(slugs, ['prevention', 'hypertension', 'diabetes', 'heart', 'cancer']);
    const hypertension = curricula.find((curriculum) => curriculum.slug === 'hypertension');
    assert.equal(hypertension.condition, 'Umuvuduko w\'amaraso ukabije');
    assert.ok(hypertension.lessonIds.length >= 5);

    const { content } = await (await fetch(`${baseUrl}/api/v1/content`)).json();
    const firstLesson = content.find((lesson) => lesson.id === hypertension.lessonIds[0]);
    assert.ok(firstLesson.imageUrl.startsWith('/images/'));
    assert.equal(firstLesson.quiz.length, 2);
  } finally {
    server.close();
  }
});

test('Quiz attempts are graded on the server and summarised in progress', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const { content } = await (await fetch(`${baseUrl}/api/v1/content`)).json();
    const lesson = content.find((item) => item.quiz.length === 2);
    const rightAnswers = lesson.quiz.map((question) => question.answerIndex);
    const oneWrong = [rightAnswers[0], (rightAnswers[1] + 1) % lesson.quiz[1].options.length];

    const anonymous = await postJson(`${baseUrl}/api/v1/quiz-attempts`, { contentId: lesson.id, answers: rightAnswers });
    assert.equal(anonymous.status, 401);

    const first = await postJson(`${baseUrl}/api/v1/quiz-attempts`, { contentId: lesson.id, answers: oneWrong }, learnerToken);
    assert.equal(first.status, 201);
    assert.deepEqual(await first.json(), { score: 1, total: 2, correct: [true, false] });

    const second = await postJson(`${baseUrl}/api/v1/quiz-attempts`, { contentId: lesson.id, answers: rightAnswers }, learnerToken);
    assert.equal((await second.json()).score, 2);

    const incomplete = await postJson(`${baseUrl}/api/v1/quiz-attempts`, { contentId: lesson.id, answers: [0] }, learnerToken);
    assert.equal(incomplete.status, 400);

    const progress = await (await fetch(`${baseUrl}/api/v1/progress`, { headers: { Authorization: `Bearer ${learnerToken}` } })).json();
    assert.equal(progress.quizAverage, 100);
    assert.deepEqual(progress.quizScores.find((item) => item.contentId === lesson.id), { contentId: lesson.id, score: 2, total: 2 });
  } finally {
    server.close();
  }
});

test('Staff can attach a validated quiz, image and learning path to a lesson', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const { curricula } = await (await fetch(`${baseUrl}/api/v1/curricula`)).json();
    const diabetesPath = curricula.find((curriculum) => curriculum.slug === 'diabetes');
    const lesson = {
      categoryId: 3,
      title: 'Isukari mu mafunguro',
      body: 'Gabanya isukari mu mafunguro ya buri munsi.',
      imageUrl: '/images/plate.svg',
      status: 'published',
      curriculumIds: [diabetesPath.id],
      quiz: [{ question: 'Ni iki cyiza?', options: ['Amazi', 'Soda'], answerIndex: 0, explanation: 'Amazi nta sukari.' }]
    };

    const invalid = await postJson(`${baseUrl}/api/v1/admin/content`, { ...lesson, quiz: [{ question: 'Gusa?', options: ['Imwe'], answerIndex: 3 }] }, adminToken);
    assert.equal(invalid.status, 400);

    const created = await postJson(`${baseUrl}/api/v1/admin/content`, lesson, adminToken);
    assert.equal(created.status, 201);
    const saved = (await created.json()).content;
    assert.equal(saved.imageUrl, '/images/plate.svg');
    assert.equal(saved.quiz.length, 1);
    assert.deepEqual(saved.curriculumIds, [diabetesPath.id]);

    const updatedPaths = (await (await fetch(`${baseUrl}/api/v1/curricula`)).json()).curricula;
    const updatedDiabetes = updatedPaths.find((curriculum) => curriculum.slug === 'diabetes');
    assert.equal(updatedDiabetes.lessonIds.at(-1), saved.id);
  } finally {
    server.close();
  }
});

test('Admin adds a new disease and a creator writes a lesson, quiz and image for it', async () => {
  const { server, baseUrl } = await startServer();
  const patchJson = (url, body, token) => fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  try {
    const disease = {
      name: 'Asima',
      icon: '🫁',
      about: 'Asima ni indwara ituma inzira z\'umwuka zifungana.',
      riskFactors: ['Umwotsi', 'Ivumbi'],
      warningSigns: ['Guhumeka nabi'],
      prevention: ['Irinde umwotsi']
    };

    const asCreator = await postJson(`${baseUrl}/api/v1/admin/diseases`, disease, creatorToken);
    assert.equal(asCreator.status, 403);
    const incomplete = await postJson(`${baseUrl}/api/v1/admin/diseases`, { ...disease, warningSigns: [] }, adminToken);
    assert.equal(incomplete.status, 400);

    const created = await postJson(`${baseUrl}/api/v1/admin/diseases`, disease, adminToken);
    assert.equal(created.status, 201);
    const asthma = (await created.json()).disease;
    assert.equal(asthma.condition, 'Asima');
    assert.deepEqual(asthma.riskFactors, ['Umwotsi', 'Ivumbi']);
    const duplicate = await postJson(`${baseUrl}/api/v1/admin/diseases`, disease, adminToken);
    assert.equal(duplicate.status, 409);

    const { categories } = await (await fetch(`${baseUrl}/api/v1/categories`)).json();
    assert.ok(categories.some((category) => category.id === asthma.categoryId && category.name === 'Asima'));

    const edited = await patchJson(`${baseUrl}/api/v1/admin/diseases/${asthma.id}`, { ...disease, prevention: ['Irinde umwotsi', 'Fata imiti'] }, adminToken);
    assert.deepEqual((await edited.json()).disease.prevention, ['Irinde umwotsi', 'Fata imiti']);

    // The creator uses the same lesson tools as the admin, but cannot publish.
    const lesson = {
      categoryId: asthma.categoryId,
      title: 'Asima ni iki?',
      body: 'Asima ifata inzira z\'umwuka.',
      imageUrl: '/images/heart.svg',
      curriculumIds: [asthma.id],
      quiz: [{ question: 'Asima ifata iki?', options: ['Inzira z\'umwuka', 'Amagufa'], answerIndex: 0, explanation: '' }],
      status: 'published'
    };
    const submitted = await postJson(`${baseUrl}/api/v1/admin/content`, lesson, creatorToken);
    assert.equal(submitted.status, 201);
    const draft = (await submitted.json()).content;
    assert.equal(draft.status, 'review');
    assert.equal(draft.quiz.length, 1);
    assert.deepEqual(draft.curriculumIds, [asthma.id]);

    const creatorEdit = await patchJson(`${baseUrl}/api/v1/admin/content/${draft.id}`, {
      ...lesson,
      status: 'review',
      quiz: [...lesson.quiz, { question: 'Umwotsi wongera asima?', options: ['Yego', 'Oya'], answerIndex: 0 }]
    }, creatorToken);
    assert.equal(creatorEdit.status, 200);
    assert.equal((await creatorEdit.json()).content.quiz.length, 2);

    let path = (await (await fetch(`${baseUrl}/api/v1/curricula`)).json()).curricula.find((item) => item.id === asthma.id);
    assert.deepEqual(path.lessonIds, [], 'unpublished lessons stay out of the path');

    const published = await patchJson(`${baseUrl}/api/v1/admin/content/${draft.id}/status`, { status: 'published' }, adminToken);
    assert.equal(published.status, 200);
    path = (await (await fetch(`${baseUrl}/api/v1/curricula`)).json()).curricula.find((item) => item.id === asthma.id);
    assert.deepEqual(path.lessonIds, [draft.id]);
  } finally {
    server.close();
  }
});
