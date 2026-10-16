export class PublicationConflict extends Error {}
export class PublicationPaused extends Error {}
export const retryDelays = [60_000,120_000,240_000];

/** One serialized attempt. Dependencies are narrow and replaceable in tests. */
export async function advancePublication(state, deps, now = Date.now()) {
  if (!state?.baselineHash) throw new PublicationPaused('Initialize a reviewed Git baseline before enabling the timer');
  if (state.phase === 'paused') throw new PublicationPaused(state.reason || 'Publication requires operator review');
  if (state.retryAt && now < state.retryAt) return state;
  if (state.pending) {
    const live = await deps.live();
    if (live.contentHash === state.pending.contentHash && live.sourceCommit === state.pending.commit) {
      return {...state, phase:'healthy', pending:undefined, failures:0, retryAt:undefined, lastHealthyAt:now};
    }
    if (now - state.pending.pushedAt > 30*60_000) throw new PublicationPaused('The pushed release has not become live within 30 minutes; inspect Cloudflare Builds');
    // Never queue a second build while this content release is unconfirmed.
    return {...state,phase:'awaiting-build'};
  }
  const remote = await deps.remote();
  if (remote.contentHash !== state.baselineHash) throw new PublicationConflict('Published Git files changed outside this queue; reconcile instead of overwriting');
  const prepared = await deps.prepare();
  if (prepared.contentHash === state.baselineHash) return {...state,phase:'healthy',failures:0,retryAt:undefined};
  if (!await deps.stillCurrent(prepared)) throw new Error('CMS publication or media changed during export; retry a fresh snapshot');
  // The implementation checks remote HEAD once more and uses an ordinary
  // fast-forward push. A racing Git edit rejects the push, never force-overwrites.
  const commit = await deps.commitAndPush(prepared, remote.commit);
  return {...state,baselineHash:prepared.contentHash,phase:'awaiting-build',failures:0,retryAt:undefined,pending:{commit,contentHash:prepared.contentHash,pushedAt:now}};
}
export function failedPublication(state, error, now = Date.now()) {
  if (error instanceof PublicationConflict || error instanceof PublicationPaused) return {...state,phase:'paused',reason:error.message,retryAt:undefined};
  const failures = (state.failures || 0)+1;
  if (failures > retryDelays.length) return {...state,phase:'paused',failures,reason:'Repeated publication failure; inspect private publisher status',retryAt:undefined};
  return {...state,phase:'retrying',failures,retryAt:now+retryDelays[failures-1],reason:'A publication attempt failed; retrying without changing the live site'};
}
