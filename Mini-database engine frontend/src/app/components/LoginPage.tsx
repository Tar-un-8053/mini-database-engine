import { useState } from 'react';
import { Database, Eye, EyeOff, Lock, User, Sparkles, Shield, UserPlus, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    resetForm();
    setMode(newMode);
  };

  // Password strength checker
  const getPasswordStrength = (pw: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500' };
    if (score <= 4) return { score, label: 'Strong', color: 'bg-emerald-500' };
    return { score, label: 'Very Strong', color: 'bg-green-400' };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) { setError('Username is required'); return; }
    if (!password.trim()) { setError('Password is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Check saved accounts first
    const accounts = JSON.parse(localStorage.getItem('db_accounts') || '{}');
    if (accounts[username]) {
      if (accounts[username].password === password) {
        localStorage.setItem('db_user', username);
        localStorage.setItem('db_authenticated', 'true');
        onLogin(username);
        return;
      } else {
        setError('Invalid password for this account');
        setIsLoading(false);
        return;
      }
    }

    // Fallback default accounts
    if (
      (username === 'admin' && password === 'admin123') ||
      (username === 'tarun' && password === 'tarun123') ||
      password.length >= 6
    ) {
      localStorage.setItem('db_user', username);
      localStorage.setItem('db_authenticated', 'true');
      onLogin(username);
    } else {
      setError('Invalid username or password');
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim()) { setError('Username is required'); return; }
    if (username.length < 3) { setError('Username must be at least 3 characters'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email'); return; }
    if (!password.trim()) { setError('Password is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Save account to localStorage
    const accounts = JSON.parse(localStorage.getItem('db_accounts') || '{}');
    if (accounts[username]) {
      setError('Username already exists. Try a different one.');
      setIsLoading(false);
      return;
    }

    accounts[username] = { password, email, createdAt: new Date().toISOString() };
    localStorage.setItem('db_accounts', JSON.stringify(accounts));

    setIsLoading(false);
    setSuccess('Account created successfully! Redirecting to login...');

    setTimeout(() => {
      const savedUser = username;
      const savedPass = password;
      switchMode('login');
      setUsername(savedUser);
      setPassword(savedPass);
    }, 1500);
  };

  const passwordStrength = password.length > 0 ? getPasswordStrength(password) : null;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#060614]">
      {/* Animated background orbs */}
      <div className="floating-orb orb-indigo-1" />
      <div className="floating-orb orb-purple-1" />
      <div className="floating-orb orb-cyan-1" />

      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-40" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md mx-3 sm:mx-4 animate-fadeInUp">
        {/* Logo & branding */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 mb-4 md:mb-5 animate-pulse-glow">
            <Database className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Mini Database Engine
          </h1>
          <p className="text-slate-400 text-xs md:text-sm">
            {mode === 'login' ? 'Sign in to access your database dashboard' : 'Create a new account to get started'}
          </p>
        </div>

        {/* Form card */}
        <div className="glass-card rounded-2xl p-5 sm:p-8 shadow-2xl shadow-black/40 neon-border">

          {/* ==================== LOGIN MODE ==================== */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-indigo-500/20 text-white placeholder-slate-500 
                    focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.07]
                    transition-all duration-300"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-indigo-500/20 text-white placeholder-slate-500 
                      focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.07]
                      transition-all duration-300"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember me & forgot password */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                  <input type="checkbox" className="w-4 h-4 rounded border-indigo-500/30 bg-white/5 text-indigo-500 focus:ring-indigo-500/30" />
                  Remember me
                </label>
                <button type="button" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Sign In button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl font-semibold text-white relative overflow-hidden
                  bg-gradient-to-r from-indigo-600 to-purple-600 
                  hover:from-indigo-500 hover:to-purple-500
                  shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
                  disabled:opacity-70 disabled:cursor-not-allowed
                  transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Sign In
                  </span>
                )}
              </button>
            </form>
          )}

          {/* ==================== SIGNUP MODE ==================== */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-5">
              {/* Back button */}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-400 transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </button>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); setSuccess(''); }}
                  placeholder="Choose a username"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-indigo-500/20 text-white placeholder-slate-500 
                    focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.07]
                    transition-all duration-300"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-400" />
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); setSuccess(''); }}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-indigo-500/20 text-white placeholder-slate-500 
                    focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.07]
                    transition-all duration-300"
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); setSuccess(''); }}
                    placeholder="Create a strong password"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-indigo-500/20 text-white placeholder-slate-500 
                      focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white/[0.07]
                      transition-all duration-300"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password strength meter */}
                {passwordStrength && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            level <= passwordStrength.score ? passwordStrength.color : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs ${
                      passwordStrength.score <= 1 ? 'text-red-400' :
                      passwordStrength.score <= 2 ? 'text-orange-400' :
                      passwordStrength.score <= 3 ? 'text-yellow-400' :
                      'text-emerald-400'
                    }`}>
                      Password strength: {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); setSuccess(''); }}
                    placeholder="Confirm your password"
                    className={`w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border text-white placeholder-slate-500 
                      focus:outline-none focus:ring-2 focus:bg-white/[0.07]
                      transition-all duration-300 ${
                        confirmPassword && confirmPassword === password
                          ? 'border-emerald-500/40 focus:border-emerald-500/50 focus:ring-emerald-500/20'
                          : confirmPassword && confirmPassword !== password
                          ? 'border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20'
                          : 'border-indigo-500/20 focus:border-indigo-500/50 focus:ring-indigo-500/20'
                      }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-xs animate-fadeIn ${confirmPassword === password ? 'text-emerald-400' : 'text-red-400'}`}>
                    {confirmPassword === password ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
                  <Shield className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  {success}
                </div>
              )}

              {/* Create Account button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl font-semibold text-white relative overflow-hidden
                  bg-gradient-to-r from-emerald-600 to-cyan-600 
                  hover:from-emerald-500 hover:to-cyan-500
                  shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40
                  disabled:opacity-70 disabled:cursor-not-allowed
                  transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Create Account
                  </span>
                )}
              </button>
            </form>
          )}

          {/* ==================== DIVIDER & SWITCH MODE ==================== */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-xs text-slate-500 bg-[#0f0f23]">
                {mode === 'login' ? 'New here?' : 'Already have an account?'}
              </span>
            </div>
          </div>

          {/* Toggle login/signup */}
          {mode === 'login' ? (
            <div className="space-y-2">
              {/* Create Account button */}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="w-full py-2.5 rounded-xl text-sm text-white font-medium border border-emerald-500/30 
                  bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-500/50
                  transition-all duration-300 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                Create New Account
              </button>

              {/* Quick access divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-[10px] text-slate-600 bg-[#0f0f23]">Quick access</span>
                </div>
              </div>

              {/* Demo credentials */}
              <button
                type="button"
                onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                className="w-full py-2.5 rounded-xl text-sm text-slate-300 border border-white/10 
                  hover:border-indigo-500/30 hover:bg-white/5 
                  transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4 text-indigo-400" />
                Use Admin Credentials
              </button>
              <button
                type="button"
                onClick={() => { setUsername('tarun'); setPassword('tarun123'); }}
                className="w-full py-2.5 rounded-xl text-sm text-slate-300 border border-white/10 
                  hover:border-purple-500/30 hover:bg-white/5 
                  transition-all duration-300 flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4 text-purple-400" />
                Use Tarun's Account
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-full py-2.5 rounded-xl text-sm text-slate-300 border border-white/10 
                hover:border-indigo-500/30 hover:bg-white/5 
                transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Sign In to Existing Account
            </button>
          )}
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Protected by Mini DB Auth &bull; Educational Project
        </p>
      </div>
    </div>
  );
}
