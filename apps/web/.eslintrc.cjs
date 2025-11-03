module.exports = {
  extends: ['@pokefolio/eslint-config/react.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['vite.config.ts', 'dist', 'node_modules'],
};
