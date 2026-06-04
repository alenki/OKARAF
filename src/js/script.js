// --------------- Music ----------------
const music = document.getElementById("music");
const music_button = document.querySelector('.music_button');
const music_on = document.querySelector('.music_on');
const music_off = document.querySelector('.music_off');

// The music controls only exist on the main page, so guard against null
// (this script is also loaded on the certificates page, which has no player).
if (music && music_button && music_on && music_off) {
  music.volume = 0.1;

  const setMusicState = (on) => {
    music.muted = !on;
    music_on.style.display = on ? "block" : "none";
    music_off.style.display = on ? "none" : "block";
    music_button.setAttribute("aria-pressed", String(on));
  };

  // Reflect the initial state (unmuted by default) and try to start playback.
  setMusicState(!music.muted);
  music.play().catch(() => {});

  music_button.addEventListener("click", () => {
    const turnOn = music.muted; // currently muted -> turn it on
    if (turnOn) music.play().catch(() => {});
    setMusicState(turnOn);
  });

  // Browsers block autoplay until a user gesture — start music on first interaction.
  const unlock = () => {
    if (!music.muted) music.play().catch(() => {});
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

// --------------- Navbar hide-on-scroll ----------------
const header = document.querySelector('.navbar');

if (header) {
  let lastScroll = 0;
  const defaultOffset = 100;
  const scrollPosition = () => window.scrollY || document.documentElement.scrollTop;
  const containHide = () => header.classList.contains('hide');

  window.addEventListener('scroll', () => {
    const current = scrollPosition();
    if (current > lastScroll && !containHide() && current > defaultOffset) {
      // scrolling down
      header.classList.add('hide');
    } else if (current < lastScroll && containHide()) {
      // scrolling up
      header.classList.remove('hide');
    }
    lastScroll = current;
  });
}
