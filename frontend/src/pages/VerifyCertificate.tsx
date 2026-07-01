import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Award, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';

interface VerifyData {
  certificateNumber: string;
  studentName: string;
  courseName: string;
  courseCategory: string;
  completionDate: string;
  company: string;
}

const VerifyCertificate: React.FC = () => {
  const { key } = useParams<{ key: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VerifyData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
        const res = await axios.get(`${baseUrl}/certificates/verify/${key}`);
        setData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invalid certificate verification link');
      } finally {
        setLoading(false);
      }
    };
    checkVerification();
  }, [key]);

  return (
    <div className="min-h-screen bg-[#060310] flex items-center justify-center font-poppins text-white px-4 relative overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[130px]" />
      
      <div className="w-full max-w-lg glass-card border border-white/5 p-8 text-center space-y-6 relative z-10 dark:bg-card-dark/80">
        <div className="w-16 h-16 rounded-2xl bg-accent/20 text-accent flex items-center justify-center mx-auto text-xl shadow-lg shadow-accent/15 animate-float">
          <Award className="w-8 h-8" />
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p className="text-xs text-slate-400">Verifying credential signatures...</p>
          </div>
        ) : error ? (
          <div className="py-8 space-y-4">
            <HelpCircle className="w-12 h-12 mx-auto text-red-500" />
            <div>
              <h3 className="text-lg font-bold">Verification Failed</h3>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
            </div>
          </div>
        ) : (
          data && (
            <div className="space-y-6">
              <div>
                <span className="text-[10px] bg-accent/15 text-accent font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Verified Credential
                </span>
                <h2 className="text-2xl font-bold mt-4 leading-tight">{data.studentName}</h2>
                <p className="text-xs text-slate-400 mt-1">Has successfully completed the curriculum requirements for</p>
              </div>

              <div className="p-5 border border-white/5 rounded-2xl bg-slate-950/20 text-left space-y-2">
                <span className="text-[10px] text-accent font-bold uppercase tracking-wider">{data.courseCategory}</span>
                <h4 className="font-extrabold text-base leading-5 text-white">{data.courseName}</h4>
                <p className="text-[11px] text-slate-400 font-medium">Provided by {data.company}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs border-t border-white/5 pt-5 text-slate-400 font-medium">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Completion Date</p>
                  <p className="text-white mt-1">{new Date(data.completionDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500">Certificate Number</p>
                  <p className="text-white mt-1 truncate">{data.certificateNumber}</p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/5 py-3 rounded-xl border border-emerald-500/10">
                <ShieldCheck className="w-4 h-4" /> Authenticated by Techzon Wide Registrar
              </div>
            </div>
          )
        )}

        <div className="text-[10px] text-slate-500 font-semibold pt-4">
          Techzon Wide Private LMS System Verification Authority.
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificate;
