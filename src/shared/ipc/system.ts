/**
 * System-level IPC contract — dialog + renderer error reporting.
 * Must stay free of Zod, Node.js imports, and runtime logic
 */
export const SYSTEM_CHANNELS = {
  OPEN_FOLDER: 'dialog:open-folder',
  REPORT_ERROR: 'system:report-error',
} as const;

/** Resolved folder picker result: empty array when the dialog was cancelled. */
export type OpenFolderResult = readonly string[];

export interface ReportErrorInput {
  readonly message: string;
  readonly stack?: string;
}