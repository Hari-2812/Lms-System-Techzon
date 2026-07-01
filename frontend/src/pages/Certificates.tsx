import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Award, Loader2, Download, ExternalLink, Calendar } from 'lucide-react';

interface Certificate {
  _id: string;
  certificateNumber: string;
  verificationKey: string;
  issueDate: string;
  pdfUrl?: string;
  courseId?: {
    title: string;
    category: string;
  };
}

const Certificates: React.FC = () => {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const res = await api.get('/certificates/student');
      setCerts(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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
    <div className="space-y-8 font-poppins">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Graduation Certificates</h2>
        <p className="text-xs text-slate-500">View and download your earned industry-recognized credentials.</p>
      </div>

      {certs.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3 max-w-2xl mx-auto">
          <Award className="w-12 h-12 mx-auto text-slate-400" />
          <h4 className="text-lg font-bold text-slate-600 dark:text-slate-300 font-poppins">No certificates issued yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Certificates are automatically generated when you achieve 100% completion in your enrolled course lectures.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certs.map((cert) => {
            const verificationUrl = `/certificates/verify/${cert.verificationKey}`;
            return (
              <div key={cert._id} className="glass-card p-6 flex flex-col justify-between hover:shadow-xl hover:shadow-primary/5 transition duration-300">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
                    <Award className="w-6 h-6 animate-float" />
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-accent font-bold uppercase tracking-wider">
                      {cert.courseId?.category || 'Software Engineering'}
                    </span>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white leading-5">
                      {cert.courseId?.title || 'Full Stack Course'}
                    </h3>
                  </div>

                  <div className="text-[10px] text-slate-400 space-y-1 font-semibold">
                    <p>Credential Number: {cert.certificateNumber}</p>
                    <p className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Issued on: {new Date(cert.issueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-border-dark">
                  <button
                    onClick={() => window.open(cert.pdfUrl || verificationUrl, '_blank')}
                    className="flex-1 py-2 px-3 rounded-lg bg-primary text-white text-[11px] font-bold hover:bg-primary-light flex items-center justify-center gap-1 transition"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF Download
                  </button>
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 dark:bg-card-dark dark:border-border-dark dark:text-slate-300 text-[11px] font-bold hover:bg-slate-50 flex items-center justify-center gap-1 transition"
                  >
                    Verify Link <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Certificates;
