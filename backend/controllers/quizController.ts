import { Request, Response } from 'express';
import Quiz from '../models/Quiz';
import QuizResult from '../models/QuizResult';
import AuditLog from '../models/AuditLog';
import logger from '../config/logger';

export const createQuiz = async (req: any, res: Response): Promise<void> => {
  try {
    const quiz = new Quiz(req.body);
    await quiz.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'CREATE_QUIZ',
      details: `Created quiz: ${quiz.title}`,
    });

    res.status(201).json({ success: true, data: quiz });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getQuizzes = async (req: any, res: Response): Promise<void> => {
  const { courseId } = req.query;
  const filter: any = {};
  if (courseId) filter.courseId = courseId;

  try {
    const quizzes = await Quiz.find(filter)
      .populate('courseId', 'title')
      .populate('moduleId', 'title');

    // For students, attach their previous attempt stats
    if (req.user.role === 'student') {
      const results = await QuizResult.find({ studentId: req.user._id });
      const resultMap = new Map(results.map((r) => [r.quizId.toString(), r]));

      const data = quizzes.map((q) => {
        const resObj = resultMap.get(q._id.toString());
        return {
          ...q.toObject(),
          attempted: !!resObj,
          passed: resObj ? resObj.passed : null,
          score: resObj ? resObj.score : null,
        };
      });
      res.status(200).json({ success: true, data });
      return;
    }

    res.status(200).json({ success: true, data: quizzes });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const submitQuizAnswers = async (req: any, res: Response): Promise<void> => {
  const { quizId, answers, completedInSeconds } = req.body;

  if (!quizId || !answers) {
    res.status(400).json({ success: false, message: 'Quiz ID and answers are required' });
    return;
  }

  try {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      res.status(404).json({ success: false, message: 'Quiz not found' });
      return;
    }

    let score = 0;
    const evaluatedAnswers = quiz.questions.map((q: any) => {
      // Find student answer for this question
      const studentAns = answers.find((a: any) => a.questionId === q._id.toString());
      const selectedAnswers = studentAns ? studentAns.selectedAnswers || [] : [];

      // Check correctness (exact match, order-independent)
      const correctAnswers = q.correctAnswers.map((x: string) => x.trim().toLowerCase());
      const studentAnswersNormalized = selectedAnswers.map((x: string) => x.trim().toLowerCase());

      const isCorrect =
        correctAnswers.length === studentAnswersNormalized.length &&
        correctAnswers.every((val: string) => studentAnswersNormalized.includes(val));

      if (isCorrect) {
        score += q.marks;
      }

      return {
        questionId: q._id.toString(),
        selectedAnswers,
        isCorrect,
      };
    });

    const passed = score >= quiz.passingMarks;

    const quizResult = new QuizResult({
      quizId,
      studentId: req.user._id,
      answers: evaluatedAnswers,
      score,
      passed,
      completedInSeconds,
    });
    await quizResult.save();

    res.status(201).json({
      success: true,
      data: {
        score,
        passed,
        passingMarks: quiz.passingMarks,
        quizResult,
      },
    });
  } catch (error: any) {
    logger.error('Quiz submission error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getQuizLeaderboard = async (req: Request, res: Response): Promise<void> => {
  const { quizId } = req.params;
  try {
    const results = await QuizResult.find({ quizId })
      .populate('studentId', 'name email')
      .sort('-score completedInSeconds')
      .limit(10);

    const formattedLeaderboard = results.map((r: any, idx: number) => ({
      rank: idx + 1,
      name: r.studentId?.name || 'Anonymous',
      email: r.studentId?.email || '',
      score: r.score,
      completedInSeconds: r.completedInSeconds,
      passed: r.passed,
    }));

    res.status(200).json({ success: true, data: formattedLeaderboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
