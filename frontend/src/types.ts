// A topic name. Topics are lesson categories, so staff can add new ones (e.g. a new disease).
export type Interest = string;

export type Category = { id: number; name: string; slug: string };

export type QuizQuestion = {
  id?: number | string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type Lesson = {
  id: number;
  title: string;
  categoryId: number;
  category: string;
  summary: string;
  body: string;
  duration: string;
  audioUrl: string;
  imageUrl: string;
  quiz: QuizQuestion[];
};

// A learning path: an ordered list of lessons for one condition (or general prevention).
export type Curriculum = {
  id: number;
  slug: string;
  title: string;
  condition: string | null;
  description: string;
  imageUrl: string;
  lessonIds: number[];
  // Disease information, set for paths that have a condition.
  categoryId: number | null;
  icon: string;
  about: string;
  riskFactors: string[];
  warningSigns: string[];
  prevention: string[];
};

export type QuizScore = { contentId: number; score: number; total: number };

export type Reminder = {
  id: number;
  time: string;
  label: string;
};

export type IssueReport = {
  id: number;
  title: string;
  description: string;
  status: string;
};

export type QuestionItem = {
  id: number;
  topic: string;
  question: string;
  status: 'Pending' | 'Answered';
  answer?: string;
};
