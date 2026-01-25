import { Controller, Get } from '@nestjs/common';
import { AppConfigService } from './configs/app-config.service';

@Controller('health')
export class AppController {
  constructor(private readonly configService: AppConfigService) {}

  @Get('version')
  getVersion() {
    return {
      version: this.configService.version,
      timestamp: new Date().toISOString(),
    };
  }
}
