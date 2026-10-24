// Landing intro. OK is the user gesture that lets the video play with sound
// and the page go full screen; the map keeps loading underneath meanwhile.
const $=id=>document.getElementById(id);
const intro=$('intro');
if(intro){
  const gate=intro.querySelector('.intro-gate'),video=$('intro-video'),skip=$('intro-skip'),end=$('intro-end'),prank=$('intro-prank'),kidding=$('intro-kidding');
  // Decode the prank screen up front so Play again shows it instantly.
  $('intro-prank-image').decode?.().catch(()=>{});
  let timers=[];
  const clearTimers=()=>{timers.forEach(clearTimeout);timers=[];};
  const fullscreen=()=>{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});};
  const play=()=>{
    clearTimers();gate.hidden=true;end.hidden=true;prank.hidden=true;video.hidden=false;skip.hidden=false;
    fullscreen();video.currentTime=0;video.muted=false;
    video.play().catch(()=>{video.controls=true;});
  };
  // Play again: a fake "session ended" screen, then JUST KIDDING, then the video.
  const playAgain=()=>{
    clearTimers();fullscreen();video.pause();
    end.hidden=true;skip.hidden=true;kidding.hidden=true;prank.hidden=false;
    timers.push(setTimeout(()=>{kidding.hidden=false;},2500));
    timers.push(setTimeout(play,3500));
  };
  // Leaving keeps the page full screen so the demo continues there.
  const close=()=>{
    clearTimers();video.pause();intro.classList.add('intro-leaving');
    setTimeout(()=>{intro.remove();document.getElementById('homeward')?.focus({preventScroll:true});},350);
  };
  $('intro-ok').addEventListener('click',play);
  $('intro-again').addEventListener('click',playAgain);
  skip.addEventListener('click',close);
  $('intro-demo').addEventListener('click',close);
  video.addEventListener('ended',()=>{skip.hidden=true;end.hidden=false;$('intro-demo').focus();});
  $('intro-ok').focus();
}
