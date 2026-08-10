import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { signIn, signUp, resetPassword } = useAuth();

  const title =
    mode === 'signup' ? 'Sign Up' : mode === 'forgot' ? 'Reset Password' : 'Sign In';

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setMessage('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const { error: resetError } = await resetPassword(email);
        if (resetError) {
          setError(resetError.message);
        } else {
          setMessage('Check your email for a password reset link.');
        }
      } else if (mode === 'signup') {
        const { error: authError } = await signUp(email, password);
        if (authError) {
          setError(authError.message);
        } else {
          setMessage('Check your email to confirm your account!');
        }
      } else {
        const { error: authError } = await signIn(email, password);
        if (authError) {
          setError(authError.message);
        } else {
          setTimeout(() => {
            onClose();
          }, 100);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {message}
            </div>
          )}
          {mode === 'forgot' && !message && (
            <p className="text-sm text-gray-600">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? 'Loading...'
              : mode === 'forgot'
                ? 'Send reset link'
                : mode === 'signup'
                  ? 'Sign Up'
                  : 'Sign In'}
          </button>
          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Forgot your password?
            </button>
          )}
          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              Back to sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
              className="w-full text-sm text-blue-600 hover:underline"
            >
              {mode === 'signup'
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
