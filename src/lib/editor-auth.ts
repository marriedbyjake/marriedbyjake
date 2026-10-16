import type { APIContext } from 'astro';
// Media-file APIs are public in EmDash, so its normal auth middleware does not
// resolve their session. Revalidate the user against the DB, never trust cookies
// or a cached session role. The read times out closed.
export async function isEditor(context: Pick<APIContext,'locals'|'session'>) {
  if (context.locals.user) return !context.locals.user.disabled && context.locals.user.role >= 30;
  const db = context.locals.emdash?.db;
  if (!db || !context.session) return false;
  let timer: number | undefined;
  try {
    const user = await Promise.race([
      context.session.get('user').catch(() => undefined),
      new Promise<undefined>(resolve => { timer = setTimeout(resolve,3000); }),
    ]);
    if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string') return false;
    const current = await db.selectFrom('users').select(['role','disabled']).where('id','=',user.id).executeTakeFirst();
    return !!current && !current.disabled && current.role >= 30;
  } finally { clearTimeout(timer); }
}
