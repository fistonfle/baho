// Creates (or removes) demo staff accounts and lessons so the staff screens have
// something to show, and writes their sign-in tokens to a file.
//   node scripts/evidence/staging.mjs <api-url> setup <sessions.json>
//   node scripts/evidence/staging.mjs <api-url> cleanup
// The admin signs in with BAHO_ADMIN_* from backend/.env; the cleanup deletes only
// the accounts below (and their lessons) from the database in DATABASE_URL.
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'backend');
const require = createRequire(join(backend, 'package.json'));
require('dotenv').config({ path: join(backend, '.env') });

const [api, action, out] = process.argv.slice(2);
const writer = { fullName: 'Mugisha Jean (demo)', email: 'writer.demo@baho.local', role: 'creator' };
const specialist = { fullName: 'Dr. Uwase Alice (demo)', email: 'specialist.demo@baho.local', role: 'specialist' };
const learnerPhone = '+250789990002';

const call = async (path, body, token) => {
  const response = await fetch(`${api}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};
const login = async (identifier, password) => {
  const result = await call('/auth/login', { identifier, password });
  if (result.status !== 200) throw new Error(`login failed for ${identifier}: ${result.status}`);
  return result.body;
};

if (action === 'setup') {
  const password = randomBytes(12).toString('hex');
  const pin = String(100000 + (randomBytes(3).readUIntBE(0, 3) % 900000));
  const admin = await login(process.env.BAHO_ADMIN_EMAIL, process.env.BAHO_ADMIN_PASSWORD);
  for (const member of [writer, { ...specialist, topicIds: [3, 2] }]) {
    await call('/admin/creators', { ...member, password }, admin.token);
  }
  const writerSession = await login(writer.email, password);
  const lessons = [
    { title: 'Kurya neza ufite diyabete', summary: 'Ibiryo bifasha kugumana isukari ku rugero.', body: 'Rya imboga nyinshi, ibinyampeke byuzuye n\'imbuto. Gabanya isukari n\'ibinyobwa biryohereye. Rya ku masaha amwe buri munsi.' },
    { title: 'Kwipimisha umuvuduko w\'amaraso mu rugo', summary: 'Uko wakoresha akuma ko gupima mu rugo.', body: 'Icara iminota itanu mbere yo gupima. Shyira akuma ku kuboko kw\'ibumoso. Andika imibare ubone, uyereke muganga.' }
  ];
  const created = [];
  for (const [index, lesson] of lessons.entries()) {
    const result = await call('/admin/content', {
      ...lesson, categoryId: index === 0 ? 3 : 2, status: 'review', imageUrl: index === 0 ? '/images/plate.jpg' : '/images/bp-check.jpg',
      quiz: [{ question: 'Ni iki cyiza ku murwayi wa diyabete?', options: ['Imboga n\'imbuto', 'Soda nyinshi'], answerIndex: 0, explanation: 'Imboga n\'imbuto bifasha.' }],
      curriculumIds: []
    }, writerSession.token);
    created.push(result.body.content.id);
  }
  const specialistSession = await login(specialist.email, password);
  await call(`/review/lessons/${created[1]}`, { decision: 'approve', note: 'Byasuzumwe, nta kosa.' }, specialistSession.token);
  // A third lesson stays in the specialist's queue for the review screenshot.
  await call('/admin/content', { title: 'Isukari nke mu gitondo', summary: 'Ibimenyetso by\'isukari nke.', body: 'Iyo isukari igabanutse cyane ushobora kugira isereri no gutitira. Rya ikintu kirimo isukari vuba, hanyuma ubaze muganga.', categoryId: 3, status: 'review', quiz: [], curriculumIds: [] }, writerSession.token);
  await call('/auth/register', { name: 'Uwase Marie', phone: learnerPhone, pin });
  const learner = await login(learnerPhone, pin);
  writeFileSync(out, JSON.stringify({ admin, specialist: specialistSession, writer: writerSession, learner }));
  console.log('staged: writer, specialist, learner and 3 lessons');
}

if (action === 'cleanup') {
  const pool = new (require('pg').Pool)({ connectionString: process.env.DATABASE_URL });
  const ids = (await pool.query('SELECT id FROM users WHERE email = ANY($1) OR phone = $2', [[writer.email, specialist.email], learnerPhone])).rows.map((row) => row.id);
  const lessons = await pool.query('DELETE FROM content WHERE creator_id = ANY($1::int[]) OR reviewed_by = ANY($1::int[])', [ids]);
  const users = await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [ids]);
  await pool.end();
  console.log(`removed ${users.rowCount} demo accounts and ${lessons.rowCount} demo lessons`);
}
