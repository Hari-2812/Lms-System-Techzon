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
  GitBranch,
  Lock,
  Menu,
  X,
  ShieldAlert
} from 'lucide-react';
import CustomVideoPlayer from '../components/CustomVideoPlayer';
import Confetti from 'react-confetti';

interface Lesson {
  _id: string;
  moduleId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  videoId?: { secureUrl: string; playbackUrl: string; duration: number; thumbnail: string };
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
  const [videoError, setVideoError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

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

  // Mobile drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      
      // Auto-select first lesson or first uncompleted lesson
      if (res.data.data.lessons?.length > 0) {
        const completed = res.data.data.completedLessons || [];
        const firstUncompleted = res.data.data.lessons.find((l: any) => !completed.includes(l._id));
        setSelectedLesson(firstUncompleted || res.data.data.lessons[0]);
        setVideoError(null);
      }
    } catch (error: any) {
      console.error('Error fetching course:', error);
      if (error.response?.status === 403) {
        setGlobalError('Access Denied. You are not enrolled in this course.');
      } else {
        setGlobalError('Failed to load course details.');
      }
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
    // Optimistic update
    const previousCompleted = [...completedLessons];
    if (isCompleted && !completedLessons.includes(lesId)) {
      setCompletedLessons([...completedLessons, lesId]);
    } else if (!isCompleted) {
      setCompletedLessons(completedLessons.filter(id => id !== lesId));
    }
    
    try {
      const res = await api.post('/courses/track-progress', {
        courseId: id,
        lessonId: lesId,
        isCompleted
      });
      const newCompleted = res.data.data.completedLessons;
      setCompletedLessons(newCompleted);

      // Check course completion
      if (lessons.length > 0 && newCompleted.length === lessons.length) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 8000);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      // Revert optimistic update
      setCompletedLessons(previousCompleted);
    }
  };

  const handleAutoPlayNext = () => {
    if (!selectedLesson) return;
    const idx = lessons.findIndex(l => l._id === selectedLesson._id);
    if (idx >= 0 && idx < lessons.length - 1) {
      setSelectedLesson(lessons[idx + 1]);
      setVideoError(null);
    }
  };

  // Assignment & Quiz logic...
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

  const startQuiz = (quiz: any) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedAnswers([]);
    setQuizAnswersSubmitted([]);
    setQuizResultInfo(null);
    setQuizTimer(quiz.durationMinutes * 60);

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

  const [evaluatedAnswersAccumulator, setEvaluatedAnswersAccumulator] = useState<any[]>([]);

  const saveCurrentQuestionAnswer = () => {
    const question = activeQuiz.questions[currentQuestionIdx];
    const item = { questionId: question._id, selectedAnswers };
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
      fetchAssignmentsAndQuizzes();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error submitting quiz');
    }
  };

  const isLessonLocked = (lesId: string) => {
    try {
      // Allow admins to bypass
      const userRole = localStorage.getItem('role') || 'Student'; // Using localStorage heuristic if API doesn't provide
      if (['Admin', 'SuperAdmin', 'Mentor'].includes(userRole)) return false;
      
      const idx = lessons.findIndex(l => l._id === lesId);
      if (idx <= 0) return false;
      
      const prevLesson = lessons[idx - 1];
      return !completedLessons.includes(prevLesson._id);
    } catch {
      return false;
    }
  };

  const progressPercent = lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-8 font-poppins min-h-[80vh] w-full animate-pulse p-4 lg:p-0">
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="glass-card p-6 h-96"></div>
        </div>
        <div className="flex-1 flex flex-col gap-6">
          <div className="w-full aspect-video bg-slate-200 rounded-xl"></div>
          <div className="glass-card p-6 h-32"></div>
        </div>
      </div>
    );
  }

  if (globalError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] font-poppins text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-2">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Access Denied</h2>
        <p className="text-sm text-slate-500 max-w-sm">{globalError}</p>
        <Link to="/dashboard" className="btn-primary mt-4 py-2 px-6">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 font-poppins min-h-[80vh] w-full pb-20">
      
      {showConfetti && (
        <div className="fixed inset-0 z-[100] pointer-events-none">
          <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} gravity={0.15} />
        </div>
      )}

      {/* MOBILE HEADER FOR SIDEBAR DRAWER */}
      <div className="lg:hidden flex items-center justify-between glass-card p-4 mx-4 mt-4">
        <span className="font-bold text-sm truncate">{course?.title}</span>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* 2. RIGHT COLUMN: VIDEO, QUIZ, OR ASSIGNMENT WORKSPACE (Order 1 on Mobile, 2 on Desktop) */}
      <div className="flex-1 flex flex-col gap-4 lg:gap-6 min-w-0 order-1 lg:order-2 px-4 lg:px-0">
        {!activeQuiz ? (
          <>
            {/* Media Block / Video Player */}
            <div className="glass-card overflow-hidden bg-black border-none relative flex items-center justify-center w-full shadow-2xl rounded-none sm:rounded-xl">
              {selectedLesson?.videoId?.secureUrl || selectedLesson?.videoUrl ? (
                <CustomVideoPlayer 
                  playbackUrl={selectedLesson?.videoId?.playbackUrl}
                  secureUrl={selectedLesson?.videoId?.secureUrl}
                  videoUrl={selectedLesson?.videoUrl}
                  poster={selectedLesson?.videoId?.thumbnail}
                  lessonId={selectedLesson._id}
                  courseId={course?._id}
                  lessonTitle={selectedLesson.title}
                  isAlreadyCompleted={completedLessons.includes(selectedLesson._id)}
                  onLessonComplete={() => toggleProgress(selectedLesson._id, true)}
                  hasNextLesson={lessons.findIndex(l => l._id === selectedLesson?._id) < lessons.length - 1}
                  onAutoPlayNext={handleAutoPlayNext}
                />
              ) : (
                <div className="w-full aspect-video flex flex-col items-center justify-center text-center text-slate-400 space-y-2 p-6">
                  <Play className="w-12 h-12 mx-auto text-slate-500 animate-float" />
                  <p className="text-xs">No video stream configured for this lesson</p>
                </div>
              )}
            </div>

            {/* Lesson Title & Progress (Mobile order: Video -> Title -> Progress -> List) */}
            {selectedLesson && (
              <div className="glass-card p-5 lg:p-6 flex flex-col justify-between gap-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-800 dark:text-white leading-tight">{selectedLesson.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    {completedLessons.includes(selectedLesson._id) && (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar (Visible on mobile here) */}
                <div className="w-full mt-2 lg:hidden">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Course Progress</span>
                    <span className="text-accent">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                {/* Course Completion Overlay (if 100%) */}
                {progressPercent === 100 && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-green-500 flex items-center gap-2">
                        <Trophy className="w-4 h-4" /> Congratulations!
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">You completed {course?.title} 100%.</p>
                    </div>
                    <Link to="/student/certificates" className="px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-bold shadow-lg flex-shrink-0">
                      Download Certificate
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Tab Controls (Scrollable on mobile) */}
            <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-border-dark font-poppins -mx-4 lg:mx-0 px-4 lg:px-0">
              {(['video', 'resources', 'assignment', 'quiz'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 lg:px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition whitespace-nowrap min-h-[44px] ${
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
            <div className="glass-card p-5 lg:p-6 min-h-[200px]">
              {activeTab === 'video' && (
                <div className="space-y-2 text-xs lg:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  <h4 className="font-bold text-slate-800 dark:text-white">About this Lecture</h4>
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
                      className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 dark:border-border-dark dark:hover:bg-slate-800/40 text-xs font-semibold text-slate-700 dark:text-slate-300 min-h-[44px]"
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
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 dark:border-border-dark dark:hover:bg-slate-800/40 text-xs font-semibold text-slate-700 dark:text-slate-300 min-h-[44px]"
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
                        <div className="flex flex-col gap-2">
                          <h5 className="font-bold text-sm text-slate-800 dark:text-white">{assign.title}</h5>
                          <p className="text-xs text-slate-500">{assign.description}</p>
                          <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 font-semibold mt-1">
                            <span>Max Marks: {assign.maxMarks}</span>
                            <span>•</span>
                            <span>Deadline: {new Date(assign.deadline).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {assign.submission ? (
                          <div className="p-4 bg-slate-50 dark:bg-border-dark/30 rounded-lg text-xs space-y-2">
                            <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                              <span>Submission status:</span>
                              <span className="uppercase text-accent">{assign.submission.status}</span>
                            </div>
                            {assign.submission.marksObtained !== undefined && (
                              <p className="font-semibold text-green-500">Marks: {assign.submission.marksObtained} / {assign.maxMarks}</p>
                            )}
                            {assign.submission.feedback && (
                              <p className="text-[11px] text-slate-500 font-medium italic mt-1 bg-slate-200/50 dark:bg-slate-800/50 p-2 rounded">Feedback: "{assign.submission.feedback}"</p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3 pt-2">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <select
                                value={subType}
                                onChange={(e: any) => setSubType(e.target.value)}
                                className="p-3 text-xs border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent min-h-[44px]"
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
                                className="flex-1 p-3 text-xs border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent min-h-[44px]"
                              />
                            </div>
                            <textarea
                              placeholder="Add optional notes for your mentor..."
                              value={subNotes}
                              onChange={(e) => setSubNotes(e.target.value)}
                              className="w-full p-3 text-xs border border-slate-200 dark:border-border-dark rounded-lg outline-none bg-transparent min-h-[80px]"
                            />
                            <button
                              onClick={() => handleAssignSubmit(assign._id)}
                              disabled={submittingAssignment}
                              className="btn-accent py-3 px-6 rounded-lg text-xs font-bold w-full sm:w-auto flex justify-center items-center gap-2 min-h-[44px]"
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
                          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase ${
                              quiz.passed ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                            }`}>
                              {quiz.passed ? 'Passed' : 'Failed'}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">Score: {quiz.score}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => startQuiz(quiz)}
                            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold min-h-[44px]"
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
          <div className="glass-card p-4 lg:p-6 space-y-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-border-dark pb-4 gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-lg leading-6">{activeQuiz.title}</h3>
                <p className="text-[10px] text-slate-500 mt-1">Question {currentQuestionIdx + 1} of {activeQuiz.questions.length}</p>
              </div>
              <div className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-500/10 text-orange-500 text-xs font-bold font-inter">
                <Clock className="w-4 h-4" />
                {Math.floor(quizTimer / 60)}:{(quizTimer % 60).toString().padStart(2, '0')}
              </div>
            </div>

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
                
                <div className="max-w-md mx-auto border border-slate-100 dark:border-border-dark rounded-xl p-4 text-left space-y-3">
                  <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Top Leaderboard Rank</h5>
                  <div className="space-y-1 text-xs">
                    {leaderboard.map((userL) => (
                      <div key={userL.rank} className="flex justify-between py-2 border-b border-slate-50/50">
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
                  className="btn-primary py-3 px-8 rounded-lg text-xs font-bold min-h-[44px] w-full sm:w-auto"
                >
                  Return to Lectures
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <span className="inline-block text-[10px] bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light font-bold px-3 py-1 rounded-full uppercase">
                    {activeQuiz.questions[currentQuestionIdx].questionType}
                  </span>
                  <h4 className="font-bold text-slate-800 dark:text-white text-base leading-relaxed">
                    {activeQuiz.questions[currentQuestionIdx].questionText}
                  </h4>
                </div>

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
                        className={`w-full text-left p-4 rounded-xl text-xs sm:text-sm font-semibold border transition min-h-[52px] ${
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

                <div className="flex justify-end pt-4">
                  <button
                    onClick={nextQuestion}
                    className="btn-accent px-8 py-3 text-xs font-bold rounded-lg min-h-[44px] w-full sm:w-auto"
                  >
                    {currentQuestionIdx === activeQuiz.questions.length - 1 ? 'Submit Quiz' : 'Next Question →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1. LEFT COLUMN: MODULE NAVIGATION SIDEBAR (Order 2 on Mobile, 1 on Desktop) */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-full sm:w-80 bg-white dark:bg-slate-900 transform transition-transform duration-300 ease-in-out
        lg:relative lg:transform-none lg:w-80 lg:flex lg:flex-col lg:gap-6 lg:order-1 flex-shrink-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Sidebar Header */}
        <div className="lg:hidden flex justify-between items-center p-4 border-b dark:border-border-dark">
          <span className="font-bold">Course Curriculum</span>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 min-h-[44px] min-w-[44px] flex justify-center items-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 lg:p-0 h-full overflow-y-auto lg:overflow-visible">
          <Link to="/dashboard" className="hidden lg:flex text-xs font-semibold text-accent hover:underline items-center gap-1 mb-6">
            ← Back to Dashboard
          </Link>

          <div className="glass-card p-5 lg:p-6 space-y-5 lg:sticky lg:top-4 border-none lg:border-solid rounded-none lg:rounded-2xl bg-transparent lg:bg-white lg:dark:bg-slate-900">
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-white line-clamp-2 leading-tight text-sm lg:text-base">{course?.title}</h3>
              <span className="text-[10px] text-accent font-bold uppercase tracking-wider mt-1 block">{course?.category}</span>
            </div>

            {/* Desktop Progress Bar */}
            <div className="hidden lg:block w-full">
              <div className="flex justify-between text-[10px] font-bold mb-1.5 uppercase text-slate-500">
                <span>Course Progress</span>
                <span className="text-accent">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5">
                <div className="bg-accent h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>

            <div className="space-y-6 lg:max-h-[calc(100vh-250px)] lg:overflow-y-auto pr-1 custom-scrollbar pb-10 lg:pb-0">
              {modules.map((mod) => {
                const modLessons = lessons.filter((l) => {
                  const lModId = typeof l.moduleId === 'object' && l.moduleId !== null ? (l.moduleId as any)._id : l.moduleId;
                  return lModId === mod._id;
                });
                return (
                  <div key={mod._id} className="space-y-2.5">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{mod.title}</h4>
                    <div className="space-y-1.5">
                      {modLessons.map((les) => {
                        const isActive = selectedLesson?._id === les._id;
                        const isDone = completedLessons.includes(les._id);
                        const locked = isLessonLocked(les._id);

                        return (
                          <button
                            key={les._id}
                            disabled={locked}
                            onClick={() => {
                              setSelectedLesson(les);
                              setVideoError(null);
                              setActiveQuiz(null);
                              setQuizResultInfo(null);
                              if(window.innerWidth < 1024) setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center justify-between text-left p-3 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                              isActive
                                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                                : locked 
                                ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50 text-slate-400'
                                : 'hover:bg-slate-100 dark:hover:bg-border-dark text-slate-700 dark:text-slate-300'
                            }`}
                            title={locked ? "Complete previous lesson to unlock" : ""}
                          >
                            <span className="truncate pr-2 flex-1">{les.title}</span>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isActive && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded animate-pulse shadow-sm shadow-red-500/50 mr-1">
                                  <span className="w-1.5 h-1.5 bg-white rounded-full"></span> LIVE
                                </span>
                              )}

                              {les.videoId?.duration && !isActive ? (
                                <span className="text-[9px] text-slate-500 font-mono">
                                  {Math.floor(les.videoId.duration / 60)}:{(Math.floor(les.videoId.duration % 60)).toString().padStart(2, '0')}
                                </span>
                              ) : null}
                              
                              {locked ? (
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              ) : isDone ? (
                                <CheckCircle2 className={`w-4 h-4 ${isActive ? 'text-white' : 'text-green-500'}`} />
                              ) : (
                                <Play className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                              )}
                            </div>
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
      </div>

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

    </div>
  );
};

export default CourseDetails;
