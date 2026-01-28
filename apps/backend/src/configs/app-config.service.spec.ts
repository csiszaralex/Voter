import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getters', () => {
    it('should return port', () => {
      jest.spyOn(configService, 'get').mockReturnValue(3000);
      expect(service.port).toBe(3000);
      expect(configService.get).toHaveBeenCalledWith('PORT', { infer: true });
    });

    it('should return version', () => {
      jest.spyOn(configService, 'get').mockReturnValue('1.0.0');
      expect(service.version).toBe('1.0.0');
      expect(configService.get).toHaveBeenCalledWith('APP_VERSION', { infer: true });
    });

    it('should return isProduction true', () => {
      jest.spyOn(configService, 'get').mockReturnValue('production');
      expect(service.isProduction).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV', { infer: true });
    });

    it('should return isProduction false', () => {
      jest.spyOn(configService, 'get').mockReturnValue('development');
      expect(service.isProduction).toBe(false);
    });
  });
});
