import { build } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
await build({ configFile:false, root, plugins:[react()], publicDir:false,
  define:{'process.env.NODE_ENV':'"production"'},
  build:{outDir:path.join(root,'public'),emptyOutDir:false,minify:true,target:'es2020',
    lib:{entry:path.join(root,'app/offline-entry.tsx'),formats:['es'],fileName:'offline-app',cssFileName:'offline-app'}}});
