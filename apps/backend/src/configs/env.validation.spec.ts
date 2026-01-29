import { validate } from './env.validation';

describe('EnvValidation', () => {
  it('should validate valid config', () => {
    const config = {
      NODE_ENV: 'production',
      PORT: 4000,
      APP_VERSION: '1.2.3',
    };
    const validated = validate(config);
    expect(validated).toEqual(expect.objectContaining(config));
  });

  it('should use default values', () => {
    const config = {};
    const validated = validate(config);
    expect(validated.PORT).toBe(3000);
    expect(validated.NODE_ENV).toBe('development');
  });

  it('should coerce types', () => {
    const config = {
      PORT: '5000',
    };
    const validated = validate(config);
    expect(validated.PORT).toBe(5000);
  });

  it('should throw error for invalid values', () => {
    const config = {
      PORT: 'not-a-number',
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => validate(config)).toThrow('Invalid environment variables');
  });
});
