import type { Curriculum, Lesson } from '../../types';

// Public home page. The diseases and newest lessons come from the API (or the
// copy kept on the phone), so the page shows what is actually published.
export function LandingScreen({
  returning,
  diseases,
  lessons,
  onStart,
  onRegister,
  onSignIn,
  onStaffSignIn,
  onOpenDisease,
  onOpenLesson
}: {
  returning: boolean;
  diseases: Curriculum[];
  lessons: Lesson[];
  onStart: () => void;
  onRegister: () => void;
  onSignIn: () => void;
  onStaffSignIn: () => void;
  onOpenDisease: (index: number) => void;
  onOpenLesson: (lesson: Lesson) => void;
}) {
  const newestLessons = [...lessons].sort((a, b) => b.id - a.id).slice(0, 3);
  const firstSentence = (text: string) => text.split(/(?<=\.)\s/)[0];

  return (
    <>
      <section className="landing-banner">
        <div className="container">
          <div>
            <h1>Inyigisho ku ndwara zitandura, mu Kinyarwanda</h1>
            <p className="lead">
              Baho igufasha kumenya no kwirinda indwara zirimo umuvuduko w'amaraso ukabije, diyabete, indwara z'umutima na kanseri. Amasomo ni magufi, afite amajwi n'amashusho, kandi akora no mu gihe nta internet iyo yabitswe.
            </p>
            <div className="row">
              <button className="btn btn-primary" onClick={onStart}>{returning ? 'Komeza kwiga' : 'Tangira kwiga'}</button>
              <button className="btn btn-secondary" onClick={onRegister}>Fungura konti ukoresheje telefoni</button>
            </div>
            <p className="muted small" style={{ marginTop: 12 }}>
              Ni ubuntu kandi ushobora gukoresha Baho nta konti. Usanzwe ufite konti? <button className="btn-link" onClick={onSignIn}>Injira</button>
            </p>
          </div>
          <figure>
            <img src="/images/bp-check.svg" alt="Umuntu apimwa umuvuduko w'amaraso" />
            <figcaption>Isomo: Gupima umuvuduko w'amaraso</figcaption>
          </figure>
        </div>
      </section>

      {diseases.length > 0 && (
        <section className="landing-section">
          <div className="container stack">
            <div className="section-head">
              <h2>Indwara wakwiga</h2>
              <p className="muted">Hitamo indwara umenye icyo ari cyo, ibimenyetso byayo n'uko wayirinda.</p>
            </div>
            <div className="grid-4">
              {diseases.map((disease, index) => (
                <button key={disease.id} className="disease-link" onClick={() => onOpenDisease(index)}>
                  <strong>{disease.condition}</strong>
                  <span>{firstSentence(disease.about)}</span>
                  <small>Amasomo {disease.lessonIds.length}</small>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {newestLessons.length > 0 && (
        <section className="landing-section" style={{ paddingTop: 0 }}>
          <div className="container stack">
            <div className="section-head">
              <h2>Amasomo mashya</h2>
              <p className="muted">Buri somo ryanditswe n'abakozi b'ubuzima kandi ryasuzumwe mbere yo gusohoka.</p>
            </div>
            <div className="grid-3">
              {newestLessons.map((lesson) => (
                <article key={lesson.id} className="panel lesson-teaser">
                  {lesson.imageUrl && <img src={lesson.imageUrl} alt="" />}
                  <div className="panel-body">
                    <span className="badge">{lesson.category}</span>
                    <h3>{lesson.title}</h3>
                    <p className="small muted">{lesson.summary}</p>
                    <button className="btn btn-secondary btn-sm" onClick={() => onOpenLesson(lesson)}>Soma isomo</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="container grid-3">
          <div className="panel">
            <div className="panel-head"><h2>Uko bikora</h2></div>
            <div className="panel-body">
              <ol className="steps">
                <li>Hitamo ingingo zigushishikaje, wandike izina ryawe.</li>
                <li>Ushobora no kuzuza umwirondoro w'ubuzima. Ayo makuru aguma ku gikoresho cyawe cy'ikoranabuhanga.</li>
                <li>Kurikira gahunda yawe: umva isomo, ukore isuzuma rito, urebe aho ugeze wiga.</li>
              </ol>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><h2>Konti na telefoni</h2></div>
            <div className="panel-body stack-sm">
              <p className="small">Ukeneye nimero ya telefoni na PIN gusa, nta meyili. Konti ibika aho ugeze, amanota n'ibyibutsa, kandi igufasha kubaza inzobere.</p>
              <p className="small">Baho ikora no mu gihe nta internet. Kuri telefoni, kanda <strong>Add to home screen</strong> muri Chrome kugira ngo uyibone nka porogaramu.</p>
            </div>
          </div>
          <div className="panel" lang="en">
            <div className="panel-head"><h2>For health workers</h2></div>
            <div className="panel-body stack-sm">
              <p className="small">Writers draft lessons, a specialist for each disease approves them, and an admin publishes them. Staff accounts are created by an admin.</p>
              <div><button className="btn btn-secondary btn-sm" onClick={onStaffSignIn}>Staff sign-in</button></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
