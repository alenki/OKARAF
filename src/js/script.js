
// music
const sound_button = document.querySelector('.sound_button');
const music = document.getElementById("music")
sound_button.onclick = function() {
    if(music.muted==true) music.muted = false;
    else music.muted = true;
}
    

// Navbar animation
let lastScroll = 0;
const defaultOffset = 100;
const header = document.querySelector('.navbar');

const scrollPosition = () => window.pageYOffset || document.documentElement.scrollTop;
const containHide = () => header.classList.contains('hide');

window.addEventListener('scroll', () => {
    if(scrollPosition() > lastScroll && !containHide() && scrollPosition() > defaultOffset) {
        //scroll down
        header.classList.add('hide');
    }
    else if(scrollPosition() < lastScroll && containHide()){
        //scroll up
        header.classList.remove('hide');
    }

    lastScroll = scrollPosition();
})