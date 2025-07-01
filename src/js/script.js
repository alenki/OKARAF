// Loading screen / Экран загрузки
var loadingScreen = document.querySelector(".loadingScreen");
function loading() {
    console.log('wasup')
    loadingScreen.style.display = 'none';
}


// music
const music_button = document.querySelector('.music_button');
const music_on = document.querySelector('.music_on');
const music_off = document.querySelector('.music_off');
const music = document.getElementById("music")

// Music volume
music.volume = 0.1; 

// Music button
music_off.style.display = "none";
music_button.onclick = function() {
    if(music.muted==true) {
        music_on.style.display = "block";
        music_off.style.display = "none";
        music.muted = false;
    }
    else {
        music_on.style.display = "none";
        music_off.style.display = "block";
        music.muted = true;
    }
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