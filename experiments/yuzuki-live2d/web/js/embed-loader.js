/** Zero-dependency floating avatar iframe. Loads no AI keys or third-party assets. */
(function(window,document){
 'use strict';
 const script=document.currentScript;
 const defaultURL=script?.src?new URL('../widget.html',script.src).href:'./widget.html';
 function mount({target=document.body,widgetUrl=defaultURL,srcdoc=null,width=280,height=390,bottom=20,right=20,transparent=false,onEvent=()=>{}}={}){
   const root=document.createElement('div');root.className='yuzuki-embed-root';
   Object.assign(root.style,{position:'fixed',zIndex:'2147483000',bottom:`${bottom}px`,right:`${right}px`,width:`min(${width}px, calc(100vw - 20px))`,height:`min(${height}px, calc(100vh - 20px))`,pointerEvents:'auto'});
   const frame=document.createElement('iframe');frame.title='柚希互动角色';frame.allow='';frame.loading='eager';frame.style.cssText='display:block;width:100%;height:100%;border:0;border-radius:20px;background:transparent;';
   const url=new URL(widgetUrl,document.baseURI.startsWith('about:')?'https://yuzuki.local/':document.baseURI);if(transparent)url.searchParams.set('transparent','1');if(typeof srcdoc==='string'){frame.sandbox='allow-scripts';frame.srcdoc=srcdoc;}else frame.src=url.href;
   const close=document.createElement('button');close.type='button';close.textContent='×';close.title='收起柚希';close.setAttribute('aria-label','收起柚希');close.style.cssText='position:absolute;right:6px;top:-16px;z-index:4;width:28px;height:28px;border:1px solid #b5c9e1;background:#eef3fa;color:#587399;border-radius:50%;cursor:pointer;font:22px/24px sans-serif;';
   const launcher=document.createElement('button');launcher.type='button';launcher.textContent='柚 ♡';launcher.title='唤出柚希';launcher.setAttribute('aria-label','重新打开柚希');
   launcher.style.cssText=`position:fixed;z-index:2147483001;right:${right}px;bottom:${bottom}px;width:66px;height:48px;border:1px solid #c4d6ed;border-radius:28px;background:#f7faff;color:#5a759d;box-shadow:0 7px 23px #3049634a;font:15px sans-serif;cursor:pointer;`;
   launcher.hidden=true;
   root.append(frame,close);target.append(root,launcher);
   const receiver=event=>{
     if(event.source!==frame.contentWindow||event.data?.type!=='yuzuki:event')return;
     try{onEvent(event.data);}catch(error){console.error('Yuzuki host event error',error);}
   };
   window.addEventListener('message',receiver);
   let removed=false;
   const api={
    mood(emotion){this.command({command:'emotion',emotion});},
    say(text,emotion='smile'){this.command({command:'say',text,emotion});},
    command(data){if(!removed&&frame.contentWindow)frame.contentWindow.postMessage({type:'yuzuki:command',...data},'*');},
    hide(){root.hidden=true;launcher.hidden=false;},show(){root.hidden=false;launcher.hidden=true;},
    destroy(){if(removed)return;removed=true;window.removeEventListener('message',receiver);root.remove();launcher.remove();},
    frame,root
   };
   close.addEventListener('click',()=>api.hide());launcher.addEventListener('click',()=>api.show());
   return api;
 }
 window.YuzukiEmbed={mount};
})(window,document);
