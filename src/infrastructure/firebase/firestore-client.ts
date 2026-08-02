/**
 * Firebase Firestore Client Adapter
 *
 * Wraps Firebase Admin SDK Firestore with type-safe operations.
 */

import * as admin from 'firebase-admin';
import type { ILogger } from '../../telemetry/logger.js';

export interface FirestoreConfig {
  projectId: string;
  clientEmail?: string;
  privateKey?: string;
  useEmulator?: boolean;
  emulatorHost?: string;
  firestoreEmulatorPort?: number;
}

export interface IDocumentData {
  [field: string]: unknown;
}

export interface IQueryOptions {
  readonly limit?: number;
  readonly offset?: number;
  readonly orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  readonly startAfter?: unknown;
  readonly startAt?: unknown;
  readonly endBefore?: unknown;
  readonly endAt?: unknown;
}

export interface IFirestoreClient {
  getCollection<T extends IDocumentData>(
    collectionPath: string,
    filters?: IFirestoreFilter[],
    options?: IQueryOptions,
  ): Promise<readonly { id: string; data: T }[]>;
  getDocument<T extends IDocumentData>(
    collectionPath: string,
    docId: string,
  ): Promise<{ id: string; data: T } | null>;
  createDocument<T extends IDocumentData>(
    collectionPath: string,
    docId: string,
    data: T,
  ): Promise<string>;
  updateDocument(
    collectionPath: string,
    docId: string,
    data: Partial<IDocumentData>,
  ): Promise<void>;
  deleteDocument(collectionPath: string, docId: string): Promise<void>;
  runTransaction<T>(
    fn: (transaction: admin.firestore.Transaction) => Promise<T>,
  ): Promise<T>;
  batch(): admin.firestore.WriteBatch;
  collectionRef(path: string): admin.firestore.CollectionReference;
  docRef(path: string, id?: string): admin.firestore.DocumentReference;
  healthCheck(): Promise<boolean>;
}

export interface IFirestoreFilter {
  readonly field: string;
  readonly operator: admin.firestore.WhereFilterOp;
  readonly value: unknown;
}

export class FirestoreClientAdapter implements IFirestoreClient {
  private readonly firestore: admin.firestore.Firestore;

  constructor(
    config: FirestoreConfig,
    private readonly logger: ILogger,
  ) {
    if (!admin.apps.length) {
      if (config.useEmulator) {
        process.env['FIRESTORE_EMULATOR_HOST'] =
          `${config.emulatorHost ?? 'localhost'}:${config.firestoreEmulatorPort ?? 8080}`;
        admin.initializeApp({ projectId: config.projectId });
      } else {
        admin.initializeApp({
          credential: config.clientEmail && config.privateKey
            ? admin.credential.cert({
                projectId: config.projectId,
                clientEmail: config.clientEmail,
                privateKey: config.privateKey,
              })
            : admin.credential.applicationDefault(),
          projectId: config.projectId,
        });
      }
    }

    this.firestore = admin.firestore();
    this.firestore.settings({
      ignoreUndefinedProperties: true,
      timestampsInSnapshots: true,
    });

    this.logger.info({ projectId: config.projectId }, 'Firestore initialized');
  }

  async getCollection<T extends IDocumentData>(
    collectionPath: string,
    filters?: IFirestoreFilter[],
    options?: IQueryOptions,
  ): Promise<readonly { id: string; data: T }[]> {
    let query: admin.firestore.Query = this.firestore.collection(collectionPath);

    if (filters) {
      for (const filter of filters) {
        query = query.where(filter.field, filter.operator, filter.value);
      }
    }

    if (options?.orderBy) {
      for (const order of options.orderBy) {
        query = query.orderBy(order.field, order.direction);
      }
    }

    if (options?.startAfter) {
      query = query.startAfter(options.startAfter);
    }

    if (options?.startAt) {
      query = query.startAt(options.startAt);
    }

    if (options?.endBefore) {
      query = query.endBefore(options.endBefore);
    }

    if (options?.endAt) {
      query = query.endAt(options.endAt);
    }

    if (options?.offset) {
      query = query.offset(options.offset);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      data: doc.data() as T,
    }));
  }

  async getDocument<T extends IDocumentData>(
    collectionPath: string,
    docId: string,
  ): Promise<{ id: string; data: T } | null> {
    const doc = await this.firestore.collection(collectionPath).doc(docId).get();
    if (!doc.exists) return null;
    return { id: doc.id, data: doc.data() as T };
  }

  async createDocument<T extends IDocumentData>(
    collectionPath: string,
    docId: string,
    data: T,
  ): Promise<string> {
    await this.firestore.collection(collectionPath).doc(docId).set(data);
    return docId;
  }

  async updateDocument(
    collectionPath: string,
    docId: string,
    data: Partial<IDocumentData>,
  ): Promise<void> {
    await this.firestore.collection(collectionPath).doc(docId).update(data);
  }

  async deleteDocument(
    collectionPath: string,
    docId: string,
  ): Promise<void> {
    await this.firestore.collection(collectionPath).doc(docId).delete();
  }

  async runTransaction<T>(
    fn: (transaction: admin.firestore.Transaction) => Promise<T>,
  ): Promise<T> {
    return this.firestore.runTransaction(fn);
  }

  batch(): admin.firestore.WriteBatch {
    return this.firestore.batch();
  }

  collectionRef(path: string): admin.firestore.CollectionReference {
    return this.firestore.collection(path);
  }

  docRef(
    path: string,
    id?: string,
  ): admin.firestore.DocumentReference {
    if (id) {
      return this.firestore.collection(path).doc(id);
    }
    return this.firestore.doc(path);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.firestore.listCollections();
      return true;
    } catch {
      return false;
    }
  }
}
