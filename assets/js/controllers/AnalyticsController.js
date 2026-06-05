/**
 * Visitor counter — CountAPI (works on static GitHub Pages)
 */
(function () {
   'use strict'

   function init() {
      const el = document.getElementById('visitor-count')
      if (!el) return

      const namespace = el.dataset.namespace
      const key = el.dataset.key
      if (!namespace || !key) return

      const apiUrl = `https://api.countapi.xyz/hit/${encodeURIComponent(namespace)}/${encodeURIComponent(key)}`

      fetch(apiUrl)
         .then((response) => response.json())
         .then((data) => {
            if (typeof data.value === 'number') {
               el.textContent = data.value.toLocaleString()
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
