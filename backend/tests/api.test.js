import test from 'node:test';
import assert from 'node:assert/strict';

process.env.BAHO_DEMO_MODE = 'true';
// Uploaded recordings go to a throwaway folder during tests.
const { mkdtempSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
process.env.MEDIA_DIR = mkdtempSync(join(tmpdir(), 'baho-media-'));
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

// Creates a staff member and finishes the invitation, returns a token.
const acceptInvite = async (baseUrl, createResponse, password) => {
  const payload = await createResponse.json();
  assert.ok(payload.invite?.link, `no invitation link in ${JSON.stringify(payload)}`);
  const token = new URL(payload.invite.link).searchParams.get('reset');
  const set = await postJson(`${baseUrl}/api/v1/auth/reset-password`, { token, password });
  assert.equal(set.status, 200, await set.clone().text());
  return payload;
};

// Creates a specialist for the given diseases and returns a signed-in token.
const makeSpecialist = async (baseUrl, email, topicIds) => {
  const created = await postJson(`${baseUrl}/api/v1/admin/creators`, {
    fullName: `Dr. ${email.split('@')[0]}`, email, role: 'specialist', topicIds
  }, adminToken);
  assert.equal(created.status, 201, await created.clone().text());
  await acceptInvite(baseUrl, created, 'specialist-pass-9');
  const login = await postJson(`${baseUrl}/api/v1/auth/login`, { email, password: 'specialist-pass-9' });
  return (await login.json()).token;
};

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
    assert.ok(['absent', 'command', 'ready', 'unreachable'].includes(data.voice));
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
      phone: '078 123 4567',
      pin: '2580'
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
    // The same number written another way still finds the account.
    const loginResponse = await postJson(`${baseUrl}/api/v1/auth/login`, {
      identifier: '+250781234567',
      password: '2580'
    });
    assert.equal(loginResponse.status, 200);
    const login = await loginResponse.json();
    assert.equal(login.user.role, 'learner');
    assert.equal(login.user.phone, '+250781234567');
    learnerToken = login.token;

    const duplicate = await postJson(`${baseUrl}/api/v1/auth/register`, {
      name: 'Learner Duplicate',
      phone: '0781234567',
      pin: '1111'
    });
    assert.equal(duplicate.status, 409);
  } finally {
    server.close();
  }
});

test('Phone sign-up checks the number and PIN, and wrong PINs lock the number', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const register = (body) => postJson(`${baseUrl}/api/v1/auth/register`, body);
    assert.equal((await register({ name: 'No Number', phone: '0712345678', pin: '1234' })).status, 400, 'not a Rwandan mobile prefix');
    assert.equal((await register({ name: 'Short', phone: '078123', pin: '1234' })).status, 400);
    assert.equal((await register({ name: 'Weak PIN', phone: '0791112233', pin: '12' })).status, 400);
    assert.equal((await register({ name: 'Letters', phone: '0791112233', pin: 'abcd' })).status, 400);
    assert.equal((await register({ name: 'Uwimana', phone: '250 79 111 2233', pin: '4826' })).status, 201);

    const login = (password) => postJson(`${baseUrl}/api/v1/auth/login`, { identifier: '0791112233', password });
    for (let attempt = 0; attempt < 5; attempt += 1) assert.equal((await login('0000')).status, 401);
    assert.equal((await login('4826')).status, 429, 'locked even with the right PIN');
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
      role: 'creator'
    }, adminToken);
    assert.equal(creatorResponse.status, 201, await creatorResponse.clone().text());
    const creatorPayload = await acceptInvite(baseUrl, creatorResponse, 'creator-pass-123');
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
      role: 'admin'
    }, adminToken);
    assert.equal(adminCreateResponse.status, 201);
    const createdAdmin = await acceptInvite(baseUrl, adminCreateResponse, 'second-admin-pass-123');
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
      role: 'creator'
    }, adminToken);
    assert.equal(otherCreatorResponse.status, 201);
    await acceptInvite(baseUrl, otherCreatorResponse, 'other-creator-pass-123');
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

