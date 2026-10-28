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

function getScrollOffset() {
   const header = document.getElementById('header')
   const buffer = 12
   return header ? header.offsetHeight + buffer : 72
}

function updateScrollOffsetVar() {
   document.documentElement.style.setProperty('--scroll-offset', `${getScrollOffset()}px`)
}

window.getScrollOffset = getScrollOffset
updateScrollOffsetVar()
window.addEventListener('resize', updateScrollOffsetVar, { passive: true })

window.addEventListener('load', () => {
   document.body.style.height = 'auto'
   document.documentElement.style.height = 'auto'
   scrollPageToTop()
})

/*=============== MOBILE NAV (see MobileNavController.js) ===============*/

document.querySelectorAll('a[href^="#"]').forEach((link) => {
   link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href')
      if (!hash || hash === '#') return

      const target = document.querySelector(hash)
      if (!target) return

      event.preventDefault()
      window.portfolioCloseNavMenu?.()

      const top = target.getBoundingClientRect().top + window.scrollY - getScrollOffset()
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      window.scrollTo({
         top: Math.max(0, top),
         behavior: prefersReducedMotion ? 'auto' : 'smooth',
      })

      if (hash !== window.location.hash) {
         history.pushState(null, '', hash)
      }

      window.setTimeout(scrollActive, prefersReducedMotion ? 0 : 350)
   })
})

/*=============== SCROLL SECTIONS ACTIVE LINK ===============*/
const sections = document.querySelectorAll('section[id]')


function scrollActive() {
   const scrollY = window.pageYOffset
   const offset = getScrollOffset()

   sections.forEach((section) => {
      const sectionHeight = section.offsetHeight
      const sectionTop = section.offsetTop - offset
      const sectionId = section.getAttribute('id')
      const link = document.querySelector(`.nav__link[href*="${sectionId}"]`)

      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
         link?.classList.add('active-link')
      } else {
         link?.classList.remove('active-link')
      }
   })
}

/*=============== HEADER SCROLL ===============*/
function scrollHeader() {
   const header = document.getElementById('header')
   if (window.scrollY >= 50) {
      header?.classList.add('scroll-header')
   } else {
      header?.classList.remove('scroll-header')
   }
}

/*=============== SCROLL PERFORMANCE (RAF) ===============*/
let scrollFramePending = false

function runScrollTasks() {
   scrollActive()
   scrollHeader()


   scrollFramePending = false
}

function queueScrollTasks() {
   if (scrollFramePending) return
   scrollFramePending = true
   requestAnimationFrame(runScrollTasks)
}

window.addEventListener('scroll', queueScrollTasks, { passive: true })
window.addEventListener('resize', queueScrollTasks, { passive: true })
window.addEventListener('load', queueScrollTasks)
queueScrollTasks()
