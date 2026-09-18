/* Decorative, scroll-controlled image sequence. No changes to native scrolling. */
(() => {
   'use strict'

   const canvas = document.getElementById('scroll-background')
   if (!canvas || canvas.dataset.initialized) return
   const context = canvas.getContext('2d')
   if (!context) return
   canvas.dataset.initialized = 'true'

   const frameCount = 300
   const compact = matchMedia('(max-width: 767px)').matches
   const variant = compact ? 'mobile' : 'desktop'
   const cacheLimit = compact ? 10 : 16
   const radius = compact ? 2 : 4
   const motion = matchMedia('(prefers-reduced-motion: reduce)')
   const cache = new Map()
   const pending = new Set()
   const inFlight = new Map()
   const failed = new Set()
   const listeners = new AbortController()
   let queue = []
   let active = 0
   let target = 0
   let position = 0
   let drawn = -1
   let lastImage = null
   let lastTime = 0
   let raf = 0
   let dirty = true
   let themeActive = document.documentElement.dataset.theme !== 'light'
   let suspended = document.hidden || !themeActive
   let disposed = false
   let loadGeneration = 0

   const clamp = value => Math.max(0, Math.min(frameCount - 1, value))
   const frameURL = index => `assets/img/scroll-background/${variant}/frame-${String(index + 1).padStart(3, '0')}.webp`

   function wake() {
      if (!raf && themeActive && !suspended && !disposed) raf = requestAnimationFrame(render)
   }

   function trimCache() {
      const protectedFrames = new Set([Math.floor(position), Math.ceil(position), Math.round(target), Math.floor(drawn), Math.ceil(drawn)])
      for (const index of cache.keys()) {
         if (cache.size <= cacheLimit) break
         if (!protectedFrames.has(index)) cache.delete(index)
      }
   }

   function pump() {
      if (!themeActive || suspended || disposed) return
      while (active < 2 && queue.length) {
         const index = queue.shift()
         if (cache.has(index) || pending.has(index) || failed.has(index)) continue
         active++
         pending.add(index)
         const img = new Image()
         const generation = loadGeneration
         inFlight.set(index, img)
         img.decoding = 'async'
         img.fetchPriority = 'low'
         const finish = success => {
            if (generation !== loadGeneration) return
            active--
            pending.delete(index)
            inFlight.delete(index)
            if (disposed) return
            if (success && (!motion.matches || index === 0)) {
               cache.set(index, img)
               trimCache()
               dirty = true
               wake()
            } else if (!success) {
               failed.add(index)
            }
            pump()
         }
         img.onload = () => img.decode().then(() => finish(true), () => finish(false))
         img.onerror = () => finish(false)
         img.src = frameURL(index)
      }
   }

   function preload() {
      if (!themeActive || suspended || disposed) return
      if (motion.matches) {
         queue = [0]
      } else {
         const current = Math.floor(position)
         const destination = Math.round(target)
         const direction = target >= position ? 1 : -1
         const wanted = [current, Math.ceil(position), destination]
         for (let step = 1; step <= radius; step++) {
            wanted.push(current + step * direction, current - step * direction,
               destination + step * direction)
         }
         queue = [...new Set(wanted.map(clamp))]
      }
      pump()
   }

   function updateTarget() {
      const distance = document.documentElement.scrollHeight - innerHeight
      target = motion.matches || distance <= 0 ? 0 : clamp(scrollY / distance * (frameCount - 1))
      if (!themeActive || suspended || disposed) return
      preload()
      wake()
   }

   function resize() {
      if (!themeActive || suspended || disposed) return
      // Cap backing-store pixels on high-DPI phones and large desktop screens.
      const ratio = Math.min(devicePixelRatio || 1, 2, Math.sqrt(2400000 / (innerWidth * innerHeight)))
      const width = Math.max(1, Math.round(innerWidth * ratio))
      const height = Math.max(1, Math.round(innerHeight * ratio))
      if (canvas.width !== width || canvas.height !== height) {
         // Setting canvas dimensions clears it; redraw in this same task.
         canvas.width = width
         canvas.height = height
         dirty = true
         paint()
      }
      updateTarget()
   }

   function cover(img, alpha) {
      const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight)
      const width = img.naturalWidth * scale
      const height = img.naturalHeight * scale
      context.globalAlpha = alpha
      context.drawImage(img, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
   }

   function paint() {
      const lower = Math.floor(position)
      const upper = Math.ceil(position)
      const first = cache.get(lower)
      const second = cache.get(upper)
      // Retain the previous complete image while new frames download.
      const fallback = lastImage
      if (!first && !second && !fallback) return
      cover(first || second || fallback, 1)
      if (first && second && lower !== upper) cover(second, position - lower)
      lastImage = first || second || fallback
      context.globalAlpha = 1
      drawn = first || second ? position : drawn
      dirty = false
   }

   function render(time) {
      raf = 0
      if (!themeActive || suspended || disposed) return
      const dt = Math.min(50, lastTime ? time - lastTime : 16.7)
      lastTime = time
      const previous = position
      position = motion.matches ? 0 : position + (target - position) * (1 - Math.exp(-dt / 130))
      if (Math.abs(target - position) < .01) position = target
      if (previous !== position || dirty) paint()
      if (Math.floor(previous) !== Math.floor(position)) preload()
      if (position !== target) wake()
      else lastTime = 0
   }

   function changeMotion() {
      if (motion.matches) {
         position = 0
         drawn = -1
         for (const index of cache.keys()) if (index !== 0) cache.delete(index)
      }
      dirty = true
      updateTarget()
   }

   function clearAnimationData() {
      loadGeneration++
      queue = []
      inFlight.forEach(img => {
         img.onload = null
         img.onerror = null
         img.src = ''
      })
      inFlight.clear()
      pending.clear()
      active = 0
      cache.clear()
      failed.clear()
      lastImage = null
      drawn = -1
      dirty = true
      context.clearRect(0, 0, canvas.width, canvas.height)
   }

   function pause() {
      suspended = true
      cancelAnimationFrame(raf)
      raf = 0
      lastTime = 0
   }

   function syncTheme() {
      const nextThemeActive = document.documentElement.dataset.theme !== 'light'
      if (nextThemeActive === themeActive) return

      themeActive = nextThemeActive
      if (!themeActive) {
         pause()
         clearAnimationData()
         return
      }

      suspended = document.hidden
      if (suspended) return
      const distance = document.documentElement.scrollHeight - innerHeight
      target = motion.matches || distance <= 0 ? 0 : clamp(scrollY / distance * (frameCount - 1))
      position = target
      resize()
   }

   const options = { passive: true, signal: listeners.signal }
   window.addEventListener('scroll', updateTarget, options)
   window.addEventListener('resize', resize, options)
   window.addEventListener('load', resize, options)
   motion.addEventListener('change', changeMotion, { signal: listeners.signal })
   const themeObserver = new MutationObserver(syncTheme)
   themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
   })
   document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause()
      else if (themeActive) {
         suspended = false
         updateTarget()
      }
   }, { signal: listeners.signal })
   const observer = new ResizeObserver(updateTarget)
   observer.observe(document.body)
   window.addEventListener('pagehide', event => {
      pause()
      if (!event.persisted) {
         disposed = true
         observer.disconnect()
         themeObserver.disconnect()
         listeners.abort()
         clearAnimationData()
      }
   }, { signal: listeners.signal })
   window.addEventListener('pageshow', () => {
      suspended = document.hidden || !themeActive
      if (themeActive) resize()
   }, { signal: listeners.signal })
   if (themeActive) resize()
})()
