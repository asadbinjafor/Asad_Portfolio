/**
 * Mobile navigation — loads synchronously right after header.
 */
(function () {
   'use strict'

   var menu = document.getElementById('nav-menu')
   var toggle = document.getElementById('nav-toggle')
   var closeBtn = document.getElementById('nav-close')

   if (!menu || !toggle) return

   function setNavOpen(isOpen) {
      menu.classList.toggle('show-menu', isOpen)
      document.body.classList.toggle('nav-open', isOpen)
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false')

      if (isOpen) {
         menu.removeAttribute('inert')
         menu.removeAttribute('aria-hidden')
      } else {
         menu.setAttribute('inert', '')
         menu.setAttribute('aria-hidden', 'true')
      }
   }

   window.portfolioCloseNavMenu = function () {
      setNavOpen(false)
   }

   if (!menu.classList.contains('show-menu')) {
      menu.setAttribute('inert', '')
      menu.setAttribute('aria-hidden', 'true')
   }

   toggle.addEventListener('click', function (event) {
      event.preventDefault()
      event.stopPropagation()
      setNavOpen(!menu.classList.contains('show-menu'))
   })

   if (closeBtn) {
      closeBtn.addEventListener('click', function (event) {
         event.preventDefault()
         setNavOpen(false)
      })
   }

   menu.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('click', function () {
         setNavOpen(false)
      })
   })

   document.addEventListener('click', function (event) {
      if (!menu.classList.contains('show-menu')) return
      if (menu.contains(event.target) || toggle.contains(event.target)) return
      setNavOpen(false)
   })

   document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('show-menu')) {
         setNavOpen(false)
      }
   })
})()
