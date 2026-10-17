// Startup configuration checks. Messages describe the problem but never include the secret value.

const MIN_JWT_SECRET_LENGTH = 32;
const MIN_DISTINCT_CHARACTERS = 12;
const PLACEHOLDER_PATTERN = /secret|password|changeme|change_me|example|your_|your-|qwerty|test/i;

// Returns a description of what is wrong with the JWT secret, or null when it is acceptable
export const getJwtSecretProblem = (secret) => {
  if (typeof secret !== 'string' || secret.trim() === '') {
    return 'JWT_SECRET is not set';
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    return `JWT_SECRET is too short (minimum ${MIN_JWT_SECRET_LENGTH} characters)`;
  }
  if (new Set(secret).size < MIN_DISTINCT_CHARACTERS) {
    return 'JWT_SECRET is too repetitive; use a long random value';
  }
  if (PLACEHOLDER_PATTERN.test(secret)) {
    return 'JWT_SECRET looks like a placeholder; use a long random value';
  }
  return null;
};

// Returns a description of what is wrong with the database URL, or null when it looks usable
export const getDatabaseUrlProblem = (url) => {
  if (typeof url !== 'string' || url.trim() === '') return 'DATABASE_URL is not set';
  if (!url.startsWith('mysql://')) return 'DATABASE_URL must be a mysql:// connection URL';

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return 'DATABASE_URL is not a valid URL (special characters in the password must be URL-encoded)';
  }
  if (parsed.username === 'USER' || parsed.password === 'PASSWORD') {
    return 'DATABASE_URL still contains the USER/PASSWORD placeholder: put your local database login in backend/.env';
  }
  if (parsed.pathname.length <= 1) return 'DATABASE_URL must end with a database name, e.g. /leadflow';
  return null;
};

// Limits for lead imports (Excel/CSV). Optional: the defaults apply when the variables are not set.
const IMPORT_LIMITS = [
  { name: 'IMPORT_MAX_FILE_MB', fallback: 5, max: 50 },
  { name: 'IMPORT_MAX_ROWS', fallback: 5000, max: 50000 },
];

const parseLimit = (value, { fallback, max }) => {
  if (value === undefined || value === '') return fallback;
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= max ? Number(value) : null;
};

export const getImportLimitsProblem = (env = process.env) => {
  const bad = IMPORT_LIMITS.find((limit) => parseLimit(env[limit.name], limit) === null);
  return bad ? `${bad.name} must be a whole number from 1 to ${bad.max}` : null;
};

export const getImportLimits = (env = process.env) => {
  const [fileMb, rows] = IMPORT_LIMITS.map((limit) => parseLimit(env[limit.name], limit) ?? limit.fallback);
  return { maxFileBytes: fileMb * 1024 * 1024, maxRows: rows };
};

// Websites allowed to call the API. Locally that is the Vite dev server; when hosted, set CORS_ORIGINS to the frontend address(es), comma-separated.
const LOCAL_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export const getAllowedOrigins = (env = process.env) => {
  const listed = (env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim().replace(/\/+$/, '')).filter(Boolean);
  return listed.length > 0 ? listed : LOCAL_ORIGINS;
};

export const getCorsOriginsProblem = (env = process.env) => {
  const bad = getAllowedOrigins(env).find((origin) => !/^https?:\/\/[^/\s]+$/.test(origin));
  return bad ? 'CORS_ORIGINS must be a comma-separated list of origins like https://your-app.vercel.app (no path)' : null;
};

// Throws if required configuration is missing or unsafe. Call once at startup, before connecting to anything.
export const assertRequiredConfig = (env = process.env) => {
  const problems = [getDatabaseUrlProblem(env.DATABASE_URL), getJwtSecretProblem(env.JWT_SECRET), getImportLimitsProblem(env), getCorsOriginsProblem(env)].filter(Boolean);
  if (problems.length > 0) {
    throw new Error(problems.join('; '));
  }
};
