// Full lesson as a reviewer sees it, including the quiz answers.
import { AudioPlayer } from '../AudioPlayer';
import {
  type AdminContentItem
} from '../../store/appSlice';
import { Photo } from '../ui';

export function LessonPreview({ lesson }: { lesson: Pick<AdminContentItem, 'imageUrl' | 'summary' | 'body' | 'quiz' | 'audioUrl'> }) {
  return (
    <div className="preview-box stack-sm">
      {lesson.imageUrl && <Photo src={lesson.imageUrl} lazy />}
      {lesson.summary && <p><strong>{lesson.summary}</strong></p>}
      <AudioPlayer audioUrl={lesson.audioUrl} />
      <p style={{ whiteSpace: 'pre-line' }}>{lesson.body}</p>
      {lesson.quiz && lesson.quiz.length > 0 && (
        <div>
          <strong className="small">Quiz ({lesson.quiz.length})</strong>
          <ol className="small">
            {lesson.quiz.map((question, index) => (
              <li key={index}>{question.question} <span className="muted">Answer: {question.options[question.answerIndex]}</span></li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
