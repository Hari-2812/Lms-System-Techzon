"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuizLeaderboard = exports.submitQuizAnswers = exports.getQuizzes = exports.createQuiz = void 0;
const Quiz_1 = __importDefault(require("../models/Quiz"));
const QuizResult_1 = __importDefault(require("../models/QuizResult"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const logger_1 = __importDefault(require("../config/logger"));
const createQuiz = async (req, res) => {
    try {
        const quiz = new Quiz_1.default(req.body);
        await quiz.save();
        await AuditLog_1.default.create({
            userId: req.user._id,
            action: 'CREATE_QUIZ',
            details: `Created quiz: ${quiz.title}`,
        });
        res.status(201).json({ success: true, data: quiz });
    }
    catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
exports.createQuiz = createQuiz;
const getQuizzes = async (req, res) => {
    const { courseId } = req.query;
    const filter = {};
    if (courseId)
        filter.courseId = courseId;
    try {
        const quizzes = await Quiz_1.default.find(filter)
            .populate('courseId', 'title')
            .populate('moduleId', 'title');
        // For students, attach their previous attempt stats
        if (req.user.role === 'student') {
            const results = await QuizResult_1.default.find({ studentId: req.user._id });
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getQuizzes = getQuizzes;
const submitQuizAnswers = async (req, res) => {
    const { quizId, answers, completedInSeconds } = req.body;
    if (!quizId || !answers) {
        res.status(400).json({ success: false, message: 'Quiz ID and answers are required' });
        return;
    }
    try {
        const quiz = await Quiz_1.default.findById(quizId);
        if (!quiz) {
            res.status(404).json({ success: false, message: 'Quiz not found' });
            return;
        }
        let score = 0;
        const evaluatedAnswers = quiz.questions.map((q) => {
            // Find student answer for this question
            const studentAns = answers.find((a) => a.questionId === q._id.toString());
            const selectedAnswers = studentAns ? studentAns.selectedAnswers || [] : [];
            // Check correctness (exact match, order-independent)
            const correctAnswers = q.correctAnswers.map((x) => x.trim().toLowerCase());
            const studentAnswersNormalized = selectedAnswers.map((x) => x.trim().toLowerCase());
            const isCorrect = correctAnswers.length === studentAnswersNormalized.length &&
                correctAnswers.every((val) => studentAnswersNormalized.includes(val));
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
        const quizResult = new QuizResult_1.default({
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
    }
    catch (error) {
        logger_1.default.error('Quiz submission error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.submitQuizAnswers = submitQuizAnswers;
const getQuizLeaderboard = async (req, res) => {
    const { quizId } = req.params;
    try {
        const results = await QuizResult_1.default.find({ quizId })
            .populate('studentId', 'name email')
            .sort('-score completedInSeconds')
            .limit(10);
        const formattedLeaderboard = results.map((r, idx) => ({
            rank: idx + 1,
            name: r.studentId?.name || 'Anonymous',
            email: r.studentId?.email || '',
            score: r.score,
            completedInSeconds: r.completedInSeconds,
            passed: r.passed,
        }));
        res.status(200).json({ success: true, data: formattedLeaderboard });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
exports.getQuizLeaderboard = getQuizLeaderboard;
