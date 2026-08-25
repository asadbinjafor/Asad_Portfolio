/**
 * Visitor counter — HitsCounter.dev (CountAPI is offline)
 */
(function () {
   'use strict'

   function parseTotalHits(svgText) {
      const labelMatch = svgText.match(/aria-label="(\d+)\s*\/\s*(\d+)"/)
      if (labelMatch) return Number(labelMatch[2])

      const titleMatch = svgText.match(/<title>(\d+)\s*\/\s*(\d+)<\/title>/)
      if (titleMatch) return Number(titleMatch[2])

      return null
   }

   function init() {
      const el = document.getElementById('visitor-count')
      if (!el) return

      const trackUrl = el.dataset.trackUrl
      if (!trackUrl) return

      const apiUrl = `https://hitscounter.dev/api/hit?url=${encodeURIComponent(trackUrl)}`

      fetch(apiUrl)
         .then((response) => {
            if (!response.ok) throw new Error('Counter unavailable')
            return response.text()
         })
         .then((svgText) => {
            const total = parseTotalHits(svgText)
            if (typeof total === 'number' && !Number.isNaN(total)) {
               el.textContent = total.toLocaleString()
            }
         })
         .catch(() => {
            el.textContent = '—'
         })
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init)
   } else {
      init()
   }
})()
