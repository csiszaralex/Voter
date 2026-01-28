import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppConfigService } from './configs/app-config.service';

describe('AppController', () => {
  let appController: AppController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let appConfigService: AppConfigService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppConfigService,
          useValue: {
            version: '1.0.0',
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appConfigService = app.get<AppConfigService>(AppConfigService);
  });

  describe('getVersion', () => {
    it('should return the version and timestamp', () => {
      const result = appController.getVersion();
      expect(result).toEqual({
        version: '1.0.0',
        timestamp: expect.any(String) as unknown,
      });
    });
  });
});
