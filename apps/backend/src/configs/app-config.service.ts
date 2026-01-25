import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from './env.validation.js';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService<EnvConfig, true>) {}

  get<T extends keyof EnvConfig>(key: T): EnvConfig[T] {
    return this.configService.get(key, { infer: true });
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get port(): number {
    return this.get('PORT');
  }

  get version(): string {
    return this.get('APP_VERSION');
  }
}
