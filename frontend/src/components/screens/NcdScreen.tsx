import type { Curriculum, Lesson } from '../../types';
import { AudioPlayer } from '../AudioPlayer';
import { Disclaimer, PageHeader } from '../ui';

// NCD module. Diseases come from the API, so a disease added by staff appears
// here with its information and the lessons written for it.
export function NcdScreen({
  diseases,
  lessons,
  completedLessons,
  selectedTopic,
  onSelectTopic,
  onOpenLesson,
  onStartCheckup,
  onHome
}: {
  diseases: Curriculum[];
  lessons: Lesson[];
  completedLessons: number[];
  selectedTopic: number;
  onSelectTopic: (index: number) => void;
  onOpenLesson: (lesson: Lesson) => void;
  onStartCheckup: () => void;
  onHome: () => void;
}) {
  const disease = diseases[selectedTopic] ?? diseases[0];
  if (!disease) return null;
  const diseaseLessons = disease.lessonIds
    .map((id) => lessons.find((lesson) => lesson.id === id))
    .filter((lesson): lesson is Lesson => Boolean(lesson));
  const narration = [
    disease.condition,
    disease.about,
    `Ibyongera ibyago: ${disease.riskFactors.join(', ')}.`,
    `Ibimenyetso: ${disease.warningSigns.join(', ')}.`,
    `Uko wayirinda: ${disease.prevention.join(', ')}.`
  ].join(' ');

  return (
    <div className="container">
      <PageHeader
        crumbs={[{ label: 'Ahabanza', onClick: onHome }, { label: 'Indwara zitandura' }, { label: disease.condition ?? '' }]}
        title="Indwara zitandura"
        lead="Menya buri ndwara: icyo ari cyo, ibyongera ibyago, ibimenyetso n'uko wayirinda."
      />
      <div className="layout-aside-main">
        <aside className="stack">
          <section className="panel">
            <div className="panel-head"><h2>Indwara</h2></div>
            <ul className="list">
              {diseases.map((item, index) => (
                <li key={item.id}>
                  <button className={`list-button ${disease.id === item.id ? 'current' : ''}`} aria-pressed={disease.id === item.id} onClick={() => onSelectTopic(index)}>
                    <span className="grow"><strong>{item.condition}</strong><small>Amasomo {item.lessonIds.length}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <div className="panel-head"><h2>Isuzuma ry'ubumenyi</h2></div>
            <div className="panel-body">
              <p className="small">Ibibazo 5 byoroshye. Bikore mbere na nyuma yo kwiga urebe aho watereye imbere.</p>
              <button className="btn btn-primary btn-sm" onClick={onStartCheckup}>Tangira isuzuma</button>
            </div>
          </section>
        </aside>

        <article className="panel">
          <div className="panel-body">
            {disease.imageUrl && <figure className="article-figure"><img src={disease.imageUrl} alt="" /></figure>}
            <h2 style={{ fontSize: '1.4rem' }}>{disease.condition}</h2>
            <div className="article-body" style={{ marginTop: 8 }}><p>{disease.about}</p></div>
            <AudioPlayer text={narration} />

            <h3 className="section-title">Ibyongera ibyago</h3>
            <ul className="fact-list">{disease.riskFactors.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3 className="section-title">Ibimenyetso byo kwitondera</h3>
            <ul className="fact-list">{disease.warningSigns.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3 className="section-title">Uko wayirinda</h3>
            <ul className="fact-list">{disease.prevention.map((item) => <li key={item}>{item}</li>)}</ul>

            {diseaseLessons.length > 0 && (
              <>
                <h3 className="section-title">Amasomo kuri {disease.condition}</h3>
                <table className="table">
                  <tbody>
                    {diseaseLessons.map((lesson, index) => (
                      <tr key={lesson.id}>
                        <td style={{ width: 32 }}>{index + 1}.</td>
                        <td><strong>{lesson.title}</strong><div className="small muted">{lesson.summary}</div></td>
                        <td className="right">
                          {completedLessons.includes(lesson.id) && <span className="badge badge-success" style={{ marginRight: 8 }}>Ryarangiye</span>}
                          <button className="btn btn-secondary btn-sm" onClick={() => onOpenLesson(lesson)}>Fungura</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <div style={{ marginTop: 16 }}><Disclaimer /></div>
          </div>
        </article>
      </div>
    </div>
  );
}
