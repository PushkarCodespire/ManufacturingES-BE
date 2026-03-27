function validateEnv() {
  const required = [
    'DB_NAME',
    'DB_USER',
    'DB_PASS',
    'DB_HOST',
    'JWT_SECRET',
  ];

  const recommended = [
    'PORT',
    'DB_PORT',
    'FRONTEND_URL',
    'NODE_ENV',
  ];

  const missing = required.filter(key => !process.env[key]);
  const missingRecommended = recommended.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing REQUIRED environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nSet these in your .env file or environment. Exiting...');
    process.exit(1);
  }

  if (missingRecommended.length > 0) {
    console.warn('⚠️  Missing recommended environment variables (using defaults):');
    missingRecommended.forEach(key => console.warn(`   - ${key}`));
  }

  console.log('✅ Environment variables validated');
}

module.exports = { validateEnv };
