# Syncboard

An offline-first, standalone program management tool with local AI integration built using Electron, React, and Vite. Data is persisted securely in local files using Markdown and YAML configuration.

## Setup and Execution

1. Make sure Node.js is installed.
2. Clone or download the repository, then change directory to `pmt-app`.
3. Install dependencies:
   ```bash
   npm install
   ```

### Start Development Server
Run the local Vite and Electron instances concurrently:
```bash
npm run dev
```

### Package and Deploy Executable
To package the app into a deployable final desktop application (installers for Windows, macOS, and Linux):
```bash
npm run dist
```
The compiled executables and installers will be generated in the `dist-electron` folder.
- **Windows**: Produces an `.exe` installer (NSIS) and a portable `.zip` file.
- **macOS**: Produces a `.dmg` installer and a `.zip` file.
- **Linux**: Produces an `.AppImage` portable executable and a `.deb` package.

Once generated, you can deploy these artifacts directly to your users or upload them as GitHub releases.

### Run Tests
To execute the unit test suite:
```bash
npm run test
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
