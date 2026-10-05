import type { Curriculum, Lesson } from '../../types';
import { AudioPlayer } from '../AudioPlayer';
import { Disclaimer } from '../ui';

// NCD module. Diseases come from the API, so a disease added by staff appears
// here with its information and the lessons written for it.
export function NcdScreen({
  diseases,
  lessons,
  completedLessons,
  selectedTopic,
  onSelectTopic,
  onOpenLesson,
  onStartCheckup
}: {
  diseases: Curriculum[];
  lessons: Lesson[];
  completedLessons: number[];
  selectedTopic: number;
  onSelectTopic: (index: number) => void;
  onOpenLesson: (lesson: Lesson) => void;
  onStartCheckup: () => void;
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
    <div className="screen dynamic-screen ncd-screen">
      <div className="panel-section">
        <p className="eyebrow">Indwara zitandura</p>
        <h2>Menya, wirinde</h2>
        <p className="screen-intro">Hitamo indwara wifuza kumenyaho byinshi.</p>
        <div className="module-grid">
          {diseases.map((item, index) => (
            <button
              key={item.id}
              className={`module-card ${disease.id === item.id ? 'active' : ''}`}
              aria-pressed={disease.id === item.id}
              onClick={() => onSelectTopic(index)}
            >
              <span className="module-icon" aria-hidden="true">{item.icon || '✚'}</span>
              <span>{item.condition}</span>
            </button>
          ))}
        </div>
        <div className="checkup-callout">
          <strong>Gerageza ubumenyi bwawe</strong>
          <p>Ibibazo 5 byoroshye. Bikora mbere na nyuma yo kwiga.</p>
          <button className="primary" onClick={onStartCheckup}>Tangira isuzuma</button>
        </div>
      </div>

      <div className="panel-section ncd-detail">
        {disease.imageUrl && <img className="lesson-image" src={disease.imageUrl} alt="" />}
        <p className="eyebrow">Indwara</p>
        <h3>{disease.condition}</h3>
        <p>{disease.about}</p>
        <AudioPlayer text={narration} />
        <div className="ncd-columns">
          <section className="ncd-block risk">
            <h4>Ibyongera ibyago</h4>
            <ul>{disease.riskFactors.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section className="ncd-block warning">
            <h4>Ibimenyetso</h4>
            <ul>{disease.warningSigns.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section className="ncd-block prevent">
            <h4>Uko wayirinda</h4>
            <ul>{disease.prevention.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>

        {diseaseLessons.length > 0 && (
          <section className="disease-lessons">
            <h4>Amasomo kuri {disease.condition} ({diseaseLessons.length})</h4>
            {diseaseLessons.map((lesson, index) => (
              <button key={lesson.id} className="disease-lesson" onClick={() => onOpenLesson(lesson)}>
                <span className={`lesson-check ${completedLessons.includes(lesson.id) ? 'done' : ''}`}>
                  {completedLessons.includes(lesson.id) ? '✓' : index + 1}
                </span>
                <span>{lesson.title}</span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </section>
        )}
        <Disclaimer />
      </div>
    </div>
  );
}
