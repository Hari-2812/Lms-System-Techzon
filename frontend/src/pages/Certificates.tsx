import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Award, Loader2, Download, ExternalLink, Calendar } from 'lucide-react';
import { PageHeader, EmptyState, Card, Button, LoadingState } from '../components/ui';

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
    return <LoadingState message="Loading your certificates..." />;
  }

  return (
    <div className="space-y-8 font-poppins pb-20">
      <PageHeader
        title="Graduation Certificates"
        subtitle="View and download your earned industry-recognized credentials."
      />

      {certs.length === 0 ? (
        <EmptyState
          icon={<Award className="w-12 h-12" />}
          title="No certificates issued yet"
          description="Certificates are automatically generated when you achieve 100% completion in your enrolled course lectures."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certs.map((cert) => {
            const verificationUrl = `/certificates/verify/${cert.verificationKey}`;
            return (
              <Card key={cert._id} className="flex flex-col justify-between hover:shadow-xl hover:shadow-primary/5 transition duration-300">
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

                <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="primary"
                    onClick={() => window.open(cert.pdfUrl || verificationUrl, '_blank')}
                    className="flex-1 flex justify-center items-center gap-1 text-[11px] px-2 py-2 min-h-[36px]"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF Download
                  </Button>
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1"
                  >
                    <Button variant="secondary" className="w-full flex justify-center items-center gap-1 text-[11px] px-2 py-2 min-h-[36px]">
                      Verify Link <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Certificates;
