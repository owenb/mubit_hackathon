// Landing intro. OK is the user gesture that lets the video play with sound
// and the page go full screen; the map keeps loading underneath meanwhile.
const $=id=>document.getElementById(id);
const intro=$('intro');
if(intro){
  const gate=intro.querySelector('.intro-gate'),video=$('intro-video'),skip=$('intro-skip'),end=$('intro-end'),prank=$('intro-prank'),kidding=$('intro-kidding');
  const controls=$('intro-controls'),playButton=$('intro-play'),muteButton=$('intro-mute'),seek=$('intro-seek');
  // Download the whole video while the volume prompt is up, so OK plays it
  // instantly (iOS ignores preload). If OK comes first, stream it instead.
  const url=video.dataset.src,download=new AbortController();
  let streaming=false;
  const videoReady=fetch(url,{signal:download.signal,priority:'high'}).then(r=>{if(!r.ok)throw Error(String(r.status));return r.blob();})
    .then(blob=>{if(!streaming){video.src=URL.createObjectURL(blob);video.load();}}).catch(()=>{});
  // The London map loads itself behind the intro (loader.mjs). Once the video
  // is in, warm the business photos too, so Businesses mode shows them instantly.
  const warmed=[];
  videoReady.then(()=>{for(const name of ['morgan-stanley','barclays','hsbc','unilever','shell','google']){const img=new Image();img.fetchPriority='low';img.src=`/enterprise-images/${name}.jpg`;img.decode?.().catch(()=>{});warmed.push(img);}});
  const source=()=>{if(!video.getAttribute('src')){streaming=true;download.abort();video.src=url;}};
  // Decode the prank screen up front so Play again shows it instantly.
  $('intro-prank-image').decode?.().catch(()=>{});
  // Play again sound effect: fetched now, decoded once OK unlocks audio, then
  // started from memory the instant Play again is pressed.
  const sfxUrl=intro.dataset.sfx,sfxBytes=fetch(sfxUrl).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null);
  let sfxContext=null,sfxBuffer=null;
  const primeSfx=()=>{
    if(sfxContext)return;
    const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
    sfxContext=new Context();
    sfxBytes.then(bytes=>bytes&&sfxContext.decodeAudioData(bytes.slice(0))).then(buffer=>{if(buffer)sfxBuffer=buffer;}).catch(()=>{});
  };
  const playSfx=()=>{
    if(sfxContext&&sfxBuffer){sfxContext.resume();const node=sfxContext.createBufferSource();node.buffer=sfxBuffer;node.connect(sfxContext.destination);node.start();return;}
    new Audio(sfxUrl).play().catch(()=>{});
  };

  // Our own controls, so play/pause/stop/seek/mute behave the same in every
  // browser and in full screen. They fade while playing and return on movement.
  let idleTimer=0,seeking=false;
  const sync=()=>{
    const paused=video.paused;playButton.dataset.state=paused?'paused':'playing';playButton.setAttribute('aria-label',paused?'Play':'Pause');
    muteButton.dataset.state=video.muted?'muted':'on';muteButton.setAttribute('aria-label',video.muted?'Unmute':'Mute');
    if(paused)controls.classList.remove('idle');
  };
  const wake=()=>{controls.classList.remove('idle');clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(!video.paused)controls.classList.add('idle');},2500);};
  const toggle=()=>{if(video.paused)video.play().catch(sync);else video.pause();wake();};
  const progress=()=>{if(!seeking&&video.duration)seek.value=String(Math.round(video.currentTime/video.duration*1000));if(!video.paused)requestAnimationFrame(progress);};
  playButton.addEventListener('click',toggle);
  $('intro-stop').addEventListener('click',()=>{video.pause();video.currentTime=0;seek.value='0';wake();});
  muteButton.addEventListener('click',()=>{video.muted=!video.muted;if(!video.muted)video.volume=1;wake();});
  seek.addEventListener('pointerdown',()=>{seeking=true;});
  seek.addEventListener('input',()=>{if(video.duration)video.currentTime=Number(seek.value)/1000*video.duration;wake();});
  seek.addEventListener('change',()=>{seeking=false;});
  video.addEventListener('click',toggle);
  video.addEventListener('play',()=>{sync();requestAnimationFrame(progress);});
  video.addEventListener('pause',sync);
  video.addEventListener('volumechange',sync);
  intro.addEventListener('pointermove',()=>{if(!controls.hidden)wake();});
  document.addEventListener('keydown',e=>{if(e.key===' '&&intro.isConnected&&!controls.hidden&&e.target.tagName!=='BUTTON'&&e.target.tagName!=='INPUT'){e.preventDefault();toggle();}});

  let timers=[];
  const clearTimers=()=>{timers.forEach(clearTimeout);timers=[];};
  const fullscreen=()=>{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});};
  const play=()=>{
    clearTimers();gate.hidden=true;end.hidden=true;prank.hidden=true;video.hidden=false;skip.hidden=false;controls.hidden=false;
    fullscreen();source();video.currentTime=0;video.muted=false;video.volume=1;
    video.play().catch(sync);wake();
  };
  // Play again: a fake "session ended" screen, then JUST KIDDING, then the video.
  const playAgain=()=>{
    playSfx();clearTimers();fullscreen();video.pause();
    end.hidden=true;skip.hidden=true;controls.hidden=true;kidding.hidden=true;prank.hidden=false;
    timers.push(setTimeout(()=>{kidding.hidden=false;},2000));
    timers.push(setTimeout(play,3000));
  };
  // Leaving keeps the page full screen so the demo continues there.
  const close=()=>{
    clearTimers();clearTimeout(idleTimer);download.abort();video.pause();intro.classList.add('intro-leaving');
    setTimeout(()=>{intro.remove();document.getElementById('homeward')?.focus({preventScroll:true});},350);
  };
  $('intro-ok').addEventListener('click',()=>{primeSfx();play();});
  $('intro-again').addEventListener('click',playAgain);
  skip.addEventListener('click',close);
  $('intro-demo').addEventListener('click',close);
  video.addEventListener('ended',()=>{skip.hidden=true;controls.hidden=true;end.hidden=false;$('intro-demo').focus();});
  $('intro-ok').focus();
}
