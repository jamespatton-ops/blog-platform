'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

export function NavLinks() {
  const { data: session } = useSession();
  if (session?.user) {
    return (
      <>
        <Link href="/write">Write</Link>
        <Link href="/settings/theme">Themes</Link>
        <button type="button" onClick={() => signOut()} className="link-button">
          Sign out
        </button>
      </>
    );
  }
  return <Link href="/login">Log in</Link>;
}