test('Draft/review content stays private until the specialist approves it', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const publicResponse = await fetch(`${baseUrl}/api/v1/content`);
    assert.equal(publicResponse.status, 200);
    const publicContent = await publicResponse.json();
    assert.ok(!publicContent.content.some((item) => item.id === createdContentId));

    // An admin cannot publish.
    const adminAttempt = await fetch(`${baseUrl}/api/v1/admin/content/${createdContentId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'published' })
    });
    assert.equal(adminAttempt.status, 403);

    // The specialist for that disease approves, which publishes the lesson.
    const specialist = await postJson(`${baseUrl}/api/v1/admin/creators`, {
      fullName: 'Dr. Prevention', email: 'dr.prevention@example.test', role: 'specialist', topicIds: [1]
    }, adminToken);
    assert.equal(specialist.status, 201, await specialist.clone().text());
    await acceptInvite(baseUrl, specialist, 'prevention-pass-1');
    const specialistToken = (await (await postJson(`${baseUrl}/api/v1/auth/login`, {
      email: 'dr.prevention@example.test', password: 'prevention-pass-1'
    })).json()).token;

    const publishResponse = await postJson(
      `${baseUrl}/api/v1/review/lessons/${createdContentId}`, { decision: 'approve' }, specialistToken
    );
    assert.equal(publishResponse.status, 200, await publishResponse.clone().text());
    assert.equal((await publishResponse.json()).lesson.status, 'published');

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
      phone: '0721234567',
      pin: '13579'
    });
    const secondLearner = await secondLearnerResponse.json();
    const privateList = await fetch(`${baseUrl}/api/v1/questions`, { headers: { Authorization: `Bearer ${secondLearner.token}` } });
    assert.deepEqual((await privateList.json()).questions, []);
  } finally {
    server.close();
  }
});

test('Only the specialist for a disease answers its questions, and only the asker sees it', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const asked = await postJson(`${baseUrl}/api/v1/questions`, {
      topic: 'Imirire',
      question: 'Umunyu mwinshi utera iki?'
    }, learnerToken);
    assert.equal(asked.status, 201);
    const question = (await asked.json()).question;
    assert.equal(question.status, 'Pending');

    // Only the specialist can answer.
    const byLearner = await postJson(`${baseUrl}/api/v1/questions/${question.id}/answer`, { answer: 'Ntakibazo.' }, learnerToken);
    assert.equal(byLearner.status, 403);
    const byAdmin = await postJson(`${baseUrl}/api/v1/questions/${question.id}/answer`, { answer: 'Ntakibazo.' }, adminToken);
    assert.equal(byAdmin.status, 403);
    const byWriter = await postJson(`${baseUrl}/api/v1/questions/${question.id}/answer`, { answer: 'Ntakibazo.' }, creatorToken);
    assert.equal(byWriter.status, 403);

    // Imirire is category 1; a specialist for another disease is refused too.
    const nutritionToken = await makeSpecialist(baseUrl, 'dr.nutrition@example.test', [1]);
    const heartToken = await makeSpecialist(baseUrl, 'dr.heart@example.test', [4]);
    const wrongSpecialist = await postJson(`${baseUrl}/api/v1/questions/${question.id}/answer`, { answer: 'Ntakibazo.' }, heartToken);
    assert.equal(wrongSpecialist.status, 403);

    // A specialist sees only the questions about their own diseases.
    const heartView = (await (await fetch(`${baseUrl}/api/v1/questions`, {
      headers: { Authorization: `Bearer ${heartToken}` }
    })).json()).questions;
    assert.ok(!heartView.some((entry) => entry.id === question.id));

    // An empty answer is refused, and so is an unknown question.
    const blank = await postJson(`${baseUrl}/api/v1/questions/${question.id}/answer`, { answer: '   ' }, nutritionToken);
    assert.equal(blank.status, 400);
    const missing = await postJson(`${baseUrl}/api/v1/questions/999999/answer`, { answer: 'Yego.' }, nutritionToken);
    assert.equal(missing.status, 404);

    const answered = await postJson(
      `${baseUrl}/api/v1/questions/${question.id}/answer`,
      { answer: '  Umunyu mwinshi uzamura umuvuduko w\'amaraso.  ' },
      nutritionToken
    );
    assert.equal(answered.status, 200, await answered.clone().text());
    const saved = (await answered.json()).question;
    assert.equal(saved.status, 'Answered');
    assert.equal(saved.answer, "Umunyu mwinshi uzamura umuvuduko w'amaraso.", 'the answer is trimmed');

    // The learner who asked sees it.
    const mine = (await (await fetch(`${baseUrl}/api/v1/questions`, {
      headers: { Authorization: `Bearer ${learnerToken}` }
    })).json()).questions;
    const seen = mine.find((entry) => entry.id === question.id);
    assert.ok(seen, 'the learner can still see their question');
    assert.equal(seen.status, 'Answered');
    assert.equal(seen.answer, "Umunyu mwinshi uzamura umuvuduko w'amaraso.");

    // A different learner sees nothing of it.
    const other = await postJson(`${baseUrl}/api/v1/auth/register`, { name: 'Learner Three', phone: '0788777666', pin: '2468' });
    const otherToken = (await other.json()).token;
    const theirs = (await (await fetch(`${baseUrl}/api/v1/questions`, {
      headers: { Authorization: `Bearer ${otherToken}` }
    })).json()).questions;
    assert.ok(!theirs.some((entry) => entry.id === question.id));
  } finally {
    server.close();
  }
});

test('A question asked from a lesson is drafted by a writer and approved by the specialist', async () => {
  const { server, baseUrl } = await startServer();
  try {
    // Asked from inside a lesson, no topic picked.
    const lessons = (await (await fetch(`${baseUrl}/api/v1/content`)).json()).content;
    const lesson = lessons[0];
    const asked = await postJson(`${baseUrl}/api/v1/questions`, {
      question: 'Ese nanywa amazi angahe ku munsi?',
      contentId: lesson.id
    }, learnerToken);
    assert.equal(asked.status, 201, await asked.clone().text());
    const question = (await asked.json()).question;
    assert.equal(question.status, 'Pending');
    assert.ok(question.topic, 'the lesson supplied the topic');
    const lessonTopic = question.topic;

    const unknownLesson = await postJson(`${baseUrl}/api/v1/questions`, { question: 'Hmm?', contentId: 987654 }, learnerToken);
    assert.equal(unknownLesson.status, 404);

    // The writer sees it but not who asked.
    const writerView = (await (await fetch(`${baseUrl}/api/v1/questions`, {
      headers: { Authorization: `Bearer ${creatorToken}` }
    })).json()).questions;
    const forDrafting = writerView.find((entry) => entry.id === question.id);
    assert.ok(forDrafting, 'the writer sees the question');
    assert.equal(forDrafting.user_id, undefined, 'the writer is not told who asked');
    assert.equal(forDrafting.userId, undefined, 'the writer is not told who asked');

    // A writer drafts. Nothing reaches the learner yet.
    const draft = await postJson(`${baseUrl}/api/v1/questions/${question.id}/draft`, { answer: '  Nywa amazi arenga litiro ebyiri.  ' }, creatorToken);
    assert.equal(draft.status, 200, await draft.clone().text());
    assert.equal((await draft.json()).question.status, 'Drafted');

    const stillWaiting = (await (await fetch(`${baseUrl}/api/v1/questions`, {
      headers: { Authorization: `Bearer ${learnerToken}` }
    })).json()).questions.find((entry) => entry.id === question.id);
    assert.equal(stillWaiting.status, 'Drafted', 'the learner is not told it is answered yet');

    // A specialist cannot draft, and a writer cannot approve.
    const specialistToken = await makeSpecialist(baseUrl, `dr.${lessonTopic.toLowerCase().replace(/[^a-z]/g, '')}@example.test`,
      [(await (await fetch(`${baseUrl}/api/v1/categories`)).json()).categories.find((c) => c.name === lessonTopic).id]);
    const specialistDrafts = await postJson(`${baseUrl}/api/v1/questions/${question.id}/draft`, { answer: 'Nope.' }, specialistToken);
    assert.equal(specialistDrafts.status, 403);
    const writerApproves = await postJson(`${baseUrl}/api/v1/questions/${question.id}/answer`, {}, creatorToken);
    assert.equal(writerApproves.status, 403);

    // The specialist approves the draft unchanged, by sending no text at all.
    const approved = await postJson(`${baseUrl}/api/v1/questions/${question.id}/answer`, {}, specialistToken);
    assert.equal(approved.status, 200, await approved.clone().text());
    const sent = (await approved.json()).question;
    assert.equal(sent.status, 'Answered');
    assert.equal(sent.answer, 'Nywa amazi arenga litiro ebyiri.', "the writer's draft was trimmed and kept");

    // The learner who asked now sees it; it has left the writer's queue.
    const learnerView = (await (await fetch(`${baseUrl}/api/v1/questions`, {
      headers: { Authorization: `Bearer ${learnerToken}` }
    })).json()).questions.find((entry) => entry.id === question.id);
    assert.equal(learnerView.status, 'Answered');
    assert.equal(learnerView.answer, 'Nywa amazi arenga litiro ebyiri.');

    const writerAfter = (await (await fetch(`${baseUrl}/api/v1/questions`, {
      headers: { Authorization: `Bearer ${creatorToken}` }
    })).json()).questions;
    assert.ok(!writerAfter.some((entry) => entry.id === question.id), 'answered questions leave the writer queue');

    // An answered question cannot be redrafted.
    const redraft = await postJson(`${baseUrl}/api/v1/questions/${question.id}/draft`, { answer: 'Again.' }, creatorToken);
    assert.equal(redraft.status, 409);
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

    const invalid = await postJson(`${baseUrl}/api/v1/admin/content`, { ...lesson, quiz: [{ question: 'Gusa?', options: ['Imwe'], answerIndex: 3 }] }, creatorToken);
    assert.equal(invalid.status, 400);

    const created = await postJson(`${baseUrl}/api/v1/admin/content`, lesson, creatorToken);
    assert.equal(created.status, 201);
    const saved = (await created.json()).content;
    assert.equal(saved.imageUrl, '/images/plate.svg');
    assert.equal(saved.quiz.length, 1);
    assert.deepEqual(saved.curriculumIds, [diabetesPath.id]);
    assert.equal(saved.status, 'review', 'a writer cannot publish');

    // The specialist for diabetes approves, which publishes it into the path.
    const sugarToken = await makeSpecialist(baseUrl, 'dr.sugar@example.test', [3]);
    const approved = await postJson(`${baseUrl}/api/v1/review/lessons/${saved.id}`, { decision: 'approve' }, sugarToken);
    assert.equal(approved.status, 200, await approved.clone().text());

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

    // The admin created the disease but cannot publish a lesson about it.
    const adminTry = await patchJson(`${baseUrl}/api/v1/admin/content/${draft.id}/status`, { status: 'published' }, adminToken);
    assert.equal(adminTry.status, 403);

    const asthmaToken = await makeSpecialist(baseUrl, 'dr.asthma@example.test', [asthma.categoryId]);
    const published = await postJson(`${baseUrl}/api/v1/review/lessons/${draft.id}`, { decision: 'approve' }, asthmaToken);
    assert.equal(published.status, 200, await published.clone().text());
    path = (await (await fetch(`${baseUrl}/api/v1/curricula`)).json()).curricula.find((item) => item.id === asthma.id);
    assert.deepEqual(path.lessonIds, [draft.id]);
  } finally {
    server.close();
  }
});

test('Only the specialist for a disease can publish its lessons, and an admin cannot', async () => {
  const { server, baseUrl } = await startServer();
  const patchJson = (url, body, token) => fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  const login = async (email, password) => (await (await postJson(`${baseUrl}/api/v1/auth/login`, { email, password })).json()).token;
  try {
    // The admin creates specialists; each one needs at least one topic.
    const noTopics = await postJson(`${baseUrl}/api/v1/admin/creators`, {
      fullName: 'Dr. No Topic', email: 'no.topic@example.test', role: 'specialist'
    }, adminToken);
    assert.equal(noTopics.status, 400);
    const created = await postJson(`${baseUrl}/api/v1/admin/creators`, {
      fullName: 'Dr. Diabetes', email: 'dr.diabetes@example.test', role: 'specialist', topicIds: [3]
    }, adminToken);
    assert.equal(created.status, 201);
    assert.deepEqual((await acceptInvite(baseUrl, created, 'specialist-pass-1')).user.topicIds, [3]);
    const cancer = await postJson(`${baseUrl}/api/v1/admin/creators`, {
      fullName: 'Dr. Cancer', email: 'dr.cancer@example.test', role: 'specialist', topicIds: [5]
    }, adminToken);
    await acceptInvite(baseUrl, cancer, 'specialist-pass-1');
    const diabetesToken = await login('dr.diabetes@example.test', 'specialist-pass-1');
    const cancerToken = await login('dr.cancer@example.test', 'specialist-pass-1');

    const { staff } = await (await fetch(`${baseUrl}/api/v1/admin/creators`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();
    assert.deepEqual(staff.find((member) => member.email === 'dr.diabetes@example.test').topicIds, [3]);

    // A writer submits a diabetes lesson; the admin cannot publish it.
    const submitted = await postJson(`${baseUrl}/api/v1/admin/content`, {
      categoryId: 3,
      title: 'Isukari n\'imbuto',
      body: 'Imbuto zirimo isukari karemano.',
      status: 'review',
      audioUrl: '/api/v1/media/isukari.mp3',
      quiz: [{ question: 'Imbuto zirimo iki?', options: ['Isukari karemano', 'Umunyu'], answerIndex: 0, explanation: '' }]
    }, creatorToken);
    const lesson = (await submitted.json()).content;
    assert.equal(lesson.status, 'review');
    const earlyPublish = await patchJson(`${baseUrl}/api/v1/admin/content/${lesson.id}/status`, { status: 'published' }, adminToken);
    assert.equal(earlyPublish.status, 403);
    // Nor can a specialist for a different disease.
    const wrongSpecialist = await patchJson(`${baseUrl}/api/v1/admin/content/${lesson.id}/status`, { status: 'published' }, cancerToken);
    assert.equal(wrongSpecialist.status, 403);

    // Only specialists of that topic see and review it.
    const notMine = await postJson(`${baseUrl}/api/v1/review/lessons/${lesson.id}`, { decision: 'approve' }, cancerToken);
    assert.equal(notMine.status, 403);
    const creatorQueue = await fetch(`${baseUrl}/api/v1/review/queue`, { headers: { Authorization: `Bearer ${creatorToken}` } });
    assert.equal(creatorQueue.status, 403);
    const queue = (await (await fetch(`${baseUrl}/api/v1/review/queue`, { headers: { Authorization: `Bearer ${diabetesToken}` } })).json()).lessons;
    assert.ok(queue.some((item) => item.id === lesson.id && item.status === 'review'));

    // Specialist gets the audio and the quiz answers too.
    const forReview = queue.find((item) => item.id === lesson.id);
    assert.equal(forReview.audioUrl, '/api/v1/media/isukari.mp3', 'the specialist cannot hear the lesson');
    assert.equal(forReview.quiz.length, 1, 'the specialist cannot see the quiz');
    assert.equal(forReview.quiz[0].question, 'Imbuto zirimo iki?');
    assert.equal(forReview.quiz[0].options[forReview.quiz[0].answerIndex], 'Isukari karemano');

    // Asking for changes needs a note and sends the lesson back to the creator.
    const noNote = await postJson(`${baseUrl}/api/v1/review/lessons/${lesson.id}`, { decision: 'changes' }, diabetesToken);
    assert.equal(noNote.status, 400);
    const changes = await postJson(`${baseUrl}/api/v1/review/lessons/${lesson.id}`, { decision: 'changes', note: 'Vuga ko imbuto zifite fibre.' }, diabetesToken);
    const returned = (await changes.json()).lesson;
    assert.equal(returned.status, 'rejected');
    assert.equal(returned.reviewNote, 'Vuga ko imbuto zifite fibre.');

    const resubmitted = await patchJson(`${baseUrl}/api/v1/admin/content/${lesson.id}`, {
      categoryId: 3, title: 'Isukari n\'imbuto', body: 'Imbuto zirimo isukari karemano na fibre.', status: 'review'
    }, creatorToken);
    assert.equal((await resubmitted.json()).content.status, 'review');

    // Approval publishes the lesson.
    const approved = await postJson(`${baseUrl}/api/v1/review/lessons/${lesson.id}`, { decision: 'approve' }, diabetesToken);
    assert.equal((await approved.json()).lesson.status, 'published');
    const twice = await postJson(`${baseUrl}/api/v1/review/lessons/${lesson.id}`, { decision: 'approve' }, diabetesToken);
    assert.equal(twice.status, 409);

    const adminView = (await (await fetch(`${baseUrl}/api/v1/admin/content`, { headers: { Authorization: `Bearer ${adminToken}` } })).json()).content;
    assert.equal(adminView.find((item) => item.id === lesson.id).reviewerName, 'Dr. Diabetes');

    // The specialist can also take their own disease's lesson back off the platform.
    const unpublished = await patchJson(`${baseUrl}/api/v1/admin/content/${lesson.id}/status`, { status: 'rejected' }, diabetesToken);
    assert.equal(unpublished.status, 200);

    // An administrator cannot write a lesson at all.
    const adminLesson = await postJson(`${baseUrl}/api/v1/admin/content`, {
      categoryId: 3, title: 'Inkweto zikwiriye', body: 'Ambara inkweto zikwiriye.', status: 'published'
    }, adminToken);
    assert.equal(adminLesson.status, 403);

    // Without a specialist for the disease it cannot be published.
    const nutrition = await postJson(`${baseUrl}/api/v1/admin/content`, {
      categoryId: 2, title: 'Amazi', body: 'Nywa amazi.', status: 'published'
    }, creatorToken);
    assert.equal((await nutrition.json()).content.status, 'review');
  } finally {
    server.close();
  }
});

test('Staff upload a recorded lesson; only real audio is accepted and it is served back', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const upload = (body, token, type = 'audio/mpeg') => fetch(`${baseUrl}/api/v1/admin/media/audio`, {
      method: 'POST', headers: { 'Content-Type': type, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body
    });
    // An MP3 starts with an ID3 tag; the rest of the bytes are padding for the test.
    const mp3 = Buffer.concat([Buffer.from('ID3', 'latin1'), Buffer.from([4, 0, 0, 0, 0, 0, 0]), Buffer.alloc(2048, 1)]);

    assert.equal((await upload(mp3)).status, 401, 'anonymous');
    assert.equal((await upload(mp3, learnerToken)).status, 403, 'learner');
    assert.equal((await upload(Buffer.from('this is not audio, only text pretending'), adminToken)).status, 415, 'text renamed as audio');

    const saved = await upload(mp3, adminToken);
    assert.equal(saved.status, 201);
    const { url } = await saved.json();
    assert.match(url, /^\/api\/v1\/media\/[0-9a-f]{24}\.mp3$/);

    const served = await fetch(`${baseUrl}${url}`);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'audio/mpeg');
    assert.equal(Buffer.from(await served.arrayBuffer()).length, mp3.length);

    const partial = await fetch(`${baseUrl}${url}`, { headers: { Range: 'bytes=0-99' } });
    assert.equal(partial.status, 206, 'byte ranges let the player seek');

    assert.equal((await fetch(`${baseUrl}/api/v1/media/missing.mp3`)).status, 404);
  } finally {
    server.close();
  }
});

test('A lesson with no recording can be voiced by the server, and learners are told', async () => {
  const { server, baseUrl } = await startServer();
  const { writeFileSync } = await import('node:fs');
  // A stand-in voice: ignores the text, writes a valid silent WAV.
  const fakeVoice = join(process.env.MEDIA_DIR, '..', 'fake-voice.cjs');
  writeFileSync(fakeVoice, [
    "let said = '';",
    "process.stdin.on('data', (c) => { said += c; });",
    "process.stdin.on('end', () => {",
    "  if (!said.trim()) { process.exit(2); }",
    "  const samples = 1024;",
    "  const b = Buffer.alloc(44 + samples * 2);",
    "  b.write('RIFF'); b.writeUInt32LE(36 + samples * 2, 4); b.write('WAVE', 8);",
    "  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);",
    "  b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);",
    "  b.write('data', 36); b.writeUInt32LE(samples * 2, 40);",
    "  process.stdout.write(b);",
    "});"
  ].join('\n'));

  const generate = (body, token) => postJson(`${baseUrl}/api/v1/admin/media/audio/generate`, body, token);
  const lesson = { title: 'Kugabanya umunyu', body: 'Gabanya umunyu mu mirire yawe. Nywa amazi ahagije.' };

  try {
    // Voicing a lesson is writing it, so the same people may do it.
    assert.equal((await generate(lesson)).status, 401, 'anonymous');
    assert.equal((await generate(lesson, learnerToken)).status, 403, 'learner');
    assert.equal((await generate(lesson, adminToken)).status, 403, 'administrators take no part in lesson content');

    // No voice installed is the default, and it is not an error the writer caused.
    delete process.env.TTS_COMMAND;
    const unavailable = await generate(lesson, creatorToken);
    assert.equal(unavailable.status, 503);
    assert.match((await unavailable.json()).message, /recording/);

    process.env.TTS_COMMAND = `node ${fakeVoice}`;
    assert.equal((await generate({ title: '', body: '   ' }, creatorToken)).status, 400, 'nothing to say');

    const made = await generate(lesson, creatorToken);
    assert.equal(made.status, 201);
    const { url, synthetic } = await made.json();
    assert.equal(synthetic, true);
    assert.match(url, /^\/api\/v1\/media\/[0-9a-f]{24}\.wav$/);

    const served = await fetch(`${baseUrl}${url}`);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'audio/wav');

    // The lesson remembers that its voice is not a person's, so the learner screen can say so.
    const saved = await postJson(`${baseUrl}/api/v1/admin/content`, {
      categoryId: 1, title: lesson.title, body: lesson.body, audioUrl: url, audioIsSynthetic: true
    }, creatorToken);
    assert.equal(saved.status, 201);
    assert.equal((await saved.json()).content.audioIsSynthetic, true);
  } finally {
    delete process.env.TTS_COMMAND;
    server.close();
  }
});

test('The voice can run as its own service, and a bad one fails only that request', async () => {
  const { server, baseUrl } = await startServer();
  const { createServer } = await import('node:http');
  const wav = () => {
    const samples = 512;
    const b = Buffer.alloc(44 + samples * 2);
    b.write('RIFF'); b.writeUInt32LE(36 + samples * 2, 4); b.write('WAVE', 8);
    b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
    b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
    b.write('data', 36); b.writeUInt32LE(samples * 2, 40);
    return b;
  };

  let heard = '';
  let answer = 'audio';
  const voice = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      heard = body;
      if (answer === 'audio') { res.writeHead(200, { 'Content-Type': 'audio/wav' }); return res.end(wav()); }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('synthesis failed');
    });
  });
  await new Promise((resolve) => voice.listen(0, '127.0.0.1', resolve));
  process.env.TTS_URL = `http://127.0.0.1:${voice.address().port}/speak`;

  const generate = (body, token) => postJson(`${baseUrl}/api/v1/admin/media/audio/generate`, body, token);
  const lesson = { title: 'Umunyu', body: 'Gabanya umunyu mu mirire yawe.' };

  try {
    const made = await generate(lesson, creatorToken);
    assert.equal(made.status, 201);
    assert.match((await made.json()).url, /\.wav$/);
    assert.equal(heard, 'Umunyu. Gabanya umunyu mu mirire yawe.', 'the service is sent the spoken text, not the markup');

    answer = 'error';
    assert.equal((await generate(lesson, creatorToken)).status, 503, 'a broken voice is not a broken site');

    voice.close();
    assert.equal((await generate(lesson, creatorToken)).status, 503, 'nor is an absent one');

    // Lessons, learners and the rest of the API carry on regardless.
    assert.equal((await fetch(`${baseUrl}/api/v1/content`)).status, 200);
  } finally {
    delete process.env.TTS_URL;
    voice.close();
    server.close();
  }
});

