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

    const response = await postJson(`${baseUrl}/api/v1/auth/setup-admin`, {
      name: 'Baho Admin',
      email: 'admin@example.test',
      password: 'admin-pass-123'
    });
    assert.equal(response.status, 409);

    const statusResponse = await fetch(`${baseUrl}/api/v1/auth/setup-status`);
    assert.equal((await statusResponse.json()).setupNeeded, false);
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
      role: 'admin'
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
