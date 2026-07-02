import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Navigate } from 'react-router-dom';
import { setCredentials } from '../redux/authSlice';
import type { RootState } from '../redux/store';
import api from '../services/api';
import { ShieldCheck, Mail, Lock, KeyRound, Loader2, ArrowRight, Eye, EyeOff, Info } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // OTP States
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Loading / Validation States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // If remember me email exists, autofill it
    const savedEmail = localStorage.getItem('remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Basic Validation
  const validateForm = () => {
    if (!email) {
      setError('Email address is required.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return false;
    }

    if (!useOtp && !password) {
      setError('Password is required.');
      return false;
    }
    if (!useOtp && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }

    return true;
  };

  // Handle OTP request
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please specify an email.');
      return;
    }
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
    if (!validateForm()) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        userAgent: navigator.userAgent,
      });

      if (rememberMe) {
        localStorage.setItem('remember_email', email);
      } else {
        localStorage.removeItem('remember_email');
      }

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
    <div className="min-h-screen flex items-center justify-center bg-bg-light dark:bg-bg-dark transition-colors duration-200 relative overflow-hidden px-4 font-poppins">
      {/* Background Graphic blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] dark:bg-primary/20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] dark:bg-accent/10" />

      {/* Main card box */}
      <div className="w-full max-w-lg bg-white dark:bg-card-dark p-8 rounded-2xl border border-slate-200/80 dark:border-border-dark shadow-glass dark:shadow-glass-dark z-10 space-y-6">
        
        {/* Brand header */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center font-bold text-white shadow-xl shadow-primary/25 mb-4 text-xl animate-float">
            TZ
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Techzon LMS</h2>
          <p className="text-slate-500 text-xs text-center mt-1">Private Learning Portal for Enrollments</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-semibold leading-relaxed">
            {message}
          </div>
        )}

        {useOtp ? (
          /* OTP SUBMISSIONS FLOW */
          !otpSent ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Payment Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="student@techzonwide.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm transition"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full btn-accent py-3 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Request Verification Code <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Enter OTP Passcode
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 tracking-[0.5em] font-bold text-center border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-base transition"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full btn-accent py-3 flex items-center justify-center">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code & Access LMS'}
              </button>
            </form>
          )
        ) : (
          /* PASSWORD SIGN IN FLOW */
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                LMS Account Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-slate-200 dark:border-border-dark bg-white text-[#111827] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password row */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-border-dark text-accent focus:ring-accent accent-accent"
                />
                Remember Me
              </label>
              <button
                type="button"
                onClick={() => setError('Password resets are managed via OTP passcode log-ins.')}
                className="hover:underline text-accent"
              >
                Forgot Password?
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 flex items-center justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In to LMS'}
            </button>
          </form>
        )}

        {/* Tab Toggle Choice */}
        <div className="pt-6 border-t border-slate-100 dark:border-border-dark flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Trouble logging in?</span>
          <button
            onClick={() => {
              setUseOtp(!useOtp);
              setError('');
              setMessage('');
              setOtpSent(false);
            }}
            className="text-accent hover:underline"
          >
            Use {useOtp ? 'Password Sign In' : 'One-Time Passcode'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
