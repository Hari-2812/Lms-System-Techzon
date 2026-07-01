import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Navigate } from 'react-router-dom';
import { setCredentials } from '../redux/authSlice';
import type { RootState } from '../redux/store';
import api from '../utils/api';
import { ShieldCheck, Mail, Lock, KeyRound, Loader2, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [useOtp, setUseOtp] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // If already logged in, redirect
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Handle OTP Trigger
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await api.post('/auth/send-otp', { email });
      setOtpSent(true);
      setMessage('A login passcode has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verify
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otpCode) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/verify-otp', {
        email,
        code: otpCode,
        userAgent: navigator.userAgent,
      });

      dispatch(setCredentials({
        user: res.data.user,
        token: res.data.token,
        deviceId: res.data.deviceId,
      }));

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid passcode entered.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Sign In
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        userAgent: navigator.userAgent,
      });

      dispatch(setCredentials({
        user: res.data.user,
        token: res.data.token,
        deviceId: res.data.deviceId,
      }));

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070312] relative overflow-hidden px-4">
      {/* Background Graphic Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#241252]/30 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#F57C20]/10 blur-[120px]" />

      {/* Login Box */}
      <div className="w-full max-w-md glass-card p-8 z-10 border border-white/5 relative overflow-hidden dark:bg-card-dark/70">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center font-bold text-white shadow-xl shadow-accent/20 mb-3 text-lg animate-float">
            TZ
          </div>
          <h2 className="text-2xl font-poppins font-bold text-white tracking-tight">Techzon LMS</h2>
          <p className="text-slate-400 text-xs text-center mt-1">
            Private Learning Portal for Enrollments
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/20 border border-red-800/30 text-red-400 text-xs font-poppins">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-emerald-400 text-xs font-poppins">
            {message}
          </div>
        )}

        {useOtp ? (
          // OTP LOGIN FLOW
          !otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-poppins font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Payment Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input pl-12 text-white placeholder-slate-500 text-sm focus:border-accent"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-accent w-full flex items-center justify-center gap-2 py-3.5">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send Verification Code <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-poppins font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Enter 6-Digit Passcode
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="glass-input pl-12 tracking-[0.5em] font-bold text-center text-white placeholder-slate-600 text-lg focus:border-accent"
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-accent w-full flex items-center justify-center gap-2 py-3.5">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code & Sign In'}
              </button>
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="w-full text-center text-xs text-slate-400 hover:text-white transition duration-200 mt-2 font-medium"
              >
                Change email address
              </button>
            </form>
          )
        ) : (
          // PASSWORD LOGIN FLOW
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-poppins font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input pl-12 text-white placeholder-slate-500 text-sm focus:border-accent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-poppins font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input pl-12 text-white placeholder-slate-500 text-sm focus:border-accent"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-accent w-full flex items-center justify-center py-3.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In with Password'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-xs font-medium text-slate-400">
          <span>Forgot your password?</span>
          <button
            onClick={() => {
              setUseOtp(!useOtp);
              setError('');
              setMessage('');
            }}
            className="text-accent hover:text-accent-hover transition duration-200"
          >
            Use {useOtp ? 'Password Sign In' : 'One-Time Passcode'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
