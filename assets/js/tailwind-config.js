// Tailwind CSS Configuration - Shared across all pages
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: {
            50: '#eef9ff',
            100: '#d6eeff',
            200: '#b0ddff',
            300: '#7ac4ff',
            400: '#3fa3ff',
            500: '#1c86ff',
            600: '#0864db',
            700: '#064fb0',
            800: '#08438f',
            900: '#0b376f'
          },
          slate: {
            950: '#020617'
          }
        }
      }
    }
  };
}
