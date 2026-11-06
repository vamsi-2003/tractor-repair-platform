module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';

  const plugins = [];
  if (isProduction) {
    // Strip verbose console.log and console.info in production builds
    // Leaves console.error and console.warn intact for crash reporting telemetry
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
