import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Serve uploaded files at /uploads/*
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('cors.origin');
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin?.split(',').map((o) => o.trim()) ?? true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Chat API')
    .setDescription(
      'Multi-platform chat backend (LINE, Facebook, IG). ' +
        'Platforms use external_account_id (e.g. LINE destination). ' +
        'Customer identities map external_user_id per platform. ' +
        'Rooms are 1:1 per customer per OA. Chats support direction IN/OUT and external_message_id for webhook dedup.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(configService.get<number>('port') ?? 5000);
}
bootstrap();