test('A forgotten staff password is reset through a one-time emailed link', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const email = 'seeded-admin@example.test';

    // The answer never says whether the address belongs to an account.
    const unknown = await postJson(`${baseUrl}/api/v1/auth/forgot-password`, { email: 'nobody@example.test' });
    assert.equal(unknown.status, 200);
    const unknownBody = await unknown.json();
    assert.equal(unknownBody.resetLink, undefined);

    const requested = await postJson(`${baseUrl}/api/v1/auth/forgot-password`, { email });
    assert.equal(requested.status, 200);
    const requestedBody = await requested.json();
    assert.equal(requestedBody.message, unknownBody.message);
    // No SMTP server is configured in tests, so the link comes back instead.
    assert.ok(requestedBody.resetLink, 'the reset link is returned when email is not configured');
    const token = new URL(requestedBody.resetLink).searchParams.get('reset');
    assert.ok(token && token.length >= 32);

    // A missing address is refused outright.
    const noEmail = await postJson(`${baseUrl}/api/v1/auth/forgot-password`, {});
    assert.equal(noEmail.status, 400);

    // The new password must be long enough, and the token survives a refusal.
    const tooShort = await postJson(`${baseUrl}/api/v1/auth/reset-password`, { token, password: 'short' });
    assert.equal(tooShort.status, 400);

    const unknownToken = await postJson(`${baseUrl}/api/v1/auth/reset-password`, {
      token: 'f'.repeat(64),
      password: 'a-brand-new-password'
    });
    assert.equal(unknownToken.status, 400);

    const changed = await postJson(`${baseUrl}/api/v1/auth/reset-password`, {
      token,
      password: 'a-brand-new-password'
    });
    assert.equal(changed.status, 200);

    // The old password no longer works and the new one does.
    const oldPassword = await postJson(`${baseUrl}/api/v1/auth/login`, {
      identifier: email,
      password: 'seeded-admin-pass-123'
    });
    assert.equal(oldPassword.status, 401);

    const newPassword = await postJson(`${baseUrl}/api/v1/auth/login`, {
      identifier: email,
      password: 'a-brand-new-password'
    });
    assert.equal(newPassword.status, 200);
    const session = await newPassword.json();
    assert.equal(session.user.role, 'admin');
    adminToken = session.token;

    // The link cannot be used twice.
    const replayed = await postJson(`${baseUrl}/api/v1/auth/reset-password`, {
      token,
      password: 'another-password-entirely'
    });
    assert.equal(replayed.status, 400);
  } finally {
    server.close();
  }
});

