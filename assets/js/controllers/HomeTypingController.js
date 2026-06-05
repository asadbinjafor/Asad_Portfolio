/**
 * Hero typing effect — cycles through role words with type/delete animation
 */
(function () {
   'use strict'

   const typingEl = document.getElementById('home-typing')
   const cursorEl = document.getElementById('home-typing-cursor')

   if (!typingEl) return

   let words = []

   try {
      words = JSON.parse(typingEl.dataset.words || '[]')
   } catch {
      words = []
   }

   if (!words.length) return

   const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

   if (prefersReducedMotion) {
      typingEl.textContent = words[0]
      cursorEl?.classList.add('home__typing-cursor-static')
      return
   }

   let wordIndex = 0
   let charIndex = 0
   let isDeleting = false

   const TYPE_SPEED = 85
   const DELETE_SPEED = 45
   const PAUSE_AFTER_TYPE = 2000
   const PAUSE_AFTER_DELETE = 450

   function tick() {
      const currentWord = words[wordIndex]

      if (isDeleting) {
         typingEl.textContent = currentWord.substring(0, charIndex - 1)
         charIndex--
      } else {
         typingEl.textContent = currentWord.substring(0, charIndex + 1)
         charIndex++
      }

      let delay = isDeleting ? DELETE_SPEED : TYPE_SPEED

      if (!isDeleting && charIndex === currentWord.length) {
         delay = PAUSE_AFTER_TYPE
         isDeleting = true
      } else if (isDeleting && charIndex === 0) {
         isDeleting = false
         wordIndex = (wordIndex + 1) % words.length
         delay = PAUSE_AFTER_DELETE
      }

      setTimeout(tick, delay)
   }

   tick()
})()
