#!/bin/sh
set -e

npx prisma migrate deploy

# Seed a default typeface (DejaVu Sans) on first boot so the template
# layout editor has at least one usable font. Idempotent: only inserts
# when the typefaces table is empty, and only copies the TTF if missing.
TYPEFACE_DIR=/app-certificates/storage/typefaces
mkdir -p "$TYPEFACE_DIR"

# Install a default font record if typefaces table is empty
node -e "
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('./app/generated/prisma/client.js');
(async () => {
  try {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });
    const count = await prisma.typeface.count();
    if (count === 0) {
      const tf = await prisma.typeface.create({
        data: { name: 'DejaVu Sans', weight: 400, style: 'normal' },
      });
      console.log('Seeded default typeface id=' + tf.id);
    }
    await prisma.\$disconnect();
  } catch (e) {
    console.error('typeface seed skipped:', e.message);
  }
})();
" || true

# Copy DejaVu Sans TTF to storage if typeface id=1 has no file yet
if [ -f /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf ] && [ ! -f "$TYPEFACE_DIR/1.ttf" ] && [ ! -f "$TYPEFACE_DIR/1.otf" ]; then
  cp /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf "$TYPEFACE_DIR/1.ttf"
  echo "Copied DejaVu Sans to $TYPEFACE_DIR/1.ttf"
fi

exec npm run start
