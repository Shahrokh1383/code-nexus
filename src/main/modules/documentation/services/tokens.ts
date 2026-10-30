import { createServiceToken } from '../../../kernel/service-container';
import type { DocumentService } from './DocumentService';
import type { DocsFolderService } from './DocsFolderService';

export const DocumentServiceToken = createServiceToken<DocumentService>('DocumentService');
export const DocsFolderServiceToken = createServiceToken<DocsFolderService>('DocsFolderService');