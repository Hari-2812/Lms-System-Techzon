import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizResult extends Document {
  quizId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  answers: Array<{
    questionId: string;
    selectedAnswers: string[];
    isCorrect: boolean;
  }>;
  score: number;
  passed: boolean;
  completedInSeconds: number;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuizResultSchema: Schema<IQuizResult> = new Schema(
  {
    quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers: [
      {
        questionId: { type: String, required: true },
        selectedAnswers: [{ type: String }],
        isCorrect: { type: Boolean, required: true },
      },
    ],
    score: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    completedInSeconds: { type: Number, required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IQuizResult>('QuizResult', QuizResultSchema);
