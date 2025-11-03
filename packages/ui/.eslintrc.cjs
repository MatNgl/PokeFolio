module.exports = {
  extends: ['@pokefolio/eslint-config/react.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.eslintrc.cjs', 'dist', 'node_modules'],
};
