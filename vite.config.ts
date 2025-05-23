import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import dts from 'vite-plugin-dts';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
      tsconfigPath: './tsconfig.app.json' // <--- 添加或确保此行存在
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'ReactScroll', // Standard PascalCase for library name
      fileName: (format) => {
        if (format === 'es') {
          return 'react-scroll.js'; // <--- 修改这里
        }
        // For other formats like umd, cjs, it will be react-scroll.umd.js, react-scroll.cjs.js
        return `react-scroll.${format}.js`;
      },      
      formats: ['es', 'umd', 'cjs'], // Output formats
    },
    rollupOptions: {
      // Make sure to externalize dependencies that you don't want to bundle into your library
      external: ['react', 'react-dom'],
      output: {
        // Provide global variables to use in the UMD build for externalized dependencies
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    sourcemap: true, // Optional: generate sourcemaps
  },
});
