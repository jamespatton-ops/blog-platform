import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';
import { DEFAULT_TOKENS } from '@/lib/tokens';
import { DEFAULT_THEME_NAME, OWNER_EMAIL, OWNER_ID, OWNER_PASSWORD } from '@/lib/constants';

const prisma = new PrismaClient();

async function main() {
  const password = OWNER_PASSWORD;
  const hashed = await hash(password);

  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: { hash: hashed },
    create: { id: OWNER_ID, email: OWNER_EMAIL, hash: hashed }
  });

  const theme = await prisma.theme.upsert({
    where: { name: DEFAULT_THEME_NAME },
    update: {
      tokens: DEFAULT_TOKENS,
      ownerId: owner.id,
      isDefault: true
    },
    create: {
      name: DEFAULT_THEME_NAME,
      tokens: DEFAULT_TOKENS,
      ownerId: owner.id,
      isDefault: true
    }
  });

  await prisma.theme.updateMany({
    where: { ownerId: owner.id, id: { not: theme.id } },
    data: { isDefault: false }
  });

  console.log(`Seeded ${owner.email} with theme "${theme.name}"`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
