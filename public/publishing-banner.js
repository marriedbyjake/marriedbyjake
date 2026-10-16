// Same-origin external script works under EmDash's admin CSP, including SPA
// navigation. It never reads entry payloads or reports a CMS save as live.
(() => {
  let pending = false;
  const aggregateEntry = () => location.pathname.match(/^\/_emdash\/admin\/content\/(readings|pricing)\/([A-Z0-9]{26})$/);
  const previewSavedDraft = async (button) => {
    const entry=aggregateEntry(); if(!entry)return;
    button.disabled=true;
    try {
      // Use EmDash's authenticated, CSRF-protected signer. Aggregate pages
      // retain their existing URL patterns instead of changing content routes
      // just to satisfy the native collection-settings form's slug validation.
      const response=await fetch(`/_emdash/api/content/${entry[1]}/${entry[2]}/preview-url`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-EmDash-Request':'1'},body:'{}',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('Preview unavailable');
      const payload=await response.json();const url=new URL(payload.data?.url,location.origin);
      if(url.origin!==location.origin||url.pathname!==`/_preview/${entry[1]}/${entry[2]}`||!url.searchParams.has('_preview'))throw Error('Unexpected preview destination');
      window.open(url.href,'_blank','noopener,noreferrer');button.textContent='Preview saved draft';
    } catch { button.textContent='Preview unavailable — try again'; }
    finally {button.disabled=false;}
  };
  const update = async () => {
    if (pending || document.hidden) return;
    pending = true;
    try {
      const response = await fetch('/_publishing/status',{credentials:'same-origin',cache:'no-store'});
      if (response.status === 403) { document.getElementById('website-publishing-status')?.remove(); return; }
      const status = response.ok ? await response.json() : {message:'Publishing status is unavailable. Check before assuming your changes are live.'};
      let banner = document.getElementById('website-publishing-status');
      if (!banner) {
        banner = document.createElement('aside'); banner.id='website-publishing-status'; banner.setAttribute('aria-label','Website publishing');
        // A normal-flow bar avoids covering editor controls at small widths.
        const text=document.createElement('p'); text.setAttribute('role','status');
        const link=document.createElement('a'); link.href='/_publishing'; link.textContent='Website publishing status';
        banner.append(text,link); document.body.prepend(banner);
      }
      const text=banner.querySelector('p'); if (text.textContent!==status.message) text.textContent=status.message;
      let preview=banner.querySelector('button');
      if(aggregateEntry()&&!preview){preview=document.createElement('button');preview.type='button';preview.textContent='Preview saved draft';preview.addEventListener('click',()=>{void previewSavedDraft(preview);});banner.append(preview);}
      if(!aggregateEntry())preview?.remove();
    } catch {
      const text=document.querySelector('#website-publishing-status p');
      if(text)text.textContent='Publishing status is unavailable. Check before assuming your changes are live.';
    }
    finally { pending=false; }
  };
  void update(); setInterval(update,15000); document.addEventListener('visibilitychange',()=>{void update();});
})();
