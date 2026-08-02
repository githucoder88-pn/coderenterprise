export { RedisClientAdapter, type IRedisClient, type RedisConfig } from './redis/redis-client.js';
export { CacheService, type ICacheService } from './redis/cache.js';

export { FirestoreClientAdapter, type IFirestoreClient, type IFirestoreFilter, type IDocumentData, type IQueryOptions } from './firebase/firestore-client.js';
export { AuthClientAdapter, type IAuthClient, type IUserRecord, type ICreateUserParams } from './firebase/auth-client.js';
export { StorageClientAdapter, type IStorageClient, type IStorageUploadParams, type IStorageDownloadResult, type IStorageFile } from './firebase/storage-client.js';
