const notiMenu = document.querySelector('.noti-container');
const notiToggle = document.querySelector('.noti-toggle');

notiToggle.addEventListener('click', () => {
    const visibility = notiMenu.getAttribute('data-visible');
    if (document.getElementsByClassName('profile-menu')[0].style.display == 'block') document.getElementsByClassName('profile-menu')[0].style.display = 'none';
    if (visibility === 'false') {
        notiMenu.setAttribute('data-visible', true);
    } else if (visibility === 'true') {
        notiMenu.setAttribute('data-visible', false);
    }
});
