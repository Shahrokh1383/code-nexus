/**
 * Channel aggregator — the only allow-list source for preload whitelisting
 * and renderer typing
 */
import { WORKSPACE_CHANNELS } from './workspace';
import { FILESYSTEM_CHANNELS } from './filesystem';
import { SYSTEM_CHANNELS } from './system';
import { DOCUMENTATION_CHANNELS } from './documentation';
import { LINKING_CHANNELS } from './linking';
import { TRACKING_CHANNELS } from './tracking';

export const ALL_IPC_CHANNELS = [
  ...Object.values(WORKSPACE_CHANNELS),
  ...Object.values(FILESYSTEM_CHANNELS),
  ...Object.values(SYSTEM_CHANNELS),
  ...Object.values(DOCUMENTATION_CHANNELS),
  ...Object.values(LINKING_CHANNELS),
  ...Object.values(TRACKING_CHANNELS),
] as const;

export type IpcChannel = (typeof ALL_IPC_CHANNELS)[number];

/** Main → renderer push channels. The only channels `on()` accepts. */
export const EVENT_CHANNELS = [
  FILESYSTEM_CHANNELS.TREE_UPDATED,
  LINKING_CHANNELS.UPDATED,
  TRACKING_CHANNELS.PENDING_UPDATED,
] as const;

export type EventChannel = (typeof EVENT_CHANNELS)[number];