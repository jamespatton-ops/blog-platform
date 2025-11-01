'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function LoginForm({ redirectTo }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl: redirectTo
    });

    if (result?.error) {
      setError('Incorrect email or password');
      setIsSubmitting(false);
      return;
    }

    router.push(result?.url ?? redirectTo);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
      <label>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>
      <label>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {error ? <p className="status-indicator" style={{ color: 'var(--accent)' }}>{error}</p> : null}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
