export function hostedDatabaseError(env) {
  const host = (env.MYSQL_HOST || '').trim().toLowerCase();
  if (!host || ['localhost', '::1', '[::1]', '0.0.0.0', '::'].includes(host) || /^127\./.test(host)) {
    return 'Use a hosted MySQL address, not a local computer address.';
  }
  if (['MYSQL_DATABASE', 'MYSQL_USER', 'MYSQL_PASSWORD'].some(key => !env[key])) {
    return 'The hosted database credentials are incomplete.';
  }
  if (env.MYSQL_SSL !== 'true' && !env.MYSQL_SSL_CA) {
    return 'Enable verified TLS for the hosted database connection.';
  }
  return null;
}

export function databaseOptions(env) {
  const tls = env.MYSQL_SSL === 'true' || Boolean(env.MYSQL_SSL_CA);
  return {
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT || 3306),
    database: env.MYSQL_DATABASE,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    ...(tls ? { ssl: {
      rejectUnauthorized: true,
      ...(env.MYSQL_SSL_CA ? { ca: env.MYSQL_SSL_CA.replace(/\\n/g, '\n') } : {}),
    } } : {}),
    waitForConnections: true,
    connectionLimit: env.VERCEL ? 5 : 10,
    maxIdle: env.VERCEL ? 2 : 10,
    idleTimeout: 10000,
    dateStrings: true,
    connectTimeout: tls ? 10000 : 5000,
    queueLimit: 50,
  };
}
