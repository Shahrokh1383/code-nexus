import { HashGeneratorAdapter } from '../../../infrastructure/adapters/hash-generator.adapter';
import { HashUtils } from '../../../../shared-kernel/utils/hash-utils';

jest.mock('../../../../shared-kernel/utils/hash-utils', () => ({
  HashUtils: {
    sha256: jest.fn(),
  },
}));

describe('HashGeneratorAdapter', () => {
  let adapter: HashGeneratorAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new HashGeneratorAdapter();
  });

  describe('generate', () => {
    it('should delegate to HashUtils.sha256 and return its result', () => {
      const content = 'sample content';
      const expectedHash = 'abc123hash';
      (HashUtils.sha256 as jest.Mock).mockReturnValue(expectedHash);

      const result = adapter.generate(content);

      expect(HashUtils.sha256).toHaveBeenCalledWith(content);
      expect(result).toBe(expectedHash);
    });
  });
});