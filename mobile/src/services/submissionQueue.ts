import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { uploadSubmission } from './api';

const QUEUE_KEY = 'submission_queue';
const PHOTO_DIR = FileSystem.documentDirectory + 'queued_submissions/';

export interface QueuedSubmission {
  id: string;
  fields: Parameters<typeof uploadSubmission>[0];
  queuedAt: string;
}

async function getQueue(): Promise<QueuedSubmission[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function saveQueue(queue: QueuedSubmission[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(fields: Parameters<typeof uploadSubmission>[0]): Promise<void> {
  const id = Date.now().toString();
  // Copy photo to persistent location so it survives cache eviction
  await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  const persistedUri = PHOTO_DIR + id + '.jpg';
  await FileSystem.copyAsync({ from: fields.photoUri, to: persistedUri });

  const queue = await getQueue();
  queue.push({ id, fields: { ...fields, photoUri: persistedUri }, queuedAt: new Date().toISOString() });
  await saveQueue(queue);
}

export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function drainQueue(): Promise<{ succeeded: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const remaining: QueuedSubmission[] = [];

  for (const item of queue) {
    try {
      await uploadSubmission(item.fields);
      succeeded++;
      // Clean up persisted photo
      await FileSystem.deleteAsync(item.fields.photoUri, { idempotent: true }).catch(() => {});
    } catch {
      failed++;
      remaining.push(item);
    }
  }

  await saveQueue(remaining);
  return { succeeded, failed };
}
