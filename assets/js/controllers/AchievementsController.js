/**
 * Achievements section — category tabs filter card grid
 */
(function () {
   'use strict'

   function init() {
      const tabs = document.querySelectorAll('.achievements__tab')
      const cards = document.querySelectorAll('.achievements__card')
      const grid = document.getElementById('achievements-grid')
      if (!tabs.length || !cards.length) return

      function setActiveTab(activeTab) {
         tabs.forEach((tab) => {
            const isActive = tab === activeTab
            tab.classList.toggle('achievements__tab-active', isActive)
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false')
         })
      }

      function filterCards(category) {
         let visibleCount = 0

         cards.forEach((card) => {
            const match = card.dataset.category === category
            card.classList.toggle('achievements__card-hidden', !match)
            if (match) visibleCount++
         })

         if (grid) {
            grid.classList.toggle('achievements__grid-idle', visibleCount === 0)
            grid.classList.toggle('achievements__grid-empty', visibleCount === 0)
         }
      }

      tabs.forEach((tab) => {
         tab.addEventListener('click', () => {
            setActiveTab(tab)
            filterCards(tab.dataset.filter)
         })
      })

      if (grid) {
         grid.classList.add('achievements__grid-idle')
      }
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init)
   } else {
      init()
   }
})()
