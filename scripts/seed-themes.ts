import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PRESETS = {
  Plain: {
    font: {
      sans: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif',
      serif: 'Georgia, "Times New Roman", serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      body: 'sans',
      headings: 'serif',
      code: 'mono',
      opticalSizing: true,
      liga: true
    },
    type: {
      basePx: 18,
      leading: 1.55,
      maxCh: 72,
      hScale: 1.2,
      paraSpace: 0.65
    },
    colors: {
      light: { bg: '#ffffff', text: '#0b0b0b', muted: '#666666', accent: '#0f62fe' },
      dark: { bg: '#0b0b0b', text: '#f5f5f5', muted: '#9a9a9a', accent: '#7aa2ff' },
      hc: { bg: '#ffffff', text: '#000000', muted: '#000000', accent: '#0000ff' }
    },
    links: { underline: true, offset: 3, thickness: 1 },
    rules: { hyphens: 'auto', orphans: 2, widows: 2 }
  }
};

async function main() {
  // Create or get the owner user
  const hash = await argon2.hash('password123');
  
  let owner = await prisma.user.findUnique({ where: { id: 'OWNER' } });
  
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        id: 'OWNER',
        email: 'owner@example.com',
        hash
      }
    });
    console.log('Created owner user');
  }
  
  // Clear and seed themes
  await prisma.theme.deleteMany();
  
  for (const [name, tokens] of Object.entries(PRESETS)) {
    await prisma.theme.create({
      data: {
        name,
        tokens: tokens as any,
        isDefault: name === 'Plain',
        ownerId: owner.id
      }
    });
    console.log(`Created theme: ${name}`);
  }
  
  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
