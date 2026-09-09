import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port:            parseInt(process.env.PORT ?? '4000', 10),
  mongoUri:        process.env.MONGO_URI ?? '',
  jwtSecret:       process.env.JWT_SECRET ?? '',
  jwtExpiresIn:    '7d' as const,
  frontendOrigin:  process.env.FRONTEND_ORIGIN ?? 'https://steganaliz.emerc.site',
  nodeEnv:         process.env.NODE_ENV ?? 'development',
  isProduction:    process.env.NODE_ENV === 'production',
};

if (!config.mongoUri)   throw new Error('MONGO_URI env variable is required');
if (!config.jwtSecret)  throw new Error('JWT_SECRET env variable is required');
if (config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}