/* Original-resolution JPEG sequence. Native scrolling; bounded rolling decode cache. */
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
   const failures = new Map()
   const clamp = value => Math.max(0, Math.min(frameCount - 1, value))
   const saveData = () => connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')
   const cacheLimit = () => compact.matches ? 6 : 8
   let active = false
   let target = 0
   let drawn = 0
   let direction = 1
   let wanted = []
   let raf = 0
   let retryTimer = 0
   let warmTimer = 0
   let warmed = false
   let scrollDistance = 1
   let distanceDirty = true
   let lastTargetTime = 0
   let velocity = 0
   let loadTime = 180

   function release(image) {
      image.onload = image.onerror = null
      image.src = ''
   }

   function trimCache() {
      const farthest = [...cache.keys()].sort((a, b) => Math.abs(b - target) - Math.abs(a - target))
      for (const index of farthest) {
         if (cache.size <= cacheLimit()) break
         if (index !== target && index !== drawn) {
            release(cache.get(index))
            cache.delete(index)
         }
      }
   }

   function queue() {
      if (active && !raf) raf = requestAnimationFrame(update)
   }

   function cancel(index, job) {
      clearTimeout(job.timeout)
      release(job.image)
      if (pending.get(index) === job) pending.delete(index)
   }

   function retryLater() {
      clearTimeout(retryTimer)
      retryTimer = 0
      const now = performance.now()
      const times = wanted.filter(index => !pending.has(index) && !cache.has(index)).map(index => failures.get(index)?.retryAt).filter(time => Number.isFinite(time) && time > now)
      if (active && times.length) retryTimer = setTimeout(queue, Math.max(0, Math.min(...times) - performance.now()))
   }

   function load(index) {
      const image = new Image()
      const job = { image, started: performance.now(), timeout: 0 }
      pending.set(index, job)
      image.decoding = 'async'
      image.fetchPriority = index === target ? 'high' : 'low'

      function fail() {
         if (pending.get(index) !== job) return
         const attempts = (failures.get(index)?.attempts || 0) + 1
         failures.set(index, { attempts, retryAt: attempts < 3 ? performance.now() + attempts * 1000 : Infinity })
         cancel(index, job)
         queue()
      }

      image.onload = async () => {
         try {
            if (image.decode) await image.decode()
            if (!active || pending.get(index) !== job) return
            clearTimeout(job.timeout)
            image.onload = image.onerror = null
            pending.delete(index)
            failures.delete(index)
            loadTime = loadTime * .7 + Math.min(1200, performance.now() - job.started) * .3
            cache.set(index, image)
            // Completed intermediate frames remain useful while scrolling continues.
            queue()
         } catch (_) {
            fail()
         }
      }
      image.onerror = fail
      job.timeout = setTimeout(fail, 8000)
      image.src = frameURL(index)
   }

   function pump() {
      if (!active) return
      for (const index of wanted) {
         if (pending.size >= (saveData() ? 1 : 2)) break
         const failure = failures.get(index)
         if (!cache.has(index) && !pending.has(index) && (!failure || failure.retryAt <= performance.now())) load(index)
      }
      retryLater()
   }

   function paint(force = false) {
      if (target === 0) {
         if (force || drawn !== 0) context.clearRect(0, 0, canvas.width, canvas.height)
         drawn = 0
         canvas.dataset.drawnFrame = '001'
         return
      }
      let index = drawn
      if (cache.has(target)) index = target
      else {
         // Advance toward the target without oscillating between speculative poses.
         for (const candidate of cache.keys()) {
            const between = target >= drawn ? candidate > drawn && candidate <= target : candidate < drawn && candidate >= target
            if (between && Math.abs(candidate - target) < Math.abs(index - target)) index = candidate
         }
      }
      const image = cache.get(index)
      if (!image || (!force && drawn === index)) return
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
      const width = image.naturalWidth * scale
      const height = image.naturalHeight * scale
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
      drawn = index
      canvas.dataset.drawnFrame = String(index + 1).padStart(3, '0')
   }

   function update(now) {
      raf = 0
      if (!active) return
      if (distanceDirty) {
         scrollDistance = Math.max(1, document.documentElement.scrollHeight - innerHeight)
         distanceDirty = false
      }
      const next = clamp(Math.round(scrollY / scrollDistance * (frameCount - 1)))
      if (next !== target) {
         const elapsed = Math.max(16, now - lastTargetTime)
         const nextDirection = next > target ? 1 : -1
         velocity = nextDirection === direction ? (next - target) / elapsed : 0
         direction = nextDirection
         lastTargetTime = now
      } else if (now - lastTargetTime > 180) velocity = 0
      target = next
      wanted = target > 0 ? [target] : []
      if (!saveData() && (target > 0 || warmed)) {
         const lead = Math.max(1, Math.min(6, Math.round(Math.abs(velocity) * loadTime)))
         for (const offset of [lead, 1, 2, -1, 3]) {
            const index = clamp(target + direction * offset)
            if (index > 0 && !wanted.includes(index)) wanted.push(index)
         }
      }
      // Let bounded in-flight requests finish instead of starving mobile downloads
      // by canceling them on each scroll event. Always service the newest target first.
      paint()
      trimCache()
      pump()
   }

   function resize() {
      distanceDirty = true
      if (!active) return
      const cssWidth = canvas.clientWidth || innerWidth
      const cssHeight = canvas.clientHeight || innerHeight
      const ratio = Math.min(devicePixelRatio || 1, 1920 / cssWidth, 1080 / cssHeight)
      const width = Math.max(1, Math.round(cssWidth * ratio))
      const height = Math.max(1, Math.round(cssHeight * ratio))
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
      clearTimeout(retryTimer)
      clearTimeout(warmTimer)
      raf = retryTimer = warmTimer = 0
      for (const [index, job] of pending) cancel(index, job)
      for (const image of cache.values()) release(image)
      cache.clear()
      failures.clear()
      wanted = []
      warmed = false
      drawn = 0
      velocity = 0
      context.clearRect(0, 0, canvas.width, canvas.height)
      canvas.dataset.drawnFrame = '001'
   }

   function syncState() {
      if (document.hidden || motion.matches || document.documentElement.dataset.theme === 'light') stop()
      else if (!active) {
         active = true
         resize()
         // Warm a small opening window after critical page resources, never all frames.
         warmTimer = setTimeout(() => { warmed = true; queue() }, 500)
      }
   }

   const options = { passive: true, signal: listeners.signal }
   window.addEventListener('scroll', queue, options)
   window.addEventListener('resize', resize, options)
   window.addEventListener('load', () => { distanceDirty = true; queue() }, options)
   window.addEventListener('online', () => { failures.clear(); queue() }, options)
   document.addEventListener('visibilitychange', syncState, { signal: listeners.signal })
   motion.addEventListener('change', syncState, { signal: listeners.signal })
   compact.addEventListener('change', resize, { signal: listeners.signal })
   const themeObserver = new MutationObserver(syncState)
   themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
   const sizeObserver = new ResizeObserver(() => { distanceDirty = true; queue() })
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
