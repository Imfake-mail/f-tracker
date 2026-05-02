import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();
  const { user } = useFinanceStore();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg('Check your email to confirm your account.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100vh', padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-dim)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Wallet size={28} color="var(--accent)" />
        </div>
        <h1 style={{ marginBottom: 4 }}>Finance Tracker</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Track your spending, stay in control</p>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 20 }}>{isLogin ? 'Sign In' : 'Create Account'}</h2>

        {error && <div style={{ background: 'var(--danger-dim)', color: 'var(--danger)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.8125rem', textAlign: 'center' }}>{error}</div>}
        {msg && <div style={{ background: 'var(--success-dim)', color: 'var(--success)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.8125rem', textAlign: 'center' }}>{msg}</div>}

        <form onSubmit={handleAuth}>
          <div className="input-group">
            <label className="input-label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="input-group" style={{ marginBottom: 20 }}>
            <label className="input-label">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); setMsg(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem', fontFamily: 'inherit' }}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}
