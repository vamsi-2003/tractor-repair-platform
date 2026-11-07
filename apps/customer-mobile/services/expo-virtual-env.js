const supabaseUrl = 'https://clkukpyeqphgeaiikaru.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3VrcHllcXBoZ2VhaWlrYXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5OTc1ODAsImV4cCI6MjEwODU3MzU4MH0.6z1ZC80_gdlISNrZWemjFsfbhNR3wIgMvyFdOO7JMsI';

const env = {
  EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: supabaseKey,
};

module.exports = {
  env,
  ...env,
};
