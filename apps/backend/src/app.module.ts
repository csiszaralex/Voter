import { Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { AppService } from './app.service';
import { AppConfigModule } from './configs/app-config.module';

@Module({
  imports: [AppConfigModule],
  controllers: [],
  providers: [AppGateway, AppService],
})
export class AppModule {}
