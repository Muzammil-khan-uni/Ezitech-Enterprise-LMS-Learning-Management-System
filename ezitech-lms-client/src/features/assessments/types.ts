export type AssessmentType = 'quiz' | 'coding_assignment' | 'project';

export interface QuizOption {
  _id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuizQuestion {
  _id: string;
  questionText: string;
  type: 'mcq' | 'multi_select' | 'true_false';
  points: number;
  options: QuizOption[];
}

export interface Assessment {
  _id: string;
  course: string;
  lesson?: string | null;
  title: string;
  description?: string;
  assessmentType: AssessmentType;
  evaluationType: 'auto' | 'manual' | 'hybrid';
  maxAttempts: number;
  dueDate?: string;
  isPublished: boolean;
  createdAt?: string;
  questions?: QuizQuestion[];
  timeLimitMinutes?: number | null;
  passingScorePercent?: number;
  shuffleQuestions?: boolean;
  instructions?: string;
  allowedLanguages?: string[];
  starterCode?: string;
  allowedFileTypes?: string[];
  rubric?: string;
  maxScore?: number;
}

export interface AssessmentInput {
  course?: string;
  lesson?: string | null;
  title: string;
  description?: string;
  assessmentType?: AssessmentType;
  evaluationType: 'auto' | 'manual' | 'hybrid';
  maxAttempts?: number;
  dueDate?: string | null;
  isPublished?: boolean;
  questions?: Array<{
    questionText: string;
    type: 'mcq' | 'multi_select' | 'true_false';
    points: number;
    options: { text: string; isCorrect: boolean }[];
  }>;
  timeLimitMinutes?: number | null;
  passingScorePercent?: number;
  shuffleQuestions?: boolean;
  instructions?: string;
  allowedLanguages?: string[];
  starterCode?: string;
  allowedFileTypes?: string[];
  rubric?: string;
  maxScore?: number;
}

export interface Submission {
  _id: string;
  assessment: string;
  student: string;
  attemptNumber: number;
  status: 'in_progress' | 'submitted' | 'auto_graded' | 'graded';
  score?: number;
  maxScore?: number;
  passed?: boolean;
  feedback?: string;
}
