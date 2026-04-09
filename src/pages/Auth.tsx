import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Mail, Lock, Phone } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'phone';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  // Clear errors when switching modes
  useEffect(() => {
    setError('');
    setMessage('');
    setEmailError('');
    setPasswordError('');
    setOtpSent(false);
  }, [mode]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (pwd: string): string => {
    if (!pwd) return 'Password is required';
    if (pwd.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const handleEmailAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!email || !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError('');

    if (mode === 'signup') {
      const passError = validatePassword(password);
      if (passError) {
        setPasswordError(passError);
        return;
      }
      if (password !== passwordConfirm) {
        setPasswordError('Passwords do not match');
        return;
      }
      setPasswordError('');
    } else {
      if (!password) {
        setPasswordError('Password is required');
        return;
      }
      setPasswordError('');
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            emailRedirectTo: `${window.location.origin}`,
            data: {
              full_name: email.split('@')[0],
            }
          },
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        setMessage('✓ Account created! Check your email to confirm your account.');
        setEmail('');
        setPassword('');
        setPasswordConfirm('');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (error) {
          throw new Error(error.message || 'Invalid email or password');
        }

        if (data.session) {
          setMessage('✓ Login successful!');
          setTimeout(() => {
            navigate('/');
          }, 500);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, passwordConfirm, mode, navigate]);

  const handleGoogleLogin = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
        },
      });
      if (error) throw new Error(error.message);
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Google login failed. Please try again.');
      setLoading(false);
    }
  }, []);

  const handleSendOTP = useCallback(async () => {
    if (!phone.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        phone: phone.replace(/\D/g, ''),
        options: {
          shouldCreateUser: true,
        }
      });
      if (error) throw new Error(error.message);
      setOtpSent(true);
      setMessage('✓ OTP sent to your phone!');
    } catch (err: any) {
      console.error('OTP error:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const handleVerifyOTP = useCallback(async () => {
    if (!otp.trim() || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({ 
        phone: phone.replace(/\D/g, ''),
        token: otp, 
        type: 'sms' 
      });
      if (error) throw new Error(error.message);
      
      if (data.session) {
        setMessage('✓ OTP verified successfully!');
        setTimeout(() => {
          navigate('/');
        }, 500);
      }
    } catch (err: any) {
      console.error('OTP verification error:', err);
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [phone, otp, navigate]);


  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        {/* Brand */}
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-primary">ENVIQ AI</h1>
          <p className="text-sm text-muted-foreground mt-2">Environmental Intelligence for South India</p>
        </div>

        {/* Auth Card */}
        <div className="env-card space-y-6 p-6 rounded-2xl border border-border">
          {/* Mode Tabs */}
          <div className="flex gap-1 bg-secondary rounded-xl p-1">
            {(['login', 'signup', 'phone'] as AuthMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  mode === m 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'login' ? 'Login' : m === 'signup' ? 'Sign Up' : 'Phone'}
              </button>
            ))}
          </div>

          {/* Messages */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
            </div>
          )}

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-secondary text-foreground font-semibold text-sm border border-border hover:bg-secondary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? 'Loading...' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email/Password Form */}
          {mode !== 'phone' ? (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className={`w-full bg-secondary text-foreground rounded-lg px-4 py-3 text-sm border transition-all focus:outline-none focus:ring-2 ${
                    emailError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-border focus:ring-primary focus:border-primary'
                  }`}
                  placeholder="you@example.com"
                />
                {emailError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{emailError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`w-full bg-secondary text-foreground rounded-lg px-4 py-3 text-sm border transition-all focus:outline-none focus:ring-2 ${
                    passwordError
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-border focus:ring-primary focus:border-primary'
                  }`}
                  placeholder="••••••••"
                />
                {passwordError && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{passwordError}</p>
                )}
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    required
                    minLength={6}
                    className={`w-full bg-secondary text-foreground rounded-lg px-4 py-3 text-sm border transition-all focus:outline-none focus:ring-2 ${
                      passwordError
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-border focus:ring-primary focus:border-primary'
                    }`}
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block animate-spin">⟳</span>
                    Loading...
                  </span>
                ) : mode === 'login' ? (
                  'Log In'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          ) : (
            /* Phone OTP Form */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  disabled={otpSent}
                  placeholder="+91 98765 43210"
                  className="w-full bg-secondary text-foreground rounded-lg px-4 py-3 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {otpSent && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    OTP Code (6 digits)
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-secondary text-foreground rounded-lg px-4 py-3 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest font-monospace"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={otpSent ? handleVerifyOTP : handleSendOTP}
                  disabled={loading}
                  className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block animate-spin">⟳</span>
                      Loading...
                    </span>
                  ) : otpSent ? (
                    'Verify OTP'
                  ) : (
                    'Send OTP'
                  )}
                </button>
                
                {otpSent && (
                  <button
                    onClick={() => setOtpSent(false)}
                    disabled={loading}
                    className="px-4 py-3 rounded-lg border border-border text-foreground font-semibold text-sm transition-all hover:bg-secondary disabled:opacity-50"
                  >
                    Back
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
