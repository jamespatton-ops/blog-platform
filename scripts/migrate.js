#!/usr/bin/env node
const { promises: fs } = require('fs');
const path = require('path');

async function main() {
  const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH ?? './data/app.json');
  await fs.mkdir(path.dirname(databasePath), { recursive: true });
  try {
    await fs.access(databasePath);
    console.log(`Database already present at ${databasePath}`);
  } catch (error) {
    const initial = {
      users: [],
      posts: [],
      themes: [],
      fontFaces: []
    };
    await fs.writeFile(databasePath, JSON.stringify(initial, null, 2));
    console.log(`Created database at ${databasePath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
