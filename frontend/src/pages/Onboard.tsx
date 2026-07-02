import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { BookOpen, GraduationCap, Phone, MapPin, Send, CheckCircle, Loader2, Sparkles } from 'lucide-react';

interface CourseOption {
  _id: string;
  title: string;
  category: string;
}

interface PlanOption {
  _id: string;
  name: string;
  price: number;
}

const Onboard: React.FC = () => {
  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [preferredBatch, setPreferredBatch] = useState('Batch A');

  // API options
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  
  // UX states
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadFormOptions = async () => {
      try {
        const [coursesRes, plansRes] = await Promise.all([
          api.get('/courses'),
          api.get('/plans'),
        ]);
        setCourses(coursesRes.data.data || []);
        setPlans(plansRes.data.data || []);
        if (plansRes.data.data?.length > 0) {
          setSelectedPlan(plansRes.data.data[0]._id);
        }
      } catch (err) {
        console.error('Error fetching onboarding form details:', err);
        setError('Failed to load application criteria. Please try again.');
      } finally {
        setInitLoading(false);
      }
    };
    loadFormOptions();
  }, []);

  const handleCourseToggle = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter((id) => id !== courseId));
    } else {
      setSelectedCourses([...selectedCourses, courseId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCourses.length === 0) {
      setError('Please select at least one course to join.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await api.post('/onboarding', {
        fullName,
        email: email.toLowerCase(),
        phone,
        college,
        degree,
        city,
        state,
        courses: selectedCourses,
        learningPlan: selectedPlan,
        preferredBatch,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit application. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="min-h-screen bg-bg-light dark:bg-bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark font-poppins text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-200">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[130px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[130px]" />

      <div className="w-full max-w-2xl bg-white dark:bg-card-dark p-8 rounded-2xl border border-slate-200 dark:border-border-dark shadow-glass z-10 space-y-6">
        
        {success ? (
          /* SUCCESS DISPLAY */
          <div className="py-12 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-float">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Onboarding Request Submitted!</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Thank you for applying, <strong className="text-slate-800 dark:text-slate-200">{fullName}</strong>. The Techzon Wide administrators will review your application details shortly. Once approved, you will receive your login details via email.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-light transition shadow-lg shadow-primary/20"
            >
              Return to Login Panel <ArrowRight className="w-4.5 h-4.5" />
            </Link>
          </div>
        ) : (
          /* FORM DISPLAY */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] bg-accent/15 text-accent font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 w-fit">
                  <Sparkles className="w-3 h-3" /> Registration
                </span>
                <h2 className="text-2xl font-bold mt-2">Student Onboarding Form</h2>
                <p className="text-slate-500 text-xs mt-1">Submit your details to activate your student account access</p>
              </div>
              <Link to="/login" className="text-xs text-accent hover:underline font-semibold">
                Sign In Instead
              </Link>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">1. Contact & Identity</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-xs transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-xs transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="+91 99887 76655"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-xs transition"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Preferred Batch</label>
                    <select
                      value={preferredBatch}
                      onChange={(e) => setPreferredBatch(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] outline-none focus:ring-2 focus:ring-accent focus:border-accent text-xs transition"
                    >
                      <option value="Batch A">Batch A (Weekdays morning)</option>
                      <option value="Batch B">Batch B (Weekdays evening)</option>
                      <option value="Batch C">Batch C (Weekends batch)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* College & Location */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">2. College & Location</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">College / Institute Name</label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="PSG College of Technology"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-xs transition"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Degree / Branch</label>
                    <input
                      type="text"
                      required
                      placeholder="B.E. Computer Science"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-xs transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Coimbatore"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-xs transition"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">State</label>
                    <input
                      type="text"
                      required
                      placeholder="Tamil Nadu"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-xs transition"
                    />
                  </div>
                </div>
              </div>

              {/* Course Selection */}
              <div className="space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">3. Select Program & Plan</h4>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Target Learning Courses</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {courses.map((courseOption) => (
                      <label
                        key={courseOption._id}
                        className={`flex items-start gap-3 p-3.5 border rounded-xl cursor-pointer select-none transition ${
                          selectedCourses.includes(courseOption._id)
                            ? 'border-accent bg-accent/5 dark:bg-accent/10'
                            : 'border-slate-200 dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCourses.includes(courseOption._id)}
                          onChange={() => handleCourseToggle(courseOption._id)}
                          className="mt-0.5 w-4 h-4 text-accent accent-accent rounded"
                        />
                        <div>
                          <p className="text-xs font-bold">{courseOption.title}</p>
                          <span className="text-[10px] text-slate-400 font-semibold">{courseOption.category}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Preferred Learning Plan</label>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] outline-none focus:ring-2 focus:ring-accent focus:border-accent text-xs transition"
                    >
                      {plans.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3.5 rounded-xl text-xs font-bold hover:bg-primary-light flex items-center justify-center gap-1.5 transition uppercase tracking-wider"
              >
                {loading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <>Submit Onboarding Request <Send className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboard;
