import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Layers, Edit3, Check, X, Loader2 } from 'lucide-react';

interface Plan {
  _id: string;
  name: string;
  code: string;
  price: number;
  durationMonths: number;
  features: {
    recordedClasses: boolean;
    pdfsAndNotes: boolean;
    quizzes: boolean;
    assignments: boolean;
    communitySupport: boolean;
    certificates: boolean;
    liveClasses: boolean;
    mentorSessions: boolean;
    doubtClearing: boolean;
    careerGuidance: boolean;
    mockInterviews: boolean;
    resumeReview: boolean;
    placementSupport: boolean;
    projectsCount: number;
  };
}

const AdminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [price, setPrice] = useState(0);
  const [duration, setDuration] = useState(6);
  const [features, setFeatures] = useState<any>({});

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/plans/admin');
      setPlans(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (plan: Plan) => {
    setSelectedPlan(plan);
    setPrice(plan.price);
    setDuration(plan.durationMonths);
    setFeatures({ ...plan.features });
  };

  const handleToggleFeature = (key: string) => {
    setFeatures((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setLoading(true);

    try {
      await api.put(`/plans/${selectedPlan._id}`, {
        price,
        durationMonths: duration,
        features,
      });

      alert('Subscription plan updated successfully!');
      setSelectedPlan(null);
      fetchPlans();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update plan');
      setLoading(false);
    }
  };

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-poppins text-slate-800 dark:text-slate-200">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dynamic Plan & Permissions Management</h2>
        <p className="text-xs text-slate-500">Enable or disable specific features per purchased course plan tier.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plans List Cards */}
        {plans.map((plan) => (
          <div key={plan._id} className="glass-card p-6 flex flex-col justify-between hover:shadow-xl hover:shadow-primary/5 transition duration-300">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">{plan.name}</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CODE: {plan.code}</span>
                </div>
              </div>

              <div className="py-2.5 border-y border-slate-100 dark:border-border-dark flex justify-between items-baseline">
                <span className="text-xs text-slate-500 font-medium">Pricing / Duration</span>
                <span className="text-xl font-extrabold text-accent">
                  ₹{plan.price.toLocaleString()} <span className="text-xs font-semibold text-slate-400">/ {plan.durationMonths} Mos</span>
                </span>
              </div>

              {/* Feature checkboxes overview */}
              <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  {plan.features.recordedClasses ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-slate-300" />}
                  Recorded Lectures
                </div>
                <div className="flex items-center gap-2">
                  {plan.features.liveClasses ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-slate-300" />}
                  Live Interactive Classes
                </div>
                <div className="flex items-center gap-2">
                  {plan.features.quizzes ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-slate-300" />}
                  Quizzes & Timer Tests
                </div>
                <div className="flex items-center gap-2">
                  {plan.features.assignments ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-slate-300" />}
                  Assignments Submission
                </div>
                <div className="flex items-center gap-2">
                  {plan.features.certificates ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-slate-300" />}
                  Graduation Certificates
                </div>
                <div className="flex items-center gap-2">
                  {plan.features.mockInterviews ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-slate-300" />}
                  Mock Interviews
                </div>
                <div className="flex items-center gap-2">
                  {plan.features.placementSupport ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-slate-300" />}
                  Placements Referral Assistance
                </div>
              </div>
            </div>

            <button
              onClick={() => handleEditClick(plan)}
              className="w-full mt-6 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-light flex items-center justify-center gap-1.5 transition"
            >
              <Edit3 className="w-4 h-4" /> Edit Price & Access
            </button>
          </div>
        ))}
      </div>

      {/* Edit plan modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-poppins">
          <div className="w-full max-w-md glass-card p-6 border border-white/5 space-y-5 text-left relative max-h-[85vh] overflow-y-auto dark:bg-card-dark">
            <button onClick={() => setSelectedPlan(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Configure: {selectedPlan.name}</h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400">Price (INR)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseInt(e.target.value))}
                    className="glass-input py-2 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">Duration (Months)</label>
                  <input
                    type="number"
                    required
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="glass-input py-2 text-xs"
                  />
                </div>
              </div>

              {/* Toggles details */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-border-dark">
                <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Toggle Resource Access</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  {Object.keys(features)
                    .filter((key) => typeof features[key] === 'boolean')
                    .map((key) => (
                      <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={features[key]}
                          onChange={() => handleToggleFeature(key)}
                          className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent accent-accent"
                        />
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                </div>
              </div>

              <button type="submit" className="btn-accent w-full py-2.5 text-xs">
                Save Plan Configurations
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPlans;
