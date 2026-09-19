/* Decorative, scroll-controlled image sequence. No changes to native scrolling. */
(() => {
   'use strict'

   const canvas = document.getElementById('scroll-background')
   if (!canvas || canvas.dataset.initialized) return
   const context = canvas.getContext('2d')
   if (!context) return
   canvas.dataset.initialized = 'true'

   const frameCount = 300
   const assetVersion = '1'
   const localFileMode = location.protocol === 'file:'
   const compact = matchMedia('(max-width: 767px)').matches
   const variant = compact ? 'mobile' : 'desktop'
   const motion = matchMedia('(prefers-reduced-motion: reduce)')
   const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
   const constrainedConnection = Boolean(connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || ''))
   const networkLimit = constrainedConnection ? 2 : compact ? 4 : 6
   const backgroundNetworkLimit = constrainedConnection ? 1 : compact ? 2 : 4
   const decodedCacheLimit = compact ? 12 : 18
   const aheadRadius = compact ? 6 : 10
   const behindRadius = compact ? 3 : 4
   const initialFrameCount = compact ? 8 : 12
   const listeners = new AbortController()
   const decodedCache = new Map()
   const decodedInFlight = new Map()
   const compressedCache = new Map()
   const blobRequests = new Map()
   const networkQueue = new Map()
   const failed = new Set()
   const backgroundOrder = []
   let backgroundCursor = 0
   let networkActive = 0
   let backgroundNetworkActive = 0
   let loadController = new AbortController()
   let loadGeneration = 0
   let idleHandle = 0
   let idleUsesNative = false
   let target = 0
   let position = 0
   let direction = 1
   let drawn = -1
   let lastImage = null
   let lastTime = 0
   let raf = 0
   let dirty = true
   let themeActive = document.documentElement.dataset.theme !== 'light'
   let suspended = document.hidden || !themeActive
   let disposed = false

   for (let index = 15; index < frameCount; index += 15) backgroundOrder.push(index)
   for (let index = 1; index < frameCount; index++) {
      if (index % 15 !== 0) backgroundOrder.push(index)
   }

   const clamp = value => Math.max(0, Math.min(frameCount - 1, value))
   const frameURL = index => `assets/img/scroll-background/${variant}/frame-${String(index + 1).padStart(3, '0')}.webp?v=${assetVersion}`

   function createAbortError() {
      try {
         return new DOMException('Background frame loading was cancelled.', 'AbortError')
      } catch (_) {
         const error = new Error('Background frame loading was cancelled.')
         error.name = 'AbortError'
         return error
      }
   }

   function touchDecoded(index) {
      const image = decodedCache.get(index)
      if (!image) return null
      decodedCache.delete(index)
      decodedCache.set(index, image)
      return image
   }

   function trimDecodedCache() {
      const protectedFrames = new Set([
         Math.floor(position),
         Math.ceil(position),
         Math.floor(target),
         Math.ceil(target),
         Math.round(target),
         Math.round(drawn)
      ].map(clamp))

      for (const index of decodedCache.keys()) {
         if (decodedCache.size <= decodedCacheLimit) break
         if (!protectedFrames.has(index)) decodedCache.delete(index)
      }
   }

   function nearestDecoded(frame) {
      let bestIndex = -1
      let bestDistance = Infinity
      let bestDirectionalPenalty = Infinity

      for (const index of decodedCache.keys()) {
         const distance = Math.abs(index - frame)
         const directionalPenalty = direction > 0 ? index < frame ? 1 : 0 : index > frame ? 1 : 0
         if (distance < bestDistance || (distance === bestDistance && directionalPenalty < bestDirectionalPenalty)) {
            bestIndex = index
            bestDistance = distance
            bestDirectionalPenalty = directionalPenalty
         }
      }

      if (bestIndex < 0) return null
      return { index: bestIndex, image: touchDecoded(bestIndex) }
   }

   function nextNetworkRequest() {
      let urgent = null
      let background = null

      for (const request of networkQueue.values()) {
         if (request.priority < 100) {
            if (!urgent || request.priority < urgent.priority) urgent = request
         } else if (!background || request.priority < background.priority) {
            background = request
         }
      }

      if (urgent) return urgent
      if (background && backgroundNetworkActive < backgroundNetworkLimit) return background
      return null
   }

   function pumpNetwork() {
      if (!themeActive || suspended || disposed) return

      while (networkActive < networkLimit) {
         const request = nextNetworkRequest()
         if (!request) break

         const requestGeneration = request.generation
         const isBackground = request.priority >= 100
         networkQueue.delete(request.index)
         request.state = 'loading'
         networkActive++
         if (isBackground) backgroundNetworkActive++

         const assetRequest = localFileMode
            ? new Promise((resolve, reject) => {
               const image = new Image()
               image.decoding = 'async'
               request.cancel = () => {
                  image.onload = null
                  image.onerror = null
                  image.src = ''
                  reject(createAbortError())
               }
               image.onload = () => image.decode().then(() => resolve(image), reject)
               image.onerror = () => reject(new Error(`Frame ${request.index + 1} could not be loaded.`))
               image.src = frameURL(request.index)
            })
            : fetch(frameURL(request.index), {
               cache: 'force-cache',
               signal: loadController.signal,
               priority: isBackground ? 'low' : 'high'
            }).then(response => {
               if (!response.ok) throw new Error(`Frame ${request.index + 1} returned ${response.status}`)
               return response.blob()
            })

         assetRequest
            .then(response => {
               if (requestGeneration !== loadGeneration || disposed) throw createAbortError()
               if (!localFileMode) compressedCache.set(request.index, response)
               request.resolve(response)
            })
            .catch(error => {
               if (requestGeneration === loadGeneration && error?.name !== 'AbortError') failed.add(request.index)
               request.reject(error)
            })
            .finally(() => {
               if (requestGeneration !== loadGeneration) return
               networkActive--
               if (isBackground) backgroundNetworkActive--
               blobRequests.delete(request.index)
               pumpNetwork()
            })
      }
   }

   function requestBlob(index, priority) {
      index = clamp(index)
      if (compressedCache.has(index)) return Promise.resolve(compressedCache.get(index))
      if (failed.has(index)) return Promise.reject(new Error(`Frame ${index + 1} is unavailable.`))

      const existing = blobRequests.get(index)
      if (existing) {
         if (existing.state === 'queued' && priority < existing.priority) existing.priority = priority
         pumpNetwork()
         return existing.promise
      }

      let resolveRequest
      let rejectRequest
      const promise = new Promise((resolve, reject) => {
         resolveRequest = resolve
         rejectRequest = reject
      })
      const request = {
         index,
         priority,
         promise,
         resolve: resolveRequest,
         reject: rejectRequest,
         state: 'queued',
         generation: loadGeneration
      }

      blobRequests.set(index, request)
      networkQueue.set(index, request)
      pumpNetwork()
      return promise
   }

   function decodeFrame(index, priority) {
      index = clamp(index)
      const cached = touchDecoded(index)
      if (cached) return Promise.resolve(cached)

      const existing = decodedInFlight.get(index)
      if (existing) {
         requestBlob(index, priority).catch(() => {})
         return existing
      }

      const requestGeneration = loadGeneration
      const promise = requestBlob(index, priority)
         .then(source => {
            if (localFileMode) {
               if (requestGeneration !== loadGeneration || disposed) throw createAbortError()
               decodedCache.set(index, source)
               trimDecodedCache()
               dirty = true
               wake()
               return source
            }

            return new Promise((resolve, reject) => {
               if (requestGeneration !== loadGeneration || disposed) {
                  reject(createAbortError())
                  return
               }

               const objectURL = URL.createObjectURL(source)
            const image = new Image()
            image.decoding = 'async'

            const finish = success => {
               image.onload = null
               image.onerror = null
               URL.revokeObjectURL(objectURL)
               if (!success || requestGeneration !== loadGeneration || disposed) {
                  reject(success ? createAbortError() : new Error(`Frame ${index + 1} could not be decoded.`))
                  return
               }

               decodedCache.set(index, image)
               trimDecodedCache()
               dirty = true
               wake()
               resolve(image)
            }

            image.onload = () => image.decode().then(() => finish(true), () => finish(false))
            image.onerror = () => finish(false)
               image.src = objectURL
            })
         })
         .catch(error => {
            if (requestGeneration === loadGeneration && error?.name !== 'AbortError') failed.add(index)
            throw error
         })
         .finally(() => {
            if (requestGeneration === loadGeneration) decodedInFlight.delete(index)
         })

      decodedInFlight.set(index, promise)
      promise.catch(() => {})
      return promise
   }

   function scheduleUrgent() {
      if (!themeActive || suspended || disposed) return
      if (motion.matches) {
         dirty = true
         wake()
         return
      }

      const wanted = new Map()
      const add = (index, priority) => {
         index = clamp(index)
         // Frame 001 is already the CSS fallback; avoiding a second JS request
         // keeps first paint single-request while preserving the exact pixels.
         if (index === 0) return
         const previous = wanted.get(index)
         if (previous === undefined || priority < previous) wanted.set(index, priority)
      }
      const destination = Math.round(target)
      const current = Math.round(position)

      add(destination, 0)
      add(Math.floor(target), 1)
      add(Math.ceil(target), 2)

      for (let step = 1; step <= aheadRadius; step++) add(destination + step * direction, 3 + step)
      for (let step = 1; step <= behindRadius; step++) add(destination - step * direction, 24 + step)
      add(current, 18)
      add(Math.floor(position), 19)
      add(Math.ceil(position), 20)

      if (target < initialFrameCount) {
         for (let index = 0; index < initialFrameCount; index++) add(index, 32 + index)
      }

      for (const [index, priority] of wanted) decodeFrame(index, priority).catch(() => {})
   }

   function cancelIdlePrefetch() {
      if (!idleHandle) return
      if (idleUsesNative) cancelIdleCallback(idleHandle)
      else clearTimeout(idleHandle)
      idleHandle = 0
   }

   function scheduleBackgroundPrefetch() {
      if (localFileMode || idleHandle || constrainedConnection || motion.matches || !themeActive || suspended || disposed) return

      const run = deadline => {
         idleHandle = 0
         if (!themeActive || suspended || disposed || motion.matches) return

         let scheduled = 0
         while (backgroundCursor < backgroundOrder.length && scheduled < 24) {
            if (!deadline.didTimeout && deadline.timeRemaining() < 2) break
            const index = backgroundOrder[backgroundCursor++]
            if (!compressedCache.has(index) && !blobRequests.has(index) && !failed.has(index)) {
               requestBlob(index, 1000 + backgroundCursor).catch(() => {})
               scheduled++
            }
         }

         if (backgroundCursor < backgroundOrder.length) scheduleBackgroundPrefetch()
      }

      if ('requestIdleCallback' in window) {
         idleUsesNative = true
         idleHandle = requestIdleCallback(run, { timeout: 700 })
      } else {
         idleUsesNative = false
         idleHandle = setTimeout(() => run({ didTimeout: true, timeRemaining: () => 0 }), 120)
      }
   }

   function wake() {
      if (!raf && themeActive && !suspended && !disposed) raf = requestAnimationFrame(render)
   }

   function updateTarget() {
      const distance = document.documentElement.scrollHeight - innerHeight
      const nextTarget = motion.matches || distance <= 0 ? 0 : clamp(scrollY / distance * (frameCount - 1))
      if (nextTarget !== target) direction = nextTarget > target ? 1 : -1
      target = nextTarget
      if (!themeActive || suspended || disposed) return
      scheduleUrgent()
      pumpNetwork()
      wake()
   }

   function resize() {
      if (!themeActive || suspended || disposed) return
      const ratio = Math.min(devicePixelRatio || 1, 2, Math.sqrt(2400000 / (innerWidth * innerHeight)))
      const width = Math.max(1, Math.round(innerWidth * ratio))
      const height = Math.max(1, Math.round(innerHeight * ratio))
      if (canvas.width !== width || canvas.height !== height) {
         canvas.width = width
         canvas.height = height
         dirty = true
         paint()
      }
      updateTarget()
   }

   function cover(image, alpha) {
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
      const width = image.naturalWidth * scale
      const height = image.naturalHeight * scale
      context.globalAlpha = alpha
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height)
   }

   function paint() {
      if (motion.matches || position <= .01) {
         context.clearRect(0, 0, canvas.width, canvas.height)
         lastImage = null
         drawn = 0
         canvas.dataset.drawnFrame = '001'
         dirty = false
         return
      }

      const lower = Math.floor(position)
      const upper = Math.ceil(position)
      const first = touchDecoded(lower)
      const second = upper === lower ? first : touchDecoded(upper)
      let primary = first || second
      let primaryIndex = first ? lower : second ? upper : -1

      if (!primary) {
         const nearest = nearestDecoded(position)
         primary = nearest?.image || lastImage
         primaryIndex = nearest?.index ?? Math.round(drawn)
      }

      if (!primary) return
      cover(primary, 1)
      if (first && second && lower !== upper) {
         cover(second, position - lower)
         primaryIndex = position - lower >= .5 ? upper : lower
      }

      lastImage = primary
      context.globalAlpha = 1
      drawn = primaryIndex
      canvas.dataset.drawnFrame = String(clamp(Math.round(primaryIndex)) + 1).padStart(3, '0')
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
      if (Math.floor(previous) !== Math.floor(position)) scheduleUrgent()
      if (position !== target || dirty) wake()
      else lastTime = 0
   }

   function changeMotion() {
      cancelIdlePrefetch()
      if (motion.matches) {
         target = 0
         position = 0
         drawn = -1
         scheduleUrgent()
         dirty = true
         wake()
      } else {
         updateTarget()
         scheduleBackgroundPrefetch()
      }
   }

   function clearAnimationData() {
      loadGeneration++
      cancelIdlePrefetch()
      loadController.abort()
      loadController = new AbortController()
      const abortError = createAbortError()
      for (const request of blobRequests.values()) {
         request.cancel?.()
         request.reject(abortError)
      }
      blobRequests.clear()
      networkQueue.clear()
      decodedInFlight.clear()
      decodedCache.clear()
      compressedCache.clear()
      failed.clear()
      networkActive = 0
      backgroundNetworkActive = 0
      backgroundCursor = 0
      lastImage = null
      drawn = -1
      dirty = true
      delete canvas.dataset.drawnFrame
      context.clearRect(0, 0, canvas.width, canvas.height)
   }

   function pause() {
      suspended = true
      cancelAnimationFrame(raf)
      raf = 0
      lastTime = 0
      cancelIdlePrefetch()
   }

   function activate() {
      suspended = document.hidden || !themeActive
      if (suspended || disposed) return
      const distance = document.documentElement.scrollHeight - innerHeight
      target = motion.matches || distance <= 0 ? 0 : clamp(scrollY / distance * (frameCount - 1))
      position = target
      resize()
      scheduleUrgent()
      scheduleBackgroundPrefetch()
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

      activate()
   }

   const options = { passive: true, signal: listeners.signal }
   window.addEventListener('scroll', updateTarget, options)
   window.addEventListener('resize', resize, options)
   window.addEventListener('load', () => {
      if (!themeActive || suspended) return
      resize()
      scheduleBackgroundPrefetch()
   }, options)
   motion.addEventListener('change', changeMotion, { signal: listeners.signal })

   const themeObserver = new MutationObserver(syncTheme)
   themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
   })

   document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
         pause()
      } else if (themeActive) {
         suspended = false
         updateTarget()
         scheduleBackgroundPrefetch()
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
      if (themeActive) activate()
   }, { signal: listeners.signal })

   if (themeActive) activate()
})()
