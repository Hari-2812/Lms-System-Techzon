import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { KeyRound, ShieldAlert, Loader2, CheckCircle } from 'lucide-react';
import { Card, Button, Input } from '../components/ui';
import type { RootState } from '../redux/store';
import { setCredentials } from '../redux/authSlice';
import api from '../services/api';

const ChangePassword: React.FC = () => {
  const { user, token, deviceId } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.put('/auth/update-password', {
        currentPassword,
        newPassword,
      });

      setSuccess(true);

      // Update local storage and Redux store state
      if (user && token && deviceId) {
        const updatedUser = { ...user, needsPasswordChange: false };
        dispatch(setCredentials({ user: updatedUser, token, deviceId }));
      }

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update temporary password. Verify current password is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center font-poppins">
      <Card className="w-full max-w-md space-y-6 text-xs font-semibold">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl shadow-lg">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-white">Change Password Required</h2>
          <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
            You are logging in with a temporary password. For account security, you must update your password before accessing the dashboard.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-500 font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" /> {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> Password updated! Redirecting to dashboard...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Current Temporary Password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading || success}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">New Secure Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading || success}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Confirm New Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={loading || success}
              className="w-full"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={loading || success}
            className="w-full flex items-center justify-center gap-1.5 transition text-xs"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Secure Password'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ChangePassword;
