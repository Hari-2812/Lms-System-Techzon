import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { PageHeader, Card, Button, Input, LoadingState } from '../components/ui';
import { Save, ChevronLeft, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminProjectConfig: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [minorProject, setMinorProject] = useState<any>({
    title: '', description: '', instructions: '', projectPdf: '', isActive: true, requirements: []
  });
  const [majorProject, setMajorProject] = useState<any>({
    title: '', description: '', instructions: '', projectPdf: '', isActive: true, requirements: []
  });

  useEffect(() => {
    fetchConfig();
  }, [courseId]);

  const fetchConfig = async () => {
    try {
      const res = await api.get(`/admin/course-project-config/${courseId}`);
      if (res.data.data) {
        setMinorProject(res.data.data.minorProject);
        setMajorProject(res.data.data.majorProject);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load project configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/admin/course-project-config/${courseId}`, {
        minorProject,
        majorProject
      });
      toast.success('Project configuration saved successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateProject = (type: 'minor' | 'major', field: string, value: any) => {
    if (type === 'minor') setMinorProject({ ...minorProject, [field]: value });
    else setMajorProject({ ...majorProject, [field]: value });
  };

  const addRequirement = (type: 'minor' | 'major') => {
    const newReq = { name: '', type: 'url', isRequired: true };
    if (type === 'minor') setMinorProject({ ...minorProject, requirements: [...minorProject.requirements, newReq] });
    else setMajorProject({ ...majorProject, requirements: [...majorProject.requirements, newReq] });
  };

  const removeRequirement = (type: 'minor' | 'major', index: number) => {
    if (type === 'minor') {
      const reqs = [...minorProject.requirements];
      reqs.splice(index, 1);
      setMinorProject({ ...minorProject, requirements: reqs });
    } else {
      const reqs = [...majorProject.requirements];
      reqs.splice(index, 1);
      setMajorProject({ ...majorProject, requirements: reqs });
    }
  };

  const updateRequirement = (type: 'minor' | 'major', index: number, field: string, value: any) => {
    if (type === 'minor') {
      const reqs = [...minorProject.requirements];
      reqs[index] = { ...reqs[index], [field]: value };
      setMinorProject({ ...minorProject, requirements: reqs });
    } else {
      const reqs = [...majorProject.requirements];
      reqs[index] = { ...reqs[index], [field]: value };
      setMajorProject({ ...majorProject, requirements: reqs });
    }
  };

  if (loading) return <LoadingState message="Loading configuration..." />;

  const renderProjectForm = (title: string, type: 'minor' | 'major', project: any) => (
    <Card className={`space-y-6 ${type === 'major' ? 'border-t-4 border-purple-500' : 'border-t-4 border-blue-500'}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={project.isActive} 
            onChange={(e) => updateProject(type, 'isActive', e.target.checked)}
            className="rounded text-accent focus:ring-accent"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</span>
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project Title</label>
          <Input 
            value={project.title} 
            onChange={(e) => updateProject(type, 'title', e.target.value)} 
            placeholder="e.g. Build a Portfolio Website" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
          <textarea 
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-accent focus:border-accent block p-2.5 dark:bg-bg-dark dark:border-slate-700 dark:placeholder-slate-400 dark:text-white min-h-[100px]"
            value={project.description} 
            onChange={(e) => updateProject(type, 'description', e.target.value)}
            placeholder="Detailed description of what the student must accomplish..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Instructions (Optional)</label>
          <textarea 
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-accent focus:border-accent block p-2.5 dark:bg-bg-dark dark:border-slate-700 dark:placeholder-slate-400 dark:text-white min-h-[80px]"
            value={project.instructions} 
            onChange={(e) => updateProject(type, 'instructions', e.target.value)}
            placeholder="Step-by-step instructions..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project PDF Link (Optional)</label>
          <Input 
            value={project.projectPdf} 
            onChange={(e) => updateProject(type, 'projectPdf', e.target.value)} 
            placeholder="https://..." 
          />
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Submission Requirements</h3>
          <Button variant="secondary" size="sm" onClick={() => addRequirement(type)} className="flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Requirement
          </Button>
        </div>

        <div className="space-y-3">
          {project.requirements?.map((req: any, index: number) => (
            <div key={index} className="flex gap-3 items-start bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
              <div className="flex-1 space-y-3">
                <Input 
                  value={req.name} 
                  onChange={(e) => updateRequirement(type, index, 'name', e.target.value)} 
                  placeholder="Requirement Name (e.g. GitHub URL)" 
                />
                <div className="flex gap-4">
                  <select 
                    className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5 dark:bg-bg-dark dark:border-slate-700 dark:placeholder-slate-400 dark:text-white"
                    value={req.type}
                    onChange={(e) => updateRequirement(type, index, 'type', e.target.value)}
                  >
                    <option value="url">URL Link</option>
                    <option value="file">File Upload</option>
                  </select>
                  <label className="flex items-center gap-2 w-full cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={req.isRequired} 
                      onChange={(e) => updateRequirement(type, index, 'isRequired', e.target.checked)}
                      className="rounded text-accent focus:ring-accent"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Required</span>
                  </label>
                </div>
              </div>
              <button 
                onClick={() => removeRequirement(type, index)}
                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(!project.requirements || project.requirements.length === 0) && (
            <p className="text-sm text-slate-500 text-center py-4">No specific submission requirements defined.</p>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 font-poppins pb-20 animate-fade-in">
      <Button variant="secondary" onClick={() => navigate('/admin/courses')} className="mb-2 flex items-center gap-2">
        <ChevronLeft className="w-4 h-4" /> Back to Courses
      </Button>

      <PageHeader
        title="Course Project Configuration"
        subtitle="Define the Minor and Major projects for this specific course."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderProjectForm('Minor Project Template', 'minor', minorProject)}
        {renderProjectForm('Major Project Template', 'major', majorProject)}
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          variant="primary" 
          className="flex items-center gap-2 px-8 py-3"
          onClick={handleSave}
          disabled={saving}
        >
          <Save className="w-5 h-5" /> {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};

export default AdminProjectConfig;
