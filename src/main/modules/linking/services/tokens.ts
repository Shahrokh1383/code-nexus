import { createServiceToken } from '../../../kernel/service-container';
import type { CodeLinkService } from './CodeLinkService';
import type { DocumentLinkService } from './DocumentLinkService';
import type { LinkCountUpdater } from './LinkCountUpdater';

export const CodeLinkServiceToken =
  createServiceToken<CodeLinkService>('CodeLinkService');
export const DocumentLinkServiceToken =
  createServiceToken<DocumentLinkService>('DocumentLinkService');
export const LinkCountUpdaterToken =
  createServiceToken<LinkCountUpdater>('LinkCountUpdater');