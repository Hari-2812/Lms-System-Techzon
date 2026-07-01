import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import {
  Play,
  FileText,
  HelpCircle,
  UploadCloud,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronRight,
  Download,
  AlertCircle,
  Trophy,
  GitBranch
} from 'lucide-react';

interface Lesson {
  _id: string;
  moduleId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  videoDuration?: number;
  notesUrl?: string;
  downloads?: Array<{ title: string; url: string }>;
  order: number;
}

interface Module {
  _id: string;
  title: string;
  order: number;
}

const CourseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'video' | 'resources' | 'assignment' | 'quiz'>('video');

  // Modular resource variables
  const [assignments, setAssignments] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);

  // Assignment submissions states
  const [subType, setSubType] = useState<'pdf' | 'zip' | 'github' | 'gdrive'>('zip');
  const [subUrl, setSubUrl] = useState('');
  const [subNotes, setSubNotes] = useState('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);

  // Active Quiz taking states
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [quizTimer, setQuizTimer] = useState(0);
  const [quizIntervalId, setQuizIntervalId] = useState<any>(null);
  const [quizAnswersSubmitted, setQuizAnswersSubmitted] = useState<any[]>([]);
  const [quizResultInfo, setQuizResultInfo] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    fetchCourseDetails();
    fetchAssignmentsAndQuizzes();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const res = await api.get(`/courses/${id}`);
      setCourse(res.data.data.course);
      setModules(res.data.data.modules);
      setLessons(res.data.data.lessons);
      setCompletedLessons(res.data.data.completedLessons || []);
      
      // Auto-select first lesson
      if (res.data.data.lessons?.length > 0) {
        setSelectedLesson(res.data.data.lessons[0]);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentsAndQuizzes = async () => {
    try {
      const resAssign = await api.get(`/assignments?courseId=${id}`);
      setAssignments(resAssign.data.data || []);
      
      const resQuiz = await api.get(`/quizzes?courseId=${id}`);
      setQuizzes(resQuiz.data.data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  // Toggle lesson complete check
  const toggleProgress = async (lesId: string, isCompleted: boolean) => {
    try {
      const res = await api.post('/courses/track-progress', {
        courseId: id,
        lessonId: lesId,
        isCompleted
      });
      setCompletedLessons(res.data.data.completedLessons);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Handle Assignment Submission
  const handleAssignSubmit = async (assignId: string) => {
    if (!subUrl) return;
    setSubmittingAssignment(true);
    try {
      await api.post('/assignments/submit', {
        courseId: id,
        assignmentId: assignId,
        submissionType: subType,
        fileUrl: subType === 'zip' || subType === 'pdf' ? subUrl : undefined,
        repoUrl: subType === 'github' ? subUrl : undefined,
        gdriveUrl: subType === 'gdrive' ? subUrl : undefined,
        notes: subNotes,
      });
      alert('Assignment submitted successfully!');
      fetchAssignmentsAndQuizzes();
      setSubUrl('');
      setSubNotes('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error submitting assignment');
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // Quiz Handling
  const startQuiz = (quiz: any) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedAnswers([]);
    setQuizAnswersSubmitted([]);
    setQuizResultInfo(null);
    setQuizTimer(quiz.durationMinutes * 60);

    // Timer Interval
    const intId = setInterval(() => {
      setQuizTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intId);
          submitQuiz(quiz._id, evaluatedAnswersAccumulator);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setQuizIntervalId(intId);
    
    // Fetch leaderboard
    fetchLeaderboard(quiz._id);
  };

  const fetchLeaderboard = async (quizId: string) => {
    try {
      const res = await api.get(`/quizzes/${quizId}/leaderboard`);
      setLeaderboard(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  // Accumulate answer answers in progress
  const [evaluatedAnswersAccumulator, setEvaluatedAnswersAccumulator] = useState<any[]>([]);

  const saveCurrentQuestionAnswer = () => {
    const question = activeQuiz.questions[currentQuestionIdx];
    const item = {
      questionId: question._id,
      selectedAnswers,
    };
    
    const updated = [...evaluatedAnswersAccumulator.filter(x => x.questionId !== question._id), item];
    setEvaluatedAnswersAccumulator(updated);
    return updated;
  };

  const nextQuestion = () => {
    const updatedAccumulator = saveCurrentQuestionAnswer();
    if (currentQuestionIdx < activeQuiz.questions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
      const nextQ = activeQuiz.questions[currentQuestionIdx + 1];
      const prevSaved = updatedAccumulator.find(x => x.questionId === nextQ._id);
      setSelectedAnswers(prevSaved ? prevSaved.selectedAnswers : []);
    } else {
      submitQuiz(activeQuiz._id, updatedAccumulator);
    }
  };

  const submitQuiz = async (quizId: string, finalAnswers: any[]) => {
    if (quizIntervalId) clearInterval(quizIntervalId);
    
    const totalTimeSpent = activeQuiz.durationMinutes * 60 - quizTimer;

    try {
      const res = await api.post('/quizzes/submit', {
        courseId: id,
        quizId,
        answers: finalAnswers,
        completedInSeconds: totalTimeSpent,
      });

      setQuizResultInfo(res.data.data);
      fetchAssignmentsAndQuizzes(); // Refresh list to update status
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error submitting quiz');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 font-poppins min-h-[80vh]">
      {/* 1. LEFT COLUMN: MODULE NAVIGATION SIDEBAR */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <Link to="/dashboard" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
          ← Back to Dashboard
        </Link>

        <div className="glass-card p-6 space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white line-clamp-1 leading-6">{course?.title}</h3>
            <span className="text-[10px] text-accent font-bold uppercase tracking-wider">{course?.category}</span>
          </div>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {modules.map((mod) => {
              const modLessons = lessons.filter((l) => l.moduleId === mod._id);
              return (
                <div key={mod._id} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{mod.title}</h4>
                  <div className="space-y-1">
                    {modLessons.map((les) => {
                      const isActive = selectedLesson?._id === les._id;
                      const isDone = completedLessons.includes(les._id);
                      return (
                        <button
                          key={les._id}
                          onClick={() => {
                            setSelectedLesson(les);
                            setActiveQuiz(null);
                            setQuizResultInfo(null);
                          }}
                          className={`w-full flex items-center justify-between text-left p-3 rounded-xl text-xs font-semibold transition ${
                            isActive
                              ? 'bg-accent text-white shadow-lg shadow-accent/15'
                              : 'hover:bg-slate-100 dark:hover:bg-border-dark text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate pr-2">{les.title}</span>
                          {isDone ? (
                            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-green-500'}`} />
                          ) : (
                            <Play className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. RIGHT COLUMN: VIDEO, QUIZ, OR ASSIGNMENT WORKSPACE */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        {!activeQuiz ? (
          <>
            {/* Media Block / Video Player */}
            <div className="glass-card overflow-hidden bg-slate-900 border-none aspect-video relative flex items-center justify-center">
              {selectedLesson?.videoUrl ? (
                <video
                  src={selectedLesson.videoUrl}
                  controls
                  className="w-full h-full object-contain"
                  onEnded={() => selectedLesson && toggleProgress(selectedLesson._id, true)}
                />
              ) : (
                <div className="text-center text-slate-400 space-y-2">
                  <Play className="w-12 h-12 mx-auto text-slate-500 animate-float" />
                  <p className="text-xs">No video stream configured for this lesson</p>
                </div>
              )}
            </div>

            {/* Lesson Title & Checkbox */}
            {selectedLesson && (
              <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-6">{selectedLesson.title}</h2>
                  <p className="text-xs text-slate-500 mt-1">{selectedLesson.description || 'Watch the lecture and complete resources.'}</p>
                </div>
                <button
                  onClick={() => toggleProgress(selectedLesson._id, !completedLessons.includes(selectedLesson._id))}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold font-poppins border transition ${
                    completedLessons.includes(selectedLesson._id)
                      ? 'bg-green-500/10 border-green-500/30 text-green-500'
                      : 'border-slate-200 text-slate-600 dark:border-border-dark dark:text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {completedLessons.includes(selectedLesson._id) ? 'Completed' : 'Mark Completed'}
                </button>
              </div>
            )}

            {/* Tab Controls */}
            <div className="flex border-b border-slate-200 dark:border-border-dark font-poppins">
              {(['video', 'resources', 'assignment', 'quiz'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
                    activeTab === tab
                      ? 'border-accent text-accent'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content Display */}
            <div className="glass-card p-6 min-h-[200px]">
              {activeTab === 'video' && (
                <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">About this Lecture</h4>
                  <p>{selectedLesson?.description || 'No detailed description available.'}</p>
                </div>
              )}

              {activeTab === 'resources' && (
                <div className="space-y-5">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">Downloads & Handouts</h4>

                  {selectedLesson?.notesUrl && (
                    <a
                      href={selectedLesson.notesUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 dark:border-border-dark dark:hover:bg-slate-800/40 text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-accent" />
                        PDF Lecture Notes
                      </span>
                      <Download className="w-4 h-4 text-slate-400" />
                    </a>
                  )}

                  {selectedLesson?.downloads && selectedLesson.downloads.length > 0 ? (
                    selectedLesson.downloads.map((item, idx) => (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 dark:border-border-dark dark:hover:bg-slate-800/40 text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        <span className="flex items-center gap-2">
                          <GitBranch className="w-5 h-5 text-accent" />
                          {item.title}
                        </span>
                        <Download className="w-4 h-4 text-slate-400" />
                      </a>
                    ))
                  ) : (
                    !selectedLesson?.notesUrl && (
                      <div className="text-center text-xs text-slate-400 py-6">No downloadable attachment found for this lesson.</div>
                    )
                  )}
                </div>
              )}

              {activeTab === 'assignment' && (
                <div className="space-y-6">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">Module Assignments</h4>

                  {assignments.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No assignment has been configured for this course yet.</div>
                  ) : (
                    assignments.map((assign) => (
                      <div key={assign._id} className="p-5 border border-slate-100 dark:border-border-dark rounded-xl space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h5 className="font-bold text-sm text-slate-800 dark:text-white">{assign.title}</h5>
                            <p className="text-xs text-slate-500 mt-1">{assign.description}</p>
                            <div className="flex gap-4 text-[10px] text-slate-400 font-semibold mt-2">
                              <span>Max Marks: {assign.maxMarks}</span>
                              <span>•</span>
                              <span>Deadline: {new Date(assign.deadline).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Submission status or form */}
                        {assign.submission ? (
                          <div className="p-3 bg-slate-50 dark:bg-border-dark/30 rounded-lg text-xs space-y-1">
                            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                              <span>Submission status:</span>
                              <span className="uppercase text-accent">{assign.submission.status}</span>
                            </div>
                            {assign.submission.marksObtained !== undefined && (
                              <p className="font-semibold text-green-500">Marks: {assign.submission.marksObtained} / {assign.maxMarks}</p>
                            )}
                            {assign.submission.feedback && (
                              <p className="text-[11px] text-slate-500 font-medium italic mt-1">Feedback: "{assign.submission.feedback}"</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3 pt-2">
                            <div className="flex gap-2">
                              <select
                                value={subType}
                                onChange={(e: any) => setSubType(e.target.value)}
                                className="px-3 py-2 text-xs border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent"
                              >
                                <option value="zip">ZIP File URL</option>
                                <option value="pdf">PDF File URL</option>
                                <option value="github">GitHub Repo URL</option>
                                <option value="gdrive">Google Drive Link</option>
                              </select>
                              <input
                                type="url"
                                required
                                placeholder="Paste submission link here..."
                                value={subUrl}
                                onChange={(e) => setSubUrl(e.target.value)}
                                className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent"
                              />
                            </div>
                            <textarea
                              placeholder="Add optional notes for your mentor..."
                              value={subNotes}
                              onChange={(e) => setSubNotes(e.target.value)}
                              className="w-full p-3 text-xs border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent h-20"
                            />
                            <button
                              onClick={() => handleAssignSubmit(assign._id)}
                              disabled={submittingAssignment}
                              className="btn-accent py-2 px-4 rounded-lg text-xs flex items-center gap-1.5"
                            >
                              <UploadCloud className="w-4 h-4" /> Submit Assignment
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'quiz' && (
                <div className="space-y-6">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">Course Quizzes</h4>

                  {quizzes.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">No quizzes scheduled for this course.</div>
                  ) : (
                    quizzes.map((quiz) => (
                      <div key={quiz._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-slate-100 dark:border-border-dark rounded-xl">
                        <div className="space-y-1">
                          <h5 className="font-bold text-sm text-slate-800 dark:text-white">{quiz.title}</h5>
                          <div className="flex gap-4 text-[10px] text-slate-400 font-semibold">
                            <span>Duration: {quiz.durationMinutes} Mins</span>
                            <span>•</span>
                            <span>Questions: {quiz.questions?.length}</span>
                          </div>
                        </div>

                        {quiz.attempted ? (
                          <div className="flex items-center gap-4">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                              quiz.passed ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {quiz.passed ? 'Passed' : 'Failed'}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">Score: {quiz.score}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => startQuiz(quiz)}
                            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold"
                          >
                            Start Quiz
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ACTIVE TIMER QUIZ TAKE SCREEN */
          <div className="glass-card p-6 space-y-6">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-border-dark pb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-lg leading-6">{activeQuiz.title}</h3>
                <p className="text-[10px] text-slate-500">Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 text-xs font-bold font-inter">
                <Clock className="w-4 h-4" />
                {Math.floor(quizTimer / 60)}:{(quizTimer % 60).toString().padStart(2, '0')}
              </div>
            </div>

            {/* If result is ready */}
            {quizResultInfo ? (
              <div className="space-y-6 text-center py-6">
                <Trophy className="w-16 h-16 mx-auto text-accent animate-float" />
                <div>
                  <h4 className="text-xl font-bold">Quiz Submitted Successfully!</h4>
                  <p className="text-xs text-slate-500 mt-1">You scored {quizResultInfo.score} points.</p>
                </div>
                <div className="inline-block px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider bg-accent/15 text-accent">
                  {quizResultInfo.passed ? 'PASSED (GRADUATED)' : 'FAILED (TRY AGAIN)'}
                </div>
                
                {/* Leaderboard panel */}
                <div className="max-w-md mx-auto border border-slate-100 dark:border-border-dark rounded-xl p-4 text-left space-y-3">
                  <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Top Leaderboard Rank</h5>
                  <div className="space-y-1 text-xs">
                    {leaderboard.map((userL) => (
                      <div key={userL.rank} className="flex justify-between py-1 border-b border-slate-50/50">
                        <span>{userL.rank}. {userL.name}</span>
                        <span className="font-semibold text-accent">{userL.score} pts ({userL.completedInSeconds}s)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveQuiz(null);
                    setQuizResultInfo(null);
                    fetchAssignmentsAndQuizzes();
                  }}
                  className="btn-primary py-2 px-6 rounded-lg text-xs"
                >
                  Return to Lectures
                </button>
              </div>
            ) : (
              /* Question block */
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light font-bold px-2.5 py-1 rounded-full uppercase">
                    {activeQuiz.questions[currentQuestionIdx].questionType}
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-base">
                    {activeQuiz.questions[currentQuestionIdx].questionText}
                  </h4>
                </div>

                {/* Answers Choice selections */}
                <div className="grid grid-cols-1 gap-3">
                  {activeQuiz.questions[currentQuestionIdx].options?.map((option: string) => {
                    const isSelected = selectedAnswers.includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          if (activeQuiz.questions[currentQuestionIdx].questionType === 'multiple-select') {
                            if (isSelected) {
                              setSelectedAnswers(selectedAnswers.filter((a) => a !== option));
                            } else {
                              setSelectedAnswers([...selectedAnswers, option]);
                            }
                          } else {
                            setSelectedAnswers([option]);
                          }
                        }}
                        className={`w-full text-left p-4 rounded-xl text-xs font-semibold border transition ${
                          isSelected
                            ? 'border-accent bg-accent/5 text-accent shadow-md shadow-accent/5'
                            : 'border-slate-200 hover:bg-slate-50 dark:border-border-dark dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>

                {/* Actions row */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={nextQuestion}
                    className="btn-accent px-6 py-2.5 text-xs font-semibold rounded-lg"
                  >
                    {currentQuestionIdx === activeQuiz.questions.length - 1 ? 'Submit Quiz' : 'Next Question →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetails;
