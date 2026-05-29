/*=============== SCROLL TO TOP ON LOAD ===============*/
if ('scrollRestoration' in history) {
   history.scrollRestoration = 'manual'
}

function scrollPageToTop() {
   if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
   }
}

scrollPageToTop()

window.addEventListener('load', () => {
   document.body.style.height = 'auto'
   document.documentElement.style.height = 'auto'
   scrollPageToTop()
})

/*=============== HOME SPLIT TEXT ===============*/
const homeSplit = document.getElementById('home-split')
if (homeSplit && typeof anime !== 'undefined') {
   const text = homeSplit.textContent
   homeSplit.innerHTML = text.split('').map((char) =>
      `<span class="home__split-char">${char === ' ' ? '&nbsp;' : char}</span>`
   ).join('')

   anime({
      targets: '.home__split-char',
      translateY: [40, 0],
      opacity: [0, 1],
      easing: 'easeOutExpo',
      duration: 1200,
      delay: anime.stagger(60)
   })
}

/*=============== COPY EMAIL IN CONTACT ===============*/
const copyEmailBtn = document.getElementById('copy-email')

if (copyEmailBtn) {
   copyEmailBtn.addEventListener('click', async () => {
      const email = copyEmailBtn.dataset.email

      try {
         await navigator.clipboard.writeText(email)
         copyEmailBtn.textContent = 'Email copied!'
         setTimeout(() => {
            copyEmailBtn.textContent = 'Copy email'
         }, 2000)
      } catch {
         window.location.href = `mailto:${email}`
      }
   })
}

/*=============== CURRENT YEAR OF THE FOOTER ===============*/
const footerYear = document.getElementById('footer-year')
if (footerYear) {
   footerYear.innerHTML = `&#169; ${new Date().getFullYear()}`
}

/*=============== MOBILE NAV ===============*/
const navMenu = document.getElementById('nav-menu')
const navToggle = document.getElementById('nav-toggle')
const navClose = document.getElementById('nav-close')

if (navToggle && navMenu) {
   navToggle.addEventListener('click', () => navMenu.classList.add('show-menu'))
}

if (navClose && navMenu) {
   navClose.addEventListener('click', () => navMenu.classList.remove('show-menu'))
}

document.querySelectorAll('.nav__link').forEach((link) => {
   link.addEventListener('click', () => navMenu?.classList.remove('show-menu'))
})

/*=============== SCROLL SECTIONS ACTIVE LINK ===============*/
const sections = document.querySelectorAll('section[id]')

function scrollActive() {
   const scrollY = window.pageYOffset

   sections.forEach((section) => {
      const sectionHeight = section.offsetHeight
      const sectionTop = section.offsetTop - 100
      const sectionId = section.getAttribute('id')
      const link = document.querySelector(`.nav__link[href*="${sectionId}"]`)

      if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
         link?.classList.add('active-link')
      } else {
         link?.classList.remove('active-link')
      }
   })
}

window.addEventListener('scroll', scrollActive)

/*=============== HEADER SCROLL ===============*/
function scrollHeader() {
   const header = document.getElementById('header')
   if (window.scrollY >= 50) {
      header?.classList.add('scroll-header')
   } else {
      header?.classList.remove('scroll-header')
   }
}

window.addEventListener('scroll', scrollHeader)

/*=============== CUSTOM CURSOR ===============*/
const cursor = document.getElementById('cursor')
const cursorFollower = document.getElementById('cursor-follower')

if (cursor && cursorFollower && window.matchMedia('(pointer:fine)').matches) {
   document.addEventListener('mousemove', (e) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
      cursorFollower.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
   })

   document.querySelectorAll('a, button:not(#projects-prev-btn):not(#projects-next-btn)').forEach((el) => {
      el.addEventListener('mouseenter', () => {
         cursor.classList.add('cursor-large')
         cursorFollower.classList.add('cursor-large')
      })
      el.addEventListener('mouseleave', () => {
         cursor.classList.remove('cursor-large')
         cursorFollower.classList.remove('cursor-large')
      })
   })
}

/*=============== SCROLL REVEAL ANIMATION ===============*/
if (typeof ScrollReveal !== 'undefined') {
   const sr = ScrollReveal({
      origin: 'bottom',
      distance: '48px',
      duration: 2000,
      delay: 200
   })

   sr.reveal('.home__data, .home__image', { origin: 'left', interval: 200 })
   sr.reveal('.section__title', { delay: 100 })
   sr.reveal('.about__content, .about__skill', { interval: 150 })
   sr.reveal('#projects .section__title', { delay: 100, distance: '30px' })
   sr.reveal('.work__card', { interval: 150 })
   sr.reveal('.contact__intro, .contact__group', { interval: 150 })
   sr.reveal('.footer__container')

   document.body.style.height = 'auto'
   document.documentElement.style.height = 'auto'
   scrollPageToTop()
   requestAnimationFrame(scrollPageToTop)
}
