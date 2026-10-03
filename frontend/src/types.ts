export type Interest = 'Diyabete' | 'Umuvuduko w\'amaraso' | 'Imirire' | 'Imyitozo ngororamubiri' | 'Ubuzima bw\'umutima';

export type Lesson = {
  id: number;
  title: string;
  category: string;
  summary: string;
  body: string;
  duration: string;
  audioUrl: string;
};

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
