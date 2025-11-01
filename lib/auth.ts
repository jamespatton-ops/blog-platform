import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { verify } from 'argon2';
import { prisma } from './db';
import { OWNER_EMAIL } from './constants';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & { id: string };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (credentials.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) return null;

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;

        const match = await verify(user.hash, credentials.password);
        if (!match) return null;

        return { id: user.id, email: user.email };
      }
    })
  ],
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
      }
      return token;
    }
  }
});
