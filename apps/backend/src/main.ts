import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { EarlyDataGuard } from './common/earlyData.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalGuards(new EarlyDataGuard());
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap();
