/*
 * This script must remain a plain parser-blocking <script> in the root head.
 * It establishes the cover state before the body can paint. The timer is an
 * emergency escape hatch only; the controller owns the normal exit.
 */
export const INTRO_BOOTSTRAP = String.raw`(function(){
  try {
    var w=window,d=document.documentElement,home=location.pathname==="/";
    var rootObserver;
    function root(){
      return document.getElementById("falcon-intro");
    }
    function hideRoot(){
      var el=root();
      if(!el)return false;
      el.style.setProperty("display","none","important");
      el.style.opacity="0";
      el.style.visibility="hidden";
      el.style.pointerEvents="none";
      if(rootObserver)rootObserver.disconnect();
      return true;
    }
    function restore(){
      d.style.overflow=w.__falconIntroHtmlOverflow||"";
      if(w.__falconIntroScrollRestoration)history.scrollRestoration=w.__falconIntroScrollRestoration;
    }
    function cleanup(){
      if(w.__falconIntroBootTimer)clearTimeout(w.__falconIntroBootTimer);
      if(w.__falconIntroBootEvents){
        for(var i=0;i<w.__falconIntroBootEvents.length;i++){
          removeEventListener(w.__falconIntroBootEvents[i],w.__falconIntroBootSkip,true);
        }
      }
    }
    function forceDone(){
      d.setAttribute("data-falcon-intro","done");
      hideRoot();
      restore();
      cleanup();
    }

    d.setAttribute("data-falcon-intro",home?"active":"off");
    w.__falconIntroStartedAt=performance.now();
    w.__falconIntroSkipRequested=false;

    rootObserver=new MutationObserver(function(){
      var state=d.getAttribute("data-falcon-intro");
      if(state!=="active")hideRoot();
      else if(root())rootObserver.disconnect();
    });
    rootObserver.observe(d,{childList:true,subtree:true});
    w.__falconIntroRootObserver=rootObserver;

    if(!home){
      hideRoot();
      return;
    }

    w.__falconIntroHtmlOverflow=d.style.overflow;
    w.__falconIntroScrollRestoration=history.scrollRestoration;
    history.scrollRestoration="manual";
    d.style.overflow="hidden";
    if(!location.hash)scrollTo(0,0);

    w.__falconIntroBootEvents=["pointerdown","keydown","wheel","touchmove"];
    w.__falconIntroBootSkip=function(){
      w.__falconIntroSkipRequested=true;
      dispatchEvent(new Event("falcon:intro:skip"));
    };
    for(var i=0;i<w.__falconIntroBootEvents.length;i++){
      addEventListener(w.__falconIntroBootEvents[i],w.__falconIntroBootSkip,{capture:true,passive:true});
    }
    w.__falconIntroBootCleanup=cleanup;
    w.__falconIntroBootTimer=setTimeout(forceDone,9000);
  } catch(e) {
    document.documentElement.setAttribute("data-falcon-intro","done");
  }
})();`;
