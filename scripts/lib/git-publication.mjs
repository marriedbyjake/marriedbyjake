import {PublicationConflict} from './publishing-queue.mjs';

/** git is bound to the publisher's isolated checkout; it never shells strings. */
export function commitPublishedGit(git, contentHash, expectedHead) {
 git(['fetch','--no-tags','origin','main']);
 if(git(['rev-parse','origin/main'])!==expectedHead)throw new PublicationConflict('Remote Git main advanced while preparing this release');
 git(['add','--all','--','content/published','src/images/published']);
 git(['commit','--message',`Publish EmDash content ${contentHash.slice(0,12)}`]);
 const commit=git(['rev-parse','HEAD']);
 try{git(['push','origin','HEAD:refs/heads/main']);}
 catch{
  // A lost response after an accepted push must not become a duplicate commit.
  // If even the read fails, the caller retains its previous baseline and retries
  // safely; the next remote content check pauses for operator reconciliation.
  const remote=git(['ls-remote','origin','refs/heads/main']);
  if(remote.split(/\s/)[0]!==commit)throw new PublicationConflict('Push rejected or its outcome is uncertain; inspect remote before retrying');
 }
 return commit;
}
