import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import LoginForm from './LoginForm';

export default async function LoginPage({ searchParams }) {
  const session = await getAuthSession();
  if (session?.user) {
    redirect(searchParams?.redirect ?? '/');
  }

  return (
    <section style={{ maxWidth: '28rem' }}>
      <h1>Owner login</h1>
      <LoginForm redirectTo={searchParams?.redirect ?? '/'} />
    </section>
  );
}
