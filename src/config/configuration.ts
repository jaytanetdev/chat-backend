export default () => ({
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  database: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
    username: process.env['DB_USERNAME'] ?? 'postgres',
    password: process.env['DB_PASSWORD'] ?? '',
    database: process.env['DB_DATABASE'] ?? 'chat_db',
  },
  jwt: {
    secret: process.env['JWT_SECRET'] ?? 'default-secret-change-me',
    expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
  },
  cors: {
    origin: process.env['CORS_ORIGIN'] ?? '*',
  },
  platforms: {
    line: {
      channelSecret: process.env['LINE_CHANNEL_SECRET'],
      channelAccessToken: process.env['LINE_CHANNEL_ACCESS_TOKEN'],
    },
    facebook: {
      appSecret: process.env['FB_APP_SECRET'],
      pageAccessToken: process.env['FB_PAGE_ACCESS_TOKEN'],
    },
    instagram: {
      verifyToken: process.env['IG_VERIFY_TOKEN'],
    },
  },
  shopee: {
    partnerId: parseInt(process.env['SHOPEE_PARTNER_ID'] || '0', 10),
    partnerKey: process.env['SHOPEE_PARTNER_KEY'],
    redirectUrl: process.env['SHOPEE_REDIRECT_URL'],
  },
  lazada: {
    appKey: process.env['LAZADA_APP_KEY'],
    appSecret: process.env['LAZADA_APP_SECRET'],
    redirectUrl: process.env['LAZADA_REDIRECT_URL'],
  },
});
