import {getImage} from 'astro:assets';
import {websiteSection,websiteImage} from '@/lib/website';
// The layout and reduced-motion behavior remain code; published values come
// from the revision-managed Background videos and posters section in EmDash.
export async function getHeroVideo(){
 const section=await websiteSection('hero-media');
 const poster=async(value:any,path:string,width:number,height:number)=>{
  if(!value?.id)return {poster:path,width,height};
  const selected=websiteImage(value,{src:path,width,height,format:'webp'});
  const transformed=await getImage({src:selected.image,width,format:'webp'});
  return {poster:transformed.src,width:selected.image.width,height:selected.image.height};
 };
 return {
  desktop:{src:section.desktop_video,...await poster(section.desktop_poster,section.desktop_poster_path,1920,1080)},
  mobile:{src:section.mobile_video,...await poster(section.mobile_poster,section.mobile_poster_path,768,996)},
  alt:section.poster_alt,
 };
}