test('An admin finds a learner and gives them a new PIN', async () => {
  const { server, baseUrl } = await startServer();
  const getJson = (path, token) => fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  try {
    // Only admins may see learner accounts.
    assert.equal((await getJson('/api/v1/admin/learners')).status, 401);
    assert.equal((await getJson('/api/v1/admin/learners', learnerToken)).status, 403);

    const listed = await getJson('/api/v1/admin/learners', adminToken);
    assert.equal(listed.status, 200);
    const { learners } = await listed.json();
    const learner = learners.find((entry) => entry.phone === '+250781234567');
    assert.ok(learner, 'the registered learner is listed');
    // Staff accounts are not learners and never appear here.
    assert.ok(!learners.some((entry) => entry.phone === null));

    // The list can be searched by phone number, however it is written.
    const searched = await getJson('/api/v1/admin/learners?search=078%20123%204567', adminToken);
    const searchedBody = await searched.json();
    assert.equal(searchedBody.learners.length, 1);
    assert.equal(searchedBody.learners[0].id, learner.id);

    // A learner cannot reset their own PIN this way.
    const forbidden = await postJson(`${baseUrl}/api/v1/admin/learners/${learner.id}/pin`, {}, learnerToken);
    assert.equal(forbidden.status, 403);

    // A PIN that is not 4 to 6 digits is refused.
    const badPin = await postJson(`${baseUrl}/api/v1/admin/learners/${learner.id}/pin`, { pin: '12' }, adminToken);
    assert.equal(badPin.status, 400);

    // Asking without a PIN generates one and returns it once.
    const generated = await postJson(`${baseUrl}/api/v1/admin/learners/${learner.id}/pin`, {}, adminToken);
    assert.equal(generated.status, 200);
    const issued = await generated.json();
    assert.match(issued.pin, /^[1-9][0-9]{4}$/);

    const oldPin = await postJson(`${baseUrl}/api/v1/auth/login`, { identifier: '0781234567', password: '2580' });
    assert.equal(oldPin.status, 401);

    const newPin = await postJson(`${baseUrl}/api/v1/auth/login`, { identifier: '0781234567', password: issued.pin });
    assert.equal(newPin.status, 200);
    learnerToken = (await newPin.json()).token;

    // An unknown learner, and a staff account, are both refused.
    assert.equal((await postJson(`${baseUrl}/api/v1/admin/learners/999999/pin`, {}, adminToken)).status, 404);
    const staffList = await getJson('/api/v1/admin/creators', adminToken);
    const staffId = (await staffList.json()).staff[0].id;
    const staffTarget = await postJson(`${baseUrl}/api/v1/admin/learners/${staffId}/pin`, {}, adminToken);
    assert.equal(staffTarget.status, 400);
  } finally {
    server.close();
  }
});

