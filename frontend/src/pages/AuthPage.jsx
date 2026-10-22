import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { fieldError } from '../lib/errors.js';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const field = (key, label, props = {}) => {
    const msg = fieldError(error, key);
    return (
      <div className="field">
        <label htmlFor={key}>{label}</label>
        <input
          id={key}
          value={form[key]}
          onChange={set(key)}
          aria-invalid={Boolean(msg)}
          aria-describedby={msg ? `${key}-err` : undefined}
          required
          {...props}
        />
        {msg && <p id={`${key}-err`} className="field-error">{msg}</p>}
      </div>
    );
  };

  const hasFieldErrors = error?.details?.length > 0;

  return (
    <div className="auth">
      <section className="auth-intro">
        <span className="brand">Clinic Booking</span>
        <h1>One time slot, one patient.</h1>
        <p>
          Clinics publish the times they are free. Patients pick one and it is theirs, even when
          fifty people click at the same moment.
        </p>
      </section>

      <form className="card auth-form" onSubmit={submit} noValidate>
        <h2>{isRegister ? 'Create your account' : 'Sign in'}</h2>

        {isRegister && field('name', isRegister && form.role === 'clinic' ? 'Clinic name' : 'Full name')}
        {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
        {field('password', 'Password', {
          type: 'password',
          autoComplete: isRegister ? 'new-password' : 'current-password',
          minLength: isRegister ? 8 : undefined,
        })}

        {isRegister && (
          <fieldset className="field roles">
            <legend>I am a</legend>
            {['patient', 'clinic'].map((r) => (
              <label key={r} className={form.role === r ? 'chip chip-on' : 'chip'}>
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={form.role === r}
                  onChange={set('role')}
                />
                {r === 'patient' ? 'Patient' : 'Clinic'}
              </label>
            ))}
          </fieldset>
        )}

        {error && !hasFieldErrors && (
          <p className="form-error" role="alert">{error.message}</p>
        )}

        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>

        <p className="switch">
          {isRegister ? 'Already have an account?' : 'New here?'}{' '}
          <button
            type="button"
            className="link"
            onClick={() => {
              setMode(isRegister ? 'login' : 'register');
              setError(null);
            }}
          >
            {isRegister ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </div>
  );
}
