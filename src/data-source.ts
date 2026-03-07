import { DataSource } from 'typeorm';

// โหลด .env เมื่อรันผ่าน CLI (ถ้ามี dotenv)
try {
  require('dotenv').config();
} catch {
  // dotenv ไม่ได้ติดตั้ง ก็ใช้ process.env จากการตั้งค่า shell ได้
}

export default new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  username: process.env['DB_USERNAME'] ?? 'postgres',
  password: process.env['DB_PASSWORD'] ?? '',
  database: process.env['DB_DATABASE'] ?? 'chat_db',
  entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: false,
  logging: process.env['DB_LOGGING'] === 'true',
});
