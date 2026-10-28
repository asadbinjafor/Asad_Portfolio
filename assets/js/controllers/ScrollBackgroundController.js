/* Dark-theme background: original JPEGs, loaded only near the current scroll frame. */
(() => {
   'use strict'

   const canvas = document.getElementById('scroll-background')
   if (!canvas || canvas.dataset.initialized) return
   const context = canvas.getContext('2d')
   if (!context) return
   canvas.dataset.initialized = 'true'

   const frameCount = 240
   const frameURL = index => `assets/img/scroll-background/sequence-v2/frame-${String(index + 1).padStart(3, '0')}.jpg`
   const motion = matchMedia('(prefers-reduced-motion: reduce)')
   const compact = matchMedia('(max-width: 767px)')
   const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
   const listeners = new AbortController()
   const cache = new Map()
   const pending = new Map()
   const failed = new Set()
   let active = false
   let target = 0
   let drawn = 0
   let direction = 1
   let wanted = []
   let raf = 0

   const clamp = value => Math.max(0, Math.min(frameCount - 1, value))
   const cacheLimit = () => compact.matches ? 4 : 6
   const saveData = () => connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')

   function trimCache() {
      for (const [index, image] of cache) {
         if (cache.size <= cacheLimit()) break
         if (index !== target && index !== drawn) {
            cache.delete(index)
            image.src = ''
         }
      }
   }

   function queue() {
      if (active && !raf) raf = requestAnimationFrame(update)
   }

   function cancel(index, job) {
      job.image.onload = job.image.onerror = null
      job.image.src = ''
      if (pending.get(index) === job) pending.delete(index)
   }

   function load(index) {
      const image = new Image()
      const job = { image }
      pending.set(index, job)
      image.decoding = 'async'
      image.fetchPriority = index === target ? 'high' : 'low'
      image.onload = async () => {
         try {
            if (image.decode) await image.decode()
            if (!active || pending.get(index) !== job) return
            cache.set(index, image)
            trimCache()
            queue()
         } catch (_) {
            if (pending.get(index) === job) failed.add(index)
         } finally {
            if (pending.get(index) === job) pending.delete(index)
            pump()
         }
      }
      image.onerror = () => {
         if (pending.get(index) !== job) return
         pending.delete(index)
         failed.add(index)
         pump()
      }
      image.src = frameURL(index)
   }

   function pump() {
      if (!active) return
      for (const index of wanted) {
         if (pending.size >= 2) break
         if (!cache.has(index) && !pending.has(index) && !failed.has(index)) load(index)
      }
   }

   function paint(force = false) {
      if (target === 0) {
         if (force || drawn !== 0) context.clearRect(0, 0, canvas.width, canvas.height)
         drawn = 0
         canvas.dataset.drawnFrame = '001'
         return
      }
      // Keep the previous picture until the requested JPEG is ready. Never blend
      // distant poses or clear the canvas while a new frame is still loading.
      const index = cache.has(target) ? target : drawn
      const image = cache.get(index)
      if (!image || (!force && drawn === index)) return
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
      const width = image.naturalWidth * scale
      const height = image.naturalHeight * scale
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
      drawn = index
      canvas.dataset.drawnFrame = String(index + 1).padStart(3, '0')
   }

   function update() {
      raf = 0
      if (!active) return
      const distance = document.documentElement.scrollHeight - innerHeight
      const next = distance > 0 ? clamp(Math.round(scrollY / distance * (frameCount - 1))) : 0
      if (next !== target) direction = next > target ? 1 : -1
      target = next
      // Frame 001 is the immediate CSS poster. Opening the page downloads no
      // additional frames. Neighbors load only after the visible frame is ready.
      wanted = target === 0 ? [] : [target]
      if (target > 0 && cache.has(target) && !saveData()) {
         for (const index of [target + direction, target - direction]) {
            if (index > 0 && index < frameCount) wanted.push(index)
         }
      }
      for (const [index, job] of pending) {
         if (!wanted.includes(index) && Math.abs(index - target) > 2) cancel(index, job)
      }
      paint()
      trimCache()
      pump()
   }

   function resize() {
      if (!active) return
      // Use all useful original pixels; avoid a redundant upscaled HiDPI buffer.
      const ratio = Math.min(devicePixelRatio || 1, 1920 / innerWidth, 1080 / innerHeight)
      const width = Math.max(1, Math.round(innerWidth * ratio))
      const height = Math.max(1, Math.round(innerHeight * ratio))
      if (canvas.width !== width || canvas.height !== height) {
         canvas.width = width
         canvas.height = height
         context.imageSmoothingQuality = 'high'
         paint(true)
      }
      queue()
   }

   function stop() {
      active = false
      cancelAnimationFrame(raf)
      raf = 0
      for (const [index, job] of pending) cancel(index, job)
      for (const image of cache.values()) image.src = ''
      cache.clear()
      failed.clear()
      wanted = []
      drawn = 0
      context.clearRect(0, 0, canvas.width, canvas.height)
      canvas.dataset.drawnFrame = '001'
   }

   function syncState() {
      if (document.hidden || motion.matches || document.documentElement.dataset.theme === 'light') {
         stop()
      } else if (!active) {
         active = true
         resize()
      }
   }

   const options = { passive: true, signal: listeners.signal }
   window.addEventListener('scroll', queue, options)
   window.addEventListener('resize', resize, options)
   window.addEventListener('load', queue, options)
   document.addEventListener('visibilitychange', syncState, { signal: listeners.signal })
   motion.addEventListener('change', syncState, { signal: listeners.signal })
   compact.addEventListener('change', resize, { signal: listeners.signal })
   const themeObserver = new MutationObserver(syncState)
   themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
   const sizeObserver = new ResizeObserver(queue)
   sizeObserver.observe(document.body)
   window.addEventListener('pagehide', event => {
      stop()
      if (!event.persisted) {
         themeObserver.disconnect()
         sizeObserver.disconnect()
         listeners.abort()
      }
   }, { signal: listeners.signal })
   window.addEventListener('pageshow', syncState, { signal: listeners.signal })
   syncState()
})()
