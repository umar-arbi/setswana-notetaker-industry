(function(){
  var root=document.documentElement;
  var calm=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $=function(s,el){return (el||document).querySelector(s)};
  var $$=function(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s))};

  /* in-page links scroll without changing the address */
  $$('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var t=document.getElementById(a.getAttribute('href').slice(1));
      if(!t)return; e.preventDefault();
      t.scrollIntoView({behavior:calm?'auto':'smooth',block:'start'});
    });
  });

  /* pick a print: the whole site changes cloth and the hero prints again */
  var stage=$('#stage');
  function reprint(){
    if(calm||!stage)return;
    $$('.ink,.head',stage).forEach(function(el){el.style.animation='none';void el.offsetWidth;el.style.animation='';});
  }
  function wear(name,save){
    if(name==='rings')root.removeAttribute('data-print'); else root.setAttribute('data-print',name);
    $$('.sw').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.print===name));});
    if(save){try{localStorage.setItem('kwala-print',name);}catch(e){}}
  }
  $$('.sw').forEach(function(b){b.addEventListener('click',function(){wear(b.dataset.print,true);reprint();});});
  try{var saved=localStorage.getItem('kwala-print');if(saved&&$('.sw[data-print="'+saved+'"]'))wear(saved,false);}catch(e){}

  /* light follows the pointer across the cloth */
  if(stage)stage.addEventListener('pointermove',function(e){
    if(calm)return;
    var r=stage.getBoundingClientRect();
    stage.style.setProperty('--mx',(e.clientX-r.left)+'px');
    stage.style.setProperty('--my',(e.clientY-r.top)+'px');
  });

  /* the demo is a player: the cloth bar is the timeline */
  (function(){
    var demo=$('#demo'),status=$('#demo-status');
    if(!demo||!status)return;
    var statusText=$('span',status);
    var lines=$$('.line',demo).map(function(l){return $('.tx',l);}).filter(Boolean);
    var notes=$$('.wrote .n',demo);
    var seek=$('#seek'),scrub=$('#scrub'),pp=$('#pp'),ppIcon=$('#pp-icon'),P=1,playing=false,last=0;
    if(!seek||!scrub||!pp||!ppIcon||!statusText)return;
    var total=0;lines.forEach(function(t){t.dataset.full=t.textContent;total+=t.textContent.length;});
    function setLine(t,n){
      var full=t.dataset.full;
      if(t.dataset.n===String(n))return; t.dataset.n=n; t.textContent='';
      var a=document.createElement('span');a.textContent=full.slice(0,n);
      var b=document.createElement('span');b.className='rest';b.textContent=full.slice(n);
      t.appendChild(a);t.appendChild(b);
    }
    function render(p){
      P=p; scrub.style.setProperty('--pp',p); seek.value=Math.round(p*1000);
      var chars=Math.round(Math.min(1,p/0.62)*total);
      lines.forEach(function(l){var len=l.dataset.full.length,n=Math.max(0,Math.min(len,chars));setLine(l,n);chars-=len;});
      status.classList.toggle('in',p>=0.62);
      var done=p>=0.74; status.classList.toggle('done',done); statusText.textContent=done?'Notes ready':'Writing your notes';
      notes.slice(0,3).forEach(function(note,k){note.classList.toggle('in',p>=[0.78,0.87,0.95][k]);});
    }
    function icon(){
      ppIcon.setAttribute('d',playing?'M6 4.5h4.5v15H6zM13.5 4.5H18v15h-4.5z':'M7 4.5v15l12-7.5z');
      pp.setAttribute('aria-label',playing?'Pause the example':(P>=1?'Play the example again':'Play the example'));
    }
    function tick(now){
      if(!playing)return;
      var dt=Math.min(80,now-last);last=now;
      render(Math.min(1,P+dt/7600));
      if(P>=1){playing=false;icon();return;}
      requestAnimationFrame(tick);
    }
    function play(){ if(calm){render(1);icon();return;} if(P>=1)render(0); playing=true;icon();last=performance.now();requestAnimationFrame(tick); }
    demo.classList.add('playing');
    pp.addEventListener('click',function(){ if(playing){playing=false;icon();} else play(); });
    seek.addEventListener('input',function(){ playing=false;icon();render(seek.value/1000); });
    function start(){ if(calm){render(1);icon();} else {reprint();render(0);setTimeout(play,500);} }

    /* the example starts when it scrolls into view */
    if(calm||!('IntersectionObserver' in window)){ start(); }
    else { var once=new IntersectionObserver(function(en){ if(en[0].isIntersecting){once.disconnect();start();} },{threshold:0.35}); once.observe(stage||demo); }

    /* point at a line to see where it went */
    function hot(k){
      $$('[data-k]',demo).forEach(function(el){el.classList.toggle('hot',k!==null&&el.dataset.k===k);});
      demo.classList.toggle('has-hot',k!==null);
    }
    $$('[data-k]',demo).forEach(function(el){
      el.addEventListener('pointerenter',function(){hot(el.dataset.k);});
      el.addEventListener('pointerleave',function(){hot(null);});
      el.addEventListener('focus',function(){hot(el.dataset.k);});
      el.addEventListener('blur',function(){hot(null);});
      el.addEventListener('click',function(){hot(el.dataset.k);});
    });
  })();

  /* how it works: the cloth prints as you scroll */
  (function(){
    var track=$('#track'),ticking=false;
    if(!track)return;
    function measure(){
      ticking=false;
      var r=track.getBoundingClientRect(),vh=window.innerHeight||800;
      var p=(vh*0.92-r.top)/(vh*0.55);
      track.style.setProperty('--p',calm?1:Math.max(0,Math.min(1,p)));
    }
    function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(measure);}}
    window.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('resize',onScroll);
    measure();
  })();

  /* pricing: the plan that fits */
  (function(){
    var hrs=$('#hrs'),out=$('#hrs-out'),verdict=$('#verdict'),ps=$('#plan-starter'),pd=$('#plan-standard');
    if(!hrs||!out||!verdict||!ps||!pd)return;
    function money(n){return 'US$'+n.toFixed(2);}
    function price(){
      var h=+hrs.value,html;
      out.textContent=h;
      hrs.style.setProperty('--fill',((h-1)/59*100)+'%');
      if(h<=8){ps.classList.add('pick');pd.classList.remove('pick');html='<b>Starter</b> covers it: <b>'+money(4.99)+'</b> a month.';}
      else if(h<=20){pd.classList.add('pick');ps.classList.remove('pick');html='<b>Standard</b> covers it: <b>'+money(9.99)+'</b> a month.';}
      else{var packs=Math.ceil((h-20)/8);pd.classList.add('pick');ps.classList.remove('pick');
        html='<b>Standard</b> plus '+packs+' extra pack'+(packs>1?'s':'')+' of 8 hours: <b>'+money(9.99+packs*4.99)+'</b> that month.';}
      verdict.innerHTML=html;
    }
    hrs.addEventListener('input',price);price();
  })();

  /* copy the trial code */
  $$('[data-copy]').forEach(function(b){
    b.addEventListener('click',function(){
      var done=function(ok){b.textContent=ok?'Copied':'Code: '+b.dataset.copy;setTimeout(function(){b.textContent='Copy';},2000);};
      try{navigator.clipboard.writeText(b.dataset.copy).then(function(){done(true);},function(){done(false);});}catch(e){done(false);}
    });
  });

  /* the headline switches language, the way a meeting does */
  var h1=$('#h1'),flip=$('#flip'),autoLang=!calm;
  if(h1)$$('.hl',h1).forEach(function(hl){
    var words=hl.textContent.trim().split(/\s+/);hl.textContent='';
    words.forEach(function(w,i){
      var o=document.createElement('span');o.className='w';
      var n=document.createElement('span');n.textContent=w;n.style.setProperty('--i',i);
      o.appendChild(n);hl.appendChild(o);
      if(i<words.length-1)hl.appendChild(document.createTextNode(' '));
    });
  });
  if(h1)h1.classList.add('ready');
  function setLang(tn){
    if(!h1)return;
    if(!calm&&h1.classList.contains('tn')!==tn){h1.classList.add('melting');clearTimeout(h1._m);h1._m=setTimeout(function(){h1.classList.remove('melting');},950);}
    h1.classList.toggle('tn',tn);
    if(!flip)return;
    flip.setAttribute('aria-pressed',String(tn));
    flip.setAttribute('aria-label',tn?'Show the headline in English':'Show the headline in Setswana');
  }
  if(h1&&flip)flip.addEventListener('click',function(){ autoLang=false; setLang(!h1.classList.contains('tn')); });

  /* the dock: a marker slides to the link you point at, and follows the page */
  (function(){
    var dock=$('#dock');
    if(!dock)return;
    var ind=$('.ind',dock),dlinks=$$('a[href]',dock),spy=dlinks.filter(function(a){return a.getAttribute('href').charAt(0)==='#';}),current=null;
    function slide(a){ if(!ind)return; if(!a){ind.style.opacity=0;return;} ind.style.opacity=1;ind.style.width=a.offsetWidth+'px';ind.style.transform='translateX('+a.offsetLeft+'px)'; }
    dlinks.forEach(function(a){a.addEventListener('pointerenter',function(){slide(a);});a.addEventListener('focus',function(){slide(a);});});
    dock.addEventListener('pointerleave',function(){slide(current);});
    dock.addEventListener('focusout',function(){slide(current);});
    function spyNow(){
      var y=(window.innerHeight||800)*0.38,found=null;
      spy.forEach(function(a){var t=document.getElementById(a.getAttribute('href').slice(1));if(t&&t.getBoundingClientRect().top<=y)found=a;});
      if(found!==current){ if(current)current.removeAttribute('aria-current'); current=found; if(current)current.setAttribute('aria-current','true'); if(!dock.matches(':hover'))slide(current); }
    }
    window.addEventListener('scroll',function(){requestAnimationFrame(spyNow);},{passive:true});
    spyNow();
  })();

  /* who it is for: a stack of cloth cards you can flick through */
  (function(){
    var deck=$('#deck'),button=$('#deal');
    if(!deck)return;
    var cards=$$('.dcard',deck),aud=$$('#aud li'),order=cards.map(function(_,i){return i;});
    if(!cards.length)return;
    function lay(){
      cards.forEach(function(c,i){
        var pos=order.indexOf(i);
        c.style.zIndex=10-pos;
        c.style.transform='translate('+(pos*18)+'px,'+(pos*18)+'px) rotate('+(pos*3.2-2)+'deg) scale('+(1-pos*0.035)+')';
      });
      aud.forEach(function(li,i){li.classList.toggle('on',i===order[0]);});
    }
    function deal(dir){
      if(calm){order.push(order.shift());lay();return;}
      var c=cards[order[0]];
      c.classList.remove('drag');
      c.style.transform='translate('+(dir*115)+'%,-8%) rotate('+(dir*16)+'deg)';
      setTimeout(function(){ order.push(order.shift()); lay(); },260);
    }
    if(button)button.addEventListener('click',function(){deal(1);});
    cards.forEach(function(c,i){
      var sx=0,dx=0,down=false;
      c.addEventListener('pointerdown',function(e){ if(order[0]!==i)return; down=true;sx=e.clientX;dx=0;c.classList.add('drag');try{c.setPointerCapture(e.pointerId);}catch(err){} });
      c.addEventListener('pointermove',function(e){ if(!down)return; dx=e.clientX-sx; if(calm)return; c.style.transform='translate('+dx+'px,'+(-Math.abs(dx)*0.05)+'px) rotate('+(dx*0.06-2)+'deg)'; });
      function up(){ if(!down)return; down=false; c.classList.remove('drag'); if(Math.abs(dx)>70||Math.abs(dx)<4)deal(dx<0?-1:1); else lay(); }
      c.addEventListener('pointerup',up); c.addEventListener('pointercancel',up);
    });
    lay();
  })();

  /* closing band: the pointer leaves a trail of printed cloth */
  (function(){
    var band=$('#get'),trail=$('#trail'),pts=[],seen=false,inside=false;
    if(calm||!band||!trail)return;
    band.addEventListener('pointermove',function(e){var r=band.getBoundingClientRect();inside=true;pts.push({x:e.clientX-r.left,y:e.clientY-r.top,t:performance.now()});if(pts.length>26)pts.shift();});
    band.addEventListener('pointerleave',function(){inside=false;});
    if('IntersectionObserver' in window){new IntersectionObserver(function(en){seen=en[0].isIntersecting;if(seen)requestAnimationFrame(ink);}).observe(band);}
    else {seen=true;requestAnimationFrame(ink);}
    function ink(now){
      if(!seen)return;
      var w=band.offsetWidth,h=band.offsetHeight,g=[];
      pts=pts.filter(function(p){return now-p.t<1700;});
      pts.forEach(function(p){var a=1-(now-p.t)/1700;g.push('radial-gradient(circle '+Math.round(120+220*a)+'px at '+Math.round(p.x)+'px '+Math.round(p.y)+'px,#000 55%,transparent 100%)');});
      {
        var t=now/1000;
        [[0.5+0.42*Math.sin(t*0.5),0.5+0.36*Math.cos(t*0.37)],[0.5+0.44*Math.cos(t*0.31+2),0.5+0.38*Math.sin(t*0.43+1)]].forEach(function(q){
          g.push('radial-gradient(circle 260px at '+Math.round(q[0]*w)+'px '+Math.round(q[1]*h)+'px,#000 50%,transparent 100%)');
        });
      }
      var m=g.join(',');
      trail.style.webkitMaskImage=m; trail.style.maskImage=m;
      requestAnimationFrame(ink);
    }
  })();

  /* giant wordmark: leteisi shows inside the letters around the pointer */
  (function(){
    var mega=$('#mega');
    if(!mega)return;
    var over=$('.over',mega),word=$('.word',mega),live=false,on=false;
    if(!over||!word)return;
    function put(x,y){over.style.setProperty('--wx',x+'px');over.style.setProperty('--wy',y+'px');}
    mega.addEventListener('pointermove',function(e){var r=word.getBoundingClientRect();live=true;put(e.clientX-r.left,e.clientY-r.top);});
    mega.addEventListener('pointerleave',function(){live=false;});
    if(calm){over.style.setProperty('--wr','4000px');return;}
    function drift(now){ if(!on)return; if(!live){var r=word.getBoundingClientRect(),t=now/1000;put(r.width*(0.5+0.42*Math.sin(t*0.6)),r.height*(0.5+0.25*Math.cos(t*0.9)));} requestAnimationFrame(drift); }
    if('IntersectionObserver' in window){new IntersectionObserver(function(en){on=en[0].isIntersecting;if(on)requestAnimationFrame(drift);}).observe(mega);} else {on=true;requestAnimationFrame(drift);}
  })();

  /* how it works: Setswana and English words swirl into the funnel, notes come out */
  (function(){
    var cv=$('#funnel'); if(!cv||!cv.getContext)return;
    var g=cv.getContext('2d'),W=0,H=0,on=false,Q=[],n=0,outs=$$('#out p'),lit=-1,lastLit=0;
    if(!g)return;
    var TN=['Dumelang','a re simolole','Re tshwanetse','go fetsa','ka Labobedi','Ee, mme','ke batla','a romele','pele','Go siame','ka Labone','Kagiso'],EN=['budget','invoice','meeting','Tuesday','Thursday','budget','invoice'];
    var words=TN.map(function(w){return {w:w,en:false};}).concat(EN.map(function(w){return {w:w,en:true};}));
    words.forEach(function(o,i){o.t=i/words.length;o.a=Math.random()*6.2832;o.s=0.0011+Math.random()*0.0007;o.r=0.45+Math.random()*0.55;});
    function size(){var d=Math.min(window.devicePixelRatio||1,2);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*d;cv.height=H*d;g.setTransform(d,0,0,d,0,0);n=W<500?320:760;
      while(Q.length<n)Q.push({t:Math.random(),a:Math.random()*6.2832,s:0.0012+Math.random()*0.0018,r:0.2+Math.random()*0.8,c:Q.length%4===0});Q.length=n;}
    function pos(t,a,r,tw){var rad=H*0.47*r*Math.pow(1-t,1.6),ang=a+t*8+tw;return [t*W,H/2+Math.sin(ang)*rad,Math.cos(ang)];}
    function draw(now){
      if(!on)return; g.clearRect(0,0,W,H);
      var tw=now/1500,i,q,p,sz;
      for(var k=0;k<2;k++){ g.beginPath();
        for(i=0;i<n;i++){q=Q[i]; if(q.c!==(k===1))continue; p=pos(q.t,q.a,q.r,tw); sz=(1.4-q.t*0.5)*(0.8+0.3*p[2]); g.moveTo(p[0]+sz,p[1]);g.arc(p[0],p[1],sz,0,6.2832);}
        g.fillStyle=k?'#5FA8E2':'#F3F6FA';g.globalAlpha=k?0.9:0.6;g.fill(); }
      g.textBaseline='middle';
      for(i=0;i<words.length;i++){q=words[i]; p=pos(q.t,q.a,q.r,tw*0.6);
        var fs=Math.max(7,(W<500?19:32)*(1-q.t*0.8)*(0.85+0.15*p[2]));
        g.globalAlpha=Math.max(0,Math.min(1,q.t*8))*Math.max(0,Math.min(1,(0.93-q.t)*7))*(0.75+0.25*p[2]);
        g.font=(q.en?'600 ':'500 ')+fs.toFixed(1)+'px Outfit, system-ui, sans-serif';
        g.fillStyle=q.en?'#7DBBEF':'#F3F6FA'; g.fillText(q.w,p[0],p[1]);}
      g.globalAlpha=1;
      g.strokeStyle='#4A90C8';g.lineWidth=3;g.lineCap='round';g.beginPath();g.moveTo(W*0.9,H/2);g.lineTo(W-2,H/2);g.stroke();
      if(calm)return;
      for(i=0;i<n;i++){q=Q[i];q.t+=q.s;if(q.t>1){q.t=0;q.a=Math.random()*6.2832;}}
      for(i=0;i<words.length;i++){q=words[i];q.t+=q.s;if(q.t>1){q.t=0;q.a=Math.random()*6.2832;}}
      if(outs.length&&now-lastLit>1700){lastLit=now;lit=(lit+1)%outs.length;outs.forEach(function(o,j){o.classList.toggle('lit',j===lit);});}
      requestAnimationFrame(draw);
    }
    size();window.addEventListener('resize',function(){size();});
    if(calm){on=true;draw(0);return;}
    if('IntersectionObserver' in window){new IntersectionObserver(function(en){on=en[0].isIntersecting;if(on)requestAnimationFrame(draw);}).observe(cv);} else {on=true;requestAnimationFrame(draw);}
  })();

  /* big buttons lean toward the pointer */
  if(!calm){
    $$('.btn.big').forEach(function(btn){
      var zone=btn.parentNode;
      zone.addEventListener('pointermove',function(e){
        var r=btn.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
        if(Math.abs(dx)<r.width*0.9&&Math.abs(dy)<90)btn.style.transform='translate('+(dx*0.16).toFixed(1)+'px,'+(dy*0.3).toFixed(1)+'px)';
        else btn.style.transform='';
      });
      zone.addEventListener('pointerleave',function(){btn.style.transform='';});
    });
  }

  /* the swarm: leteisi dots that spell, scatter and settle */
  (function(){
    var hero=$('#hero'),cv=$('#swarm'),boxEl=$('#swarm-box'),seg=$('#seg');
    if(!hero||!boxEl||!cv||!cv.getContext)return;
    var ctx=cv.getContext('2d'),W=0,H=0,B={x:0,y:0,w:0,h:0},N=0,P=[],shapes=[],si=0,mx=-9999,my=-9999,mode='push',seen=true,raf=0,lastSwitch=0,lastT=0;
    if(!ctx)return;
    function scan(c,g,step){
      var d=g.getImageData(0,0,c.width,c.height).data,pts=[],x,y;
      for(y=0;y<c.height;y+=step)for(x=0;x<c.width;x+=step){ if(d[(y*c.width+x)*4+3]>120)pts.push([B.x+x,B.y+y]); }
      return pts;
    }
    function off(){var c=document.createElement('canvas');c.width=Math.max(2,Math.round(B.w));c.height=Math.max(2,Math.round(B.h));return c;}
    function textPts(txt){
      var c=off(),g=c.getContext('2d'),fs=Math.min(B.h*0.6,200);
      g.font='700 '+fs+'px Outfit, system-ui, sans-serif';
      var tw=g.measureText(txt).width;
      if(tw>B.w*0.97){fs*=B.w*0.97/tw;g.font='700 '+fs+'px Outfit, system-ui, sans-serif';}
      g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText(txt,c.width/2,c.height/2);
      return scan(c,g,3);
    }
    function markPts(){
      var c=off(),g=c.getContext('2d'),k=Math.min(B.w/36,B.h/28)*0.86,ox=(c.width-32*k)/2,oy=(c.height-24*k)/2;
      g.fillStyle='#fff';
      [[0,7,3,10],[5,1,3,22],[10,4,3,16],[15,7,3,10],[20,9.5,3,5],[25,10.5,7,3]].forEach(function(r){g.fillRect(ox+r[0]*k,oy+r[1]*k,r[2]*k,r[3]*k);});
      return scan(c,g,4);
    }
    function clothPts(){
      var t=28,cols=Math.max(4,Math.floor(Math.min(B.w*0.96,480)/t)),rows=Math.max(3,Math.floor(Math.min(B.h*0.82,300)/t));
      var ox=B.x+(B.w-cols*t)/2,oy=B.y+(B.h-rows*t)/2,pts=[],r,c,i,a;
      for(r=0;r<rows;r++)for(c=0;c<cols;c++){
        for(i=0;i<12;i++){a=i/12*6.2832;pts.push([ox+c*t+14+9*Math.cos(a),oy+r*t+14+9*Math.sin(a)]);}
        pts.push([ox+c*t+14,oy+r*t+14,1]);pts.push([ox+c*t,oy+r*t,1]);pts.push([ox+c*t+14,oy+r*t,1]);pts.push([ox+c*t,oy+r*t+14,1]);
      }
      return pts;
    }
    function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
    function assign(pts,kick){
      pts=shuffle(pts.slice());
      var keep=Math.min(pts.length,Math.round(N*0.9));
      for(var i=0;i<N;i++){
        var p=P[i];
        if(i<keep){p.tx=pts[i][0];p.ty=pts[i][1];p.dust=false;p.a=1;}
        else{var an=Math.random()*6.2832,rr=Math.sqrt(Math.random());p.tx=B.x+B.w/2+Math.cos(an)*rr*B.w*0.78;p.ty=B.y+B.h/2+Math.sin(an)*rr*B.h*0.8;p.dust=true;p.a=0.32;}
        if(kick){p.vx+=(Math.random()-0.5)*9;p.vy+=(Math.random()-0.5)*9;}
      }
    }
    function build(){
      var hr=hero.getBoundingClientRect(),br=boxEl.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);
      W=hr.width;H=hr.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
      B={x:br.left-hr.left,y:br.top-hr.top,w:br.width,h:br.height};
      N=W<700?1300:2700;
      while(P.length<N)P.push({x:Math.random()*W,y:Math.random()*H,vx:0,vy:0,tx:0,ty:0,dust:false,a:1,ph:Math.random()*6.2832,c:P.length%10<7?0:1,r:P.length%5===0?1.5:1.15});
      P.length=N;
      shapes=[textPts('Hello'),textPts('Dumela'),markPts(),clothPts()];
      assign(shapes[si],false);
      if(calm){P.forEach(function(p){p.x=p.tx;p.y=p.ty;});draw();}
    }
    function draw(){
      ctx.clearRect(0,0,W,H);
      for(var c=0;c<2;c++){
        for(var pass=0;pass<2;pass++){
          ctx.beginPath();
          for(var i=0;i<N;i++){var p=P[i];if(p.c!==c||(p.dust?1:0)!==pass)continue;ctx.moveTo(p.x+p.r,p.y);ctx.arc(p.x,p.y,p.r,0,6.2832);}
          ctx.globalAlpha=pass?0.34:1;ctx.fillStyle=c?'#5FA8E2':'#F3F6FA';ctx.fill();
        }
      }
      ctx.globalAlpha=1;
    }
    function frame(now){
      raf=0; if(!seen||document.hidden)return;
      var dt=Math.min(2.2,(now-(lastT||now))/16.7)||1; lastT=now;
      if(!lastSwitch)lastSwitch=now;
      if(now-lastSwitch>4300){lastSwitch=now;si=(si+1)%shapes.length;assign(shapes[si],true);if(autoLang)setLang(si===1);}
      var R=125,R2=R*R,t=now/1000;
      for(var i=0;i<N;i++){
        var p=P[i],k=p.dust?0.006:0.021,dm=p.dust?0.95:0.86;
        var tx=p.tx,ty=p.ty;
        if(p.dust){tx+=Math.sin(t*0.5+p.ph)*10;ty+=Math.cos(t*0.4+p.ph)*10;}
        p.vx+=(tx-p.x)*k*dt;p.vy+=(ty-p.y)*k*dt;
        var dx=p.x-mx,dy=p.y-my,d2=dx*dx+dy*dy;
        if(d2<R2&&d2>0.01){
          var d=Math.sqrt(d2),f=(1-d/R)*2.4*dt,ux=dx/d,uy=dy/d;
          if(mode==='push'){p.vx+=ux*f;p.vy+=uy*f;}
          else if(mode==='pull'){p.vx-=ux*f*0.8;p.vy-=uy*f*0.8;}
          else{p.vx+=-uy*f*1.5-ux*f*0.25;p.vy+=ux*f*1.5-uy*f*0.25;}
        }
        p.vx*=Math.pow(dm,dt);p.vy*=Math.pow(dm,dt);
        p.x+=p.vx*dt;p.y+=p.vy*dt;
      }
      draw();
      raf=requestAnimationFrame(frame);
    }
    function go(){ if(!raf&&!calm){lastT=0;raf=requestAnimationFrame(frame);} }
    hero.addEventListener('pointermove',function(e){var r=hero.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;});
    hero.addEventListener('pointerleave',function(){mx=my=-9999;});
    hero.addEventListener('click',function(e){
      if(calm||e.target.closest('a,button,input,label'))return;
      var r=hero.getBoundingClientRect(),cx=e.clientX-r.left,cy=e.clientY-r.top;
      P.forEach(function(p){var dx=p.x-cx,dy=p.y-cy,d=Math.sqrt(dx*dx+dy*dy)||1,f=Math.max(0,1-d/520)*26;p.vx+=dx/d*f;p.vy+=dy/d*f;});
    });
    if(seg)$$('button',seg).forEach(function(b){b.addEventListener('click',function(){
      mode=b.dataset.mode;seg.dataset.mode=mode;
      $$('button',seg).forEach(function(o){o.setAttribute('aria-pressed',String(o===b));});
    });});
    var rs=0;window.addEventListener('resize',function(){clearTimeout(rs);rs=setTimeout(function(){build();go();},180);});
    if('IntersectionObserver' in window){new IntersectionObserver(function(en){seen=en[0].isIntersecting;if(seen)go();}).observe(hero);}
    document.addEventListener('visibilitychange',function(){if(!document.hidden)go();});
    build();go();
    if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){build();go();});}
  })();
})();
