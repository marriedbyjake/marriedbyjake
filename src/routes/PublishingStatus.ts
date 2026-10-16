import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isEditor } from '@/lib/editor-auth';
import { publishingStatus } from '@/publishing/status.mjs';
import { privateHeaders } from '@/lib/media-access.mjs';
export const prerender = false;
export const GET: APIRoute = async context => {
  if (!await isEditor(context)) return new Response('Sign in as an editor',{status:403,headers:privateHeaders});
  try { return Response.json(await publishingStatus(env),{headers:privateHeaders}); }
  catch { return Response.json({phase:'unavailable',message:'Publishing status is unavailable. Check again before assuming your changes are live.',canRetry:false},{status:503,headers:privateHeaders}); }
};
