/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {
      flexbox: 'no-2009',
      grid: 'autoplace',
      overrideBrowserslist: [
        '>0.2%',
        'not dead',
        'not op_mini all',
        'last 2 versions',
        'Chrome >= 54',
        'Firefox >= 52',
        'Safari >= 10',
        'Edge >= 79',
        'iOS >= 10',
      ],
    },
  },
};

export default config;