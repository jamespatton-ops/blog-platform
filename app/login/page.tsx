'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/write';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false
    });

    if (result?.error) {
      setError('Invalid credentials');
      return;
    }

    window.location.href = redirect;
  }

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: '2rem' }}>Login</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', maxWidth: '24rem' }}>
        <label style={{ display: 'grid', gap: '0.5rem' }}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label style={{ display: 'grid', gap: '0.5rem' }}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit">Sign in</button>
        {error && (
          <p style={{ color: 'crimson', fontSize: '0.875rem' }}>{error}</p>
        )}
      </form>
    </main>
  );
}
