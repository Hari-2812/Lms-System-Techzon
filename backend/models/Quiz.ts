import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  questionText: string;
  questionType: 'mcq' | 'multiple-select' | 'true-false' | 'fill-blank';
  options?: string[];
  correctAnswers: string[]; // Always store as array to support multiple selection / options
  marks: number;
}

export interface IQuiz extends Document {
  title: string;
  courseId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  durationMinutes: number;
  passingMarks: number;
  questions: IQuestion[];
  isRandomized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema({
  questionText: { type: String, required: true },
  questionType: {
    type: String,
    enum: ['mcq', 'multiple-select', 'true-false', 'fill-blank'],
    required: true,
  },
  options: [{ type: String }],
  correctAnswers: [{ type: String, required: true }],
  marks: { type: Number, required: true, default: 1 },
});

const QuizSchema: Schema<IQuiz> = new Schema(
  {
    title: { type: String, required: true, trim: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'Module', required: true },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    durationMinutes: { type: Number, required: true, default: 10 },
    passingMarks: { type: Number, required: true, default: 5 },
    questions: [QuestionSchema],
    isRandomized: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IQuiz>('Quiz', QuizSchema);