test('A learner changes their own PIN, and staff their own password', async () => {
  const { server, baseUrl } = await startServer();
  try {
    // The current PIN has to be right.
    const wrongCurrent = await postJson(`${baseUrl}/api/v1/auth/change-password`, {
      current: '0000', next: '2468'
    }, learnerToken);
    assert.equal(wrongCurrent.status, 401);

    // The PIN set by the admin in the previous test is the current one.
    const listed = await fetch(`${baseUrl}/api/v1/admin/learners?search=0781234567`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const target = (await listed.json()).learners[0];
    const reissued = await postJson(`${baseUrl}/api/v1/admin/learners/${target.id}/pin`, { pin: '5555' }, adminToken);
    assert.equal(reissued.status, 200);

    const signedIn = await postJson(`${baseUrl}/api/v1/auth/login`, { identifier: '0781234567', password: '5555' });
    const token = (await signedIn.json()).token;

    // A new PIN must be 4 to 6 digits and different from the current one.
    assert.equal((await postJson(`${baseUrl}/api/v1/auth/change-password`, { current: '5555', next: '12' }, token)).status, 400);
    assert.equal((await postJson(`${baseUrl}/api/v1/auth/change-password`, { current: '5555', next: '5555' }, token)).status, 400);
    // A learner cannot set a long password instead of a PIN.
    assert.equal((await postJson(`${baseUrl}/api/v1/auth/change-password`, { current: '5555', next: 'a-long-password' }, token)).status, 400);

    const changed = await postJson(`${baseUrl}/api/v1/auth/change-password`, { current: '5555', next: '2468' }, token);
    assert.equal(changed.status, 200);

    assert.equal((await postJson(`${baseUrl}/api/v1/auth/login`, { identifier: '0781234567', password: '5555' })).status, 401);
    const withNew = await postJson(`${baseUrl}/api/v1/auth/login`, { identifier: '0781234567', password: '2468' });
    assert.equal(withNew.status, 200);

    // Staff send a password, which is held to the longer rule.
    assert.equal((await postJson(`${baseUrl}/api/v1/auth/change-password`, {
      current: 'a-brand-new-password', next: '1234'
    }, adminToken)).status, 400);
    const staffChanged = await postJson(`${baseUrl}/api/v1/auth/change-password`, {
      current: 'a-brand-new-password', next: 'an-even-newer-password'
    }, adminToken);
    assert.equal(staffChanged.status, 200);

    // Signing in without a token is still required for this endpoint.
    assert.equal((await postJson(`${baseUrl}/api/v1/auth/change-password`, { current: 'x', next: 'y' })).status, 401);
  } finally {
    server.close();
  }
});

// Optional learner email.
test('A learner can add and remove an optional email address', async () => {
  const { server, baseUrl } = await startServer();
  const patchJson = (url, body, token) => fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });

  try {
    const signIn = await postJson(`${baseUrl}/api/v1/auth/login`, { identifier: '0781234567', password: '2468' });
    assert.equal(signIn.status, 200, await signIn.clone().text());
    const learner = (await signIn.json()).token;

    assert.equal((await patchJson(`${baseUrl}/api/v1/profile/email`, { email: 'not-an-address' }, learner)).status, 400);

    const saved = await patchJson(`${baseUrl}/api/v1/profile/email`, { email: 'Learner.One@Example.Test' }, learner);
    assert.equal(saved.status, 200, await saved.clone().text());
    // Stored in lowercase, so the same address can't be added twice.
    assert.equal((await saved.json()).user.email, 'learner.one@example.test');

    // It has to stay unique.
    const byEmail = await postJson(`${baseUrl}/api/v1/auth/login`, { identifier: 'learner.one@example.test', password: '2468' });
    assert.equal(byEmail.status, 200, await byEmail.clone().text());

    const second = await postJson(`${baseUrl}/api/v1/auth/register`, { name: 'Learner Two', phone: '0788000111', pin: '1357' });
    assert.equal(second.status, 201, await second.clone().text());
    const taken = await patchJson(`${baseUrl}/api/v1/profile/email`, { email: 'learner.one@example.test' }, (await second.json()).token);
    assert.equal(taken.status, 409);

    // Staff can't change their sign-in email here.
    assert.equal((await patchJson(`${baseUrl}/api/v1/profile/email`, { email: 'elsewhere@example.test' }, adminToken)).status, 403);

    const removed = await patchJson(`${baseUrl}/api/v1/profile/email`, { email: '' }, learner);
    assert.equal(removed.status, 200, await removed.clone().text());
    assert.equal((await removed.json()).user.email, null);

    assert.equal((await patchJson(`${baseUrl}/api/v1/profile/email`, { email: 'x@example.test' })).status, 401);
  } finally {
    server.close();
  }
});

