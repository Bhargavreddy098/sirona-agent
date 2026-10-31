import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins:[react(),tailwindcss(),{name:'legacy-preview-path',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url?.split('?')[0]==='/tests/ai-chat-fixture.html')req.url='/index.html';next();});}}],
  resolve: {
    alias: {
      '@sirona/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
    },
  },
  server:{host:'127.0.0.1',port:5178,strictPort:true,proxy:{'/api/v1':{target:'http://127.0.0.1:8000',changeOrigin:true,ws:true}}},
  build:{outDir:'dist',minify:false,sourcemap:true}
});
