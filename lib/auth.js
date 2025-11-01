import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from './prisma';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
          return null;
        }
        const valid = await argon2.verify(user.hash, password);
        if (!valid) {
          return null;
        }
        return { id: user.id, email: user.email };
      }
    })
  ],
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && session?.user) {
        session.user.id = token.id;
        session.user.email = token.email;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireAuthUser() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
