import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { DEFAULT_TOKENS } from '../lib/tokens.js';
import { DEFAULT_THEME_NAME, OWNER_EMAIL, OWNER_ID, OWNER_PASSWORD } from '../lib/constants.js';

const prisma = new PrismaClient();

async function main() {
  const email = OWNER_EMAIL.toLowerCase();
  const hash = await argon2.hash(OWNER_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email },
    update: { hash },
    create: {
      id: OWNER_ID,
      email,
      hash
    }
  });

  const theme = await prisma.theme.upsert({
    where: { name: DEFAULT_THEME_NAME },
    update: {
      ownerId: user.id,
      tokens: DEFAULT_TOKENS,
      isDefault: true
    },
    create: {
      ownerId: user.id,
      name: DEFAULT_THEME_NAME,
      tokens: DEFAULT_TOKENS,
      isDefault: true
    }
  });

  await prisma.theme.updateMany({
    where: { ownerId: user.id, id: { not: theme.id } },
    data: { isDefault: false }
  });

  console.log('Seeded owner account and default theme.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
