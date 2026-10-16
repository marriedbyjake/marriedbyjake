import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {isEditor} from '@/lib/editor-auth';
import {retryFromEditor} from '@/publishing/status.mjs';
import {privateHeaders} from '@/lib/media-access.mjs';
export const prerender=false;
export const POST: APIRoute = async context => {
  const response=await retryFromEditor(context.request,env,await isEditor(context));
  Object.entries(privateHeaders).forEach(([key,value])=>response.headers.set(key,value));
  return response;
};
