jest.mock('chokidar', () => ({
  watch: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    close: jest.fn(),
  }),
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue('mock file content'),
  },
}));

import chokidar from 'chokidar';
import { ChokidarAdapter } from '../../../infrastructure/adapters/chokidar.adapter';
import { EventBus } from '../../../../shared-kernel/events/event-bus';
import { FileModifiedEvent } from '../../../domain/events/file-modified';
import { FileDeletedEvent } from '../../../domain/events/file-deleted';
import { FileDiscoveredEvent } from '../../../domain/events/file-discovered';

jest.mock('../../../../shared-kernel/utils/hash-utils', () => ({
  HashUtils: {
    sha256: jest.fn().mockReturnValue('a'.repeat(64)),
  },
}));

jest.mock('../../../../shared-kernel/utils/uuid-generator', () => ({
  UuidGenerator: {
    generate: jest.fn().mockReturnValue('mock-uuid'),
  },
}));

describe('ChokidarAdapter', () => {
  let adapter: ChokidarAdapter;
  let eventBus: EventBus;

  beforeEach(() => {
    adapter = new ChokidarAdapter();
    eventBus = EventBus.getInstance();
    eventBus.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    adapter.stopWatching();
    eventBus.clear();
  });

  it('should start watching with correct parameters', () => {
    const mockWatcher = { on: jest.fn().mockReturnThis(), close: jest.fn() };
    (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);

    adapter.startWatching('/project', []);

    expect(chokidar.watch).toHaveBeenCalledWith('/project', {
      ignored: [],
      ignoreInitial: true,
      persistent: true,
      depth: Infinity,
    });
  });

  it('should stop watching and close watcher', () => {
    const mockClose = jest.fn();
    (chokidar.watch as jest.Mock).mockReturnValue({
      on: jest.fn().mockReturnThis(),
      close: mockClose,
    });

    adapter.startWatching('/project', []);
    adapter.stopWatching();

    expect(mockClose).toHaveBeenCalled();
  });

  it('should emit FileModifiedEvent on change after debounce', (done) => {
    const mockWatcher = { on: jest.fn().mockReturnThis(), close: jest.fn() };
    (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);

    const emitSpy = jest.spyOn(eventBus, 'emit');

    adapter.startWatching('/project', []);

    const changeHandler = (mockWatcher.on as jest.Mock).mock.calls.find(
      (call) => call[0] === 'change'
    )[1];
    changeHandler('/project/src/index.ts');

    setTimeout(() => {
      const modifiedEvents = emitSpy.mock.calls.filter(
        ([event]) => event instanceof FileModifiedEvent
      );
      expect(modifiedEvents.length).toBeGreaterThanOrEqual(1);
      emitSpy.mockRestore();
      done();
    }, 350);
  });

  it('should emit FileDiscoveredEvent on add after debounce', (done) => {
    const mockWatcher = { on: jest.fn().mockReturnThis(), close: jest.fn() };
    (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);

    const emitSpy = jest.spyOn(eventBus, 'emit');

    adapter.startWatching('/project', []);

    const addHandler = (mockWatcher.on as jest.Mock).mock.calls.find(
      (call) => call[0] === 'add'
    )[1];
    addHandler('/project/new-file.ts');

    setTimeout(() => {
      const discoveredEvents = emitSpy.mock.calls.filter(
        ([event]) => event instanceof FileDiscoveredEvent
      );
      expect(discoveredEvents.length).toBeGreaterThanOrEqual(1);
      emitSpy.mockRestore();
      done();
    }, 350);
  });

  it('should emit FileDeletedEvent on unlink after debounce', (done) => {
    const mockWatcher = { on: jest.fn().mockReturnThis(), close: jest.fn() };
    (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);

    const emitSpy = jest.spyOn(eventBus, 'emit');

    adapter.startWatching('/project', []);

    const unlinkHandler = (mockWatcher.on as jest.Mock).mock.calls.find(
      (call) => call[0] === 'unlink'
    )[1];
    unlinkHandler('/project/old-file.ts');

    setTimeout(() => {
      const deletedEvents = emitSpy.mock.calls.filter(
        ([event]) => event instanceof FileDeletedEvent
      );
      expect(deletedEvents.length).toBeGreaterThanOrEqual(1);
      emitSpy.mockRestore();
      done();
    }, 350);
  });

  it('should pass ignore patterns to chokidar', () => {
    const mockWatcher = { on: jest.fn().mockReturnThis(), close: jest.fn() };
    (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);

    adapter.startWatching('/project', [
      { pattern: 'node_modules/' } as any,
      { pattern: '*.log' } as any,
    ]);

    expect(chokidar.watch).toHaveBeenCalledWith(
      '/project',
      expect.objectContaining({
        ignored: ['node_modules/', '*.log'],
      })
    );
  });
});