import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { AppConfigService } from 'src/configs/app-config.service';
import { StateRepository } from './state.repository';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: AppConfigService) => {
        return new Redis({
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
        });
      },
      inject: [ConfigService],
    },
    StateRepository,
  ],
  exports: ['REDIS_CLIENT', StateRepository],
})
export class RedisModule {}
