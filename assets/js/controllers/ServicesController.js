/**
 * Services accordion — open/close on header click (+ / × icon)
 */
(function () {
   'use strict'

   function init() {
      const accordion = document.getElementById('services-accordion')
      if (!accordion) return

      const items = accordion.querySelectorAll('.services__item')

      function setIcon(item, isOpen) {
         const icon = item.querySelector('.services__icon')
         if (!icon) return
         icon.className = isOpen
            ? 'ri-subtract-line services__icon'
            : 'ri-add-line services__icon'
      }

      function openItem(target) {
         items.forEach((item) => {
            const isTarget = item === target
            item.classList.toggle('services__item-active', isTarget)
            setIcon(item, isTarget)
         })
      }

      function toggleItem(target) {
         const isActive = target.classList.contains('services__item-active')
         if (isActive) {
            target.classList.remove('services__item-active')
            setIcon(target, false)
         } else {
            openItem(target)
         }
      }

      items.forEach((item, index) => {
         setIcon(item, item.classList.contains('services__item-active'))

         const header = item.querySelector('.services__header')
         if (!header) return

         header.setAttribute('role', 'button')
         header.setAttribute('aria-expanded', item.classList.contains('services__item-active'))
         header.setAttribute('tabindex', '0')

         header.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleItem(item)
            header.setAttribute(
               'aria-expanded',
               item.classList.contains('services__item-active')
            )
         })

         header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
               e.preventDefault()
               toggleItem(item)
               header.setAttribute(
                  'aria-expanded',
                  item.classList.contains('services__item-active')
               )
            }
         })

         header.dataset.serviceIndex = String(index)
      })

      window.ServicesAccordion = {
         toggle(index) {
            const item = items[index]
            if (item) toggleItem(item)
         },
         open(index) {
            const item = items[index]
            if (item) openItem(item)
         }
      }
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init)
   } else {
      init()
   }
})()
