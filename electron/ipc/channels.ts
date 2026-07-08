export enum IpcChannels {
  PROJECT_OPEN = 'project:open',
  PROJECT_CLOSE = 'project:close',
  FILESYSTEM_SCAN = 'filesystem:scan',
  FILESYSTEM_WATCH = 'filesystem:watch',
  DOCUMENTATION_GET_LIST = 'documentation:get-list',
  LINKING_CREATE = 'linking:create',
  LINKING_DELETE = 'linking:delete',
  TRACKING_GET_STATUS = 'tracking:get-status',
  TRACKING_COMMIT = 'tracking:commit',
  NOTIFICATION_GET_WARNINGS = 'notification:get-warnings',
  NOTIFICATION_DISMISS = 'notification:dismiss',
}
