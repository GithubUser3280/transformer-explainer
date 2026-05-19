import { FormEvent, useState } from 'react';

type AuthPanelProps = {
  open: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  onSubmit: (password: string) => void;
  onClose: () => void;
};

export function AuthPanel({ open, isLoading, errorMessage, onSubmit, onClose }: AuthPanelProps) {
  const [password, setPassword] = useState('');

  if (!open) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(password);
  }

  return (
    <section className="auth-modal" role="dialog" aria-modal="true" aria-label="Login required">
      <h2>Login required</h2>
      <p>Enter the shared password to generate a real trace from <code>/api/trace</code>.</p>
      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="access-password">Password</label>
        <input
          id="access-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isLoading}
          required
        />
        <div className="button-row">
          <button type="submit" disabled={isLoading || !password.trim()}>{isLoading ? 'Logging in…' : 'Login'}</button>
          <button type="button" className="secondary" onClick={onClose} disabled={isLoading}>Cancel</button>
        </div>
      </form>
      {errorMessage ? <p className="warning">{errorMessage}</p> : null}
    </section>
  );
}
