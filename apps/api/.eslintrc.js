module.exports = {
  extends: ['@pokefolio/eslint-config/nestjs.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ['.eslintrc.js', 'dist', 'node_modules'],
};
