import { createServiceToken } from '../../../kernel/service-container';
import type { TrackingService } from './TrackingService';
import type { QueryService } from './QueryService';
import type { LinkedDocumentQuery } from '../infrastructure/LinkedDocumentQuery';

export const TrackingServiceToken = createServiceToken<TrackingService>('TrackingService');
export const QueryServiceToken = createServiceToken<QueryService>('QueryService');
export const LinkedDocumentQueryToken =
  createServiceToken<LinkedDocumentQuery>('LinkedDocumentQuery');