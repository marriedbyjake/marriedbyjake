// Same-origin external script works under EmDash's admin CSP, including SPA
// navigation. It never reads entry payloads or reports a CMS save as live.
(() => {
  let pending = false;
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
    } catch {
      const text=document.querySelector('#website-publishing-status p');
      if(text)text.textContent='Publishing status is unavailable. Check before assuming your changes are live.';
    }
    finally { pending=false; }
  };
  void update(); setInterval(update,15000); document.addEventListener('visibilitychange',()=>{void update();});
})();
