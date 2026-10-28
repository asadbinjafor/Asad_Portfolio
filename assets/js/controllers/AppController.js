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
const sections = Array.from(document.querySelectorAll('main > section[id]')).map((section) => ({
   section,
   link: document.querySelector(`.nav__link[href="#${section.id}"]`),
   top: 0,
   bottom: 0,
}))
let sectionMetricsDirty = true
let scrollOffset = getScrollOffset()

function measureSections() {
   scrollOffset = getScrollOffset()
   const y = window.pageYOffset
   sections.forEach((entry) => {
      const rect = entry.section.getBoundingClientRect()
      entry.top = rect.top + y - scrollOffset
      entry.bottom = entry.top + rect.height
   })
   sectionMetricsDirty = false
}


function scrollActive() {
   const scrollY = window.pageYOffset
   if (sectionMetricsDirty) measureSections()

   sections.forEach((entry) => {
      entry.link?.classList.toggle('active-link', scrollY >= entry.top && scrollY < entry.bottom)
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
function invalidateSectionMetrics() {
   sectionMetricsDirty = true
   queueScrollTasks()
}
window.addEventListener('resize', invalidateSectionMetrics, { passive: true })
window.addEventListener('load', invalidateSectionMetrics)
const sectionSizeObserver = new ResizeObserver(invalidateSectionMetrics)
sections.forEach(({ section }) => sectionSizeObserver.observe(section))
sectionSizeObserver.observe(document.body)
document.fonts?.ready.then(invalidateSectionMetrics)
queueScrollTasks()