// Web push is off in demo mode.
test('Push notifications are declared off when the server is not set up for them', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const key = await fetch(`${baseUrl}/api/v1/push/key`);
    assert.equal(key.status, 200);
    const published = await key.json();
    assert.equal(published.enabled, false);
    assert.equal(published.key, null);

    const signIn = await postJson(`${baseUrl}/api/v1/auth/login`, { identifier: '0781234567', password: '2468' });
    const learner = (await signIn.json()).token;

    const status = await fetch(`${baseUrl}/api/v1/push/status`, { headers: { Authorization: `Bearer ${learner}` } });
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { enabled: false, devices: false });

    const device = { endpoint: 'https://push.example.test/abc', keys: { p256dh: 'key', auth: 'auth' } };
    const offered = await postJson(`${baseUrl}/api/v1/push/subscribe`, { subscription: device }, learner);
    assert.equal(offered.status, 503, await offered.clone().text());

    // Needs a signed-in user.
    assert.equal((await postJson(`${baseUrl}/api/v1/push/subscribe`, { subscription: device })).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/v1/push/status`)).status, 401);
    assert.equal((await postJson(`${baseUrl}/api/v1/push/unsubscribe`, { endpoint: device.endpoint })).status, 401);
  } finally {
    server.close();
  }
});

// Specialists see and edit lessons on their diseases only.
test('A specialist owns the lessons on their own diseases, and only those', async () => {
  const { server, baseUrl } = await startServer();
  const patchJson = (url, body, token) => fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  const signIn = async (email) => (await (await postJson(`${baseUrl}/api/v1/auth/login`, { email, password: 'specialist-pass-1' })).json()).token;

  try {
    const diabetes = await signIn('dr.diabetes@example.test');   // topic 3
    const cancer = await signIn('dr.cancer@example.test');       // topic 5

    const mine = (await (await fetch(`${baseUrl}/api/v1/admin/content`, { headers: { Authorization: `Bearer ${diabetes}` } })).json()).content;
    assert.ok(mine.length > 0, 'the specialist sees nothing at all');
    assert.ok(mine.every((lesson) => lesson.categoryId === 3), 'the specialist sees lessons outside their specialty');

    // A writer's lesson on that disease.
    const written = (await (await postJson(`${baseUrl}/api/v1/admin/content`, {
      categoryId: 3, title: 'Kugenzura isukari', body: 'Ibanze ku kugenzura isukari buri munsi.', status: 'draft'
    }, creatorToken)).json()).content;

    // The specialist can edit it and add a recording.
    const corrected = await patchJson(`${baseUrl}/api/v1/admin/content/${written.id}`, {
      categoryId: 3,
      title: 'Kugenzura isukari',
      body: 'Ibanze ku kugenzura isukari buri munsi, nk\'uko muganga abigusaba.',
      audioUrl: '/api/v1/media/isukari-nshya.mp3'
    }, diabetes);
    assert.equal(corrected.status, 200, await corrected.clone().text());
    assert.equal((await corrected.json()).content.audioUrl, '/api/v1/media/isukari-nshya.mp3');

    // and publish it directly.
    const published = await patchJson(`${baseUrl}/api/v1/admin/content/${written.id}/status`, { status: 'published' }, diabetes);
    assert.equal(published.status, 200, await published.clone().text());
    assert.equal((await published.json()).content.status, 'published');

    // Published lessons can still be edited by them.
    const again = await patchJson(`${baseUrl}/api/v1/admin/content/${written.id}`, {
      categoryId: 3, title: 'Kugenzura isukari', body: 'Ibanze ku kugenzura isukari buri munsi.'
    }, diabetes);
    assert.equal(again.status, 200, await again.clone().text());

    // A specialist for another disease can't do any of this.
    const notTheirs = await patchJson(`${baseUrl}/api/v1/admin/content/${written.id}`, {
      categoryId: 3, title: 'Kugenzura isukari', body: 'Nta cyo mbivugaho.'
    }, cancer);
    assert.equal(notTheirs.status, 403);
    assert.equal((await patchJson(`${baseUrl}/api/v1/admin/content/${written.id}/status`, { status: 'draft' }, cancer)).status, 403);

    // The admin still can't publish.
    assert.equal((await patchJson(`${baseUrl}/api/v1/admin/content/${written.id}/status`, { status: 'published' }, adminToken)).status, 403);
  } finally {
    server.close();
  }
});
