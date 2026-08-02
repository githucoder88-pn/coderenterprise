/**
 * Firebase Provider
 *
 * Creates and manages all Firebase service clients.
 */

import { FirestoreClientAdapter, type IFirestoreClient, type FirestoreConfig } from '../infrastructure/firebase/firestore-client.js';
import { AuthClientAdapter, type IAuthClient } from '../infrastructure/firebase/auth-client.js';
import { StorageClientAdapter, type IStorageClient } from '../infrastructure/firebase/storage-client.js';
import type { ILogger } from '../telemetry/logger.js';

export interface FirebaseProvider {
  readonly firestore: IFirestoreClient;
  readonly auth: IAuthClient;
  readonly storage: IStorageClient;
  healthCheck(): Promise<{ firestore: boolean; auth: boolean; storage: boolean }>;
}

export function createFirebaseProvider(
  config: FirestoreConfig & { storageBucket?: string },
  logger: ILogger,
): FirebaseProvider {
  const firestore = new FirestoreClientAdapter(config, logger);
  const auth = new AuthClientAdapter(logger);
  const storage = new StorageClientAdapter(
    config.storageBucket ?? config.projectId + '.appspot.com',
    logger,
  );

  return {
    firestore,
    auth,
    storage,
    async healthCheck() {
      const [fsOk, authOk, storageOk] = await Promise.allSettled([
        firestore.healthCheck(),
        auth.healthCheck(),
        storage.healthCheck(),
      ]);
      return {
        firestore: fsOk.status === 'fulfilled' && fsOk.value,
        auth: authOk.status === 'fulfilled' && authOk.value,
        storage: storageOk.status === 'fulfilled' && storageOk.value,
      };
    },
  };
}
