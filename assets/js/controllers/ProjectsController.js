/**
 * Projects carousel — 2 slides per page (desktop), 1 on mobile
 */
(function () {
   'use strict'

   const DESKTOP_BREAKPOINT = 768
   const GAP = 16

   let carousel, track, viewport, slides, dotsContainer, counterEl
   let currentPage = 0
   let touchStartX = 0

   function getPerView() {
      return window.innerWidth >= DESKTOP_BREAKPOINT ? 2 : 1
   }

   function getTotalPages() {
      return Math.ceil(slides.length / getPerView())
   }

   function getViewportWidth() {
      return viewport.clientWidth
   }

   function getSlideWidth() {
      const perView = getPerView()
      const vw = getViewportWidth()
      return Math.floor((vw - GAP * (perView - 1)) / perView)
   }

   function getPageWidth() {
      const perView = getPerView()
      return perView * (getSlideWidth() + GAP)
   }

   function setSlideSizes() {
      const slideWidth = getSlideWidth()
      slides.forEach((slide) => {
         slide.style.flex = `0 0 ${slideWidth}px`
         slide.style.width = `${slideWidth}px`
      })
      track.style.gap = `${GAP}px`
   }

   function buildDots() {
      dotsContainer.innerHTML = ''
      const pages = getTotalPages()
      for (let i = 0; i < pages; i++) {
         const dot = document.createElement('button')
         dot.type = 'button'
         dot.className = 'projects__dot' + (i === currentPage ? ' projects__dot-active' : '')
         dot.setAttribute('aria-label', `Projects page ${i + 1}`)
         dot.addEventListener('click', () => goToPage(i))
         dotsContainer.appendChild(dot)
      }
   }

   function updateCounter() {
      if (!counterEl) return
      const perView = getPerView()
      const start = currentPage * perView + 1
      const end = Math.min(start + perView - 1, slides.length)
      const startStr = String(start).padStart(2, '0')
      const endStr = String(end).padStart(2, '0')
      const totalStr = String(slides.length).padStart(2, '0')
      counterEl.textContent =
         start === end ? `${startStr} / ${totalStr}` : `${startStr}-${endStr} / ${totalStr}`
   }

   function updateUI() {
      const maxPage = getTotalPages() - 1
      if (currentPage > maxPage) currentPage = maxPage
      if (currentPage < 0) currentPage = 0

      setSlideSizes()
      track.style.transform = `translate3d(-${Math.round(currentPage * getPageWidth())}px, 0, 0)`

      const dots = dotsContainer.querySelectorAll('.projects__dot')
      dots.forEach((dot, i) => {
         dot.classList.toggle('projects__dot-active', i === currentPage)
      })

      updateCounter()
   }

   function goToPage(page) {
      const maxPage = getTotalPages() - 1
      currentPage = Math.max(0, Math.min(page, maxPage))
      updateUI()
   }

   let isNavigating = false

   function nextPage() {
      if (isNavigating) return
      isNavigating = true
      goToPage(currentPage + 1)
      setTimeout(() => { isNavigating = false }, 400)
   }

   function prevPage() {
      if (isNavigating) return
      isNavigating = true
      goToPage(currentPage - 1)
      setTimeout(() => { isNavigating = false }, 400)
   }

   function init() {
      carousel = document.getElementById('projects-carousel')
      track = document.getElementById('projects-track')
      viewport = document.getElementById('projects-viewport')
      slides = document.querySelectorAll('#projects-track .projects__slide')
      dotsContainer = document.getElementById('projects-dots')
      counterEl = document.getElementById('projects-counter')

      if (!carousel || !track || !viewport || !slides.length || !dotsContainer) {
         return
      }

      buildDots()
      updateUI()

      document.getElementById('projects-prev-btn')?.addEventListener('click', (e) => {
         e.preventDefault()
         e.stopPropagation()
         prevPage()
      })

      document.getElementById('projects-next-btn')?.addEventListener('click', (e) => {
         e.preventDefault()
         e.stopPropagation()
         nextPage()
      })

      carousel.addEventListener('touchstart', (e) => {
         touchStartX = e.changedTouches[0].screenX
      }, { passive: true })

      carousel.addEventListener('touchend', (e) => {
         const diff = touchStartX - e.changedTouches[0].screenX
         if (Math.abs(diff) > 50) {
            diff > 0 ? nextPage() : prevPage()
         }
      }, { passive: true })

      window.addEventListener('resize', () => {
         buildDots()
         updateUI()
      })

      window.ProjectsCarousel = { next: nextPage, prev: prevPage, goToPage }
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init)
   } else {
      init()
   }
})()
