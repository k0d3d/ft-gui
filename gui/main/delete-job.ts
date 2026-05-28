import { deleteXBookmarks, getCurrentBookmarkTweetIds } from '../../src/bookmark-delete.js';
import { detectValidSessions, type BrowserSession } from '../../src/graphql-bookmarks.js';

interface DeleteJobResult {
  deleted: number;
  errors: string[];
}

interface StartDeleteBookmarksJobDeps {
  randomUUID?: () => string;
  tweetIds?: string[];
  getCurrentBookmarkTweetIds?: (session: BrowserSession) => Promise<string[]> | string[];
  detectValidSessions?: () => Promise<BrowserSession[]> | BrowserSession[];
  deleteXBookmarks?: (
    tweetIds: string[],
    session: BrowserSession,
    onProgress?: (done: number, total: number) => void,
  ) => Promise<DeleteJobResult>;
  emit: (channel: string, payload: unknown) => void;
}

export function startDeleteBookmarksJob(deps: StartDeleteBookmarksJobDeps): { jobId: string; finished: Promise<void> } {
  const {
    randomUUID = () => crypto.randomUUID(),
    tweetIds,
    getCurrentBookmarkTweetIds: loadTweetIds = getCurrentBookmarkTweetIds,
    detectValidSessions: loadSessions = detectValidSessions,
    deleteXBookmarks: runDelete = deleteXBookmarks,
    emit,
  } = deps;

  const jobId = randomUUID();

  const finished = Promise.resolve()
    .then(async () => {
      const sessions = await loadSessions();
      if (!sessions.length) {
        throw new Error('No browser session found. Open x.com in Chrome or Firefox first.');
      }

      const ids = tweetIds ?? await loadTweetIds(sessions[0]);
      if (!ids.length) {
        throw new Error(tweetIds?.length ? 'No bookmarks selected for deletion.' : 'No live bookmarks found in your X account.');
      }

      emit('delete:progress', { jobId, done: 0, total: ids.length });

      const result = await runDelete(ids, sessions[0], (done, total) => {
        emit('delete:progress', { jobId, done, total });
      });

      emit('delete:done', { jobId, deleted: result.deleted, errors: result.errors.length });
    })
    .catch((err: unknown) => {
      emit('delete:error', {
        jobId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

  return { jobId, finished };
}
