/**
 * Project details modal — Features, Technologies, Challenges
 */
(function () {
   'use strict'

   let modal, projectsMap, lastFocus = null
   let touchMoved = false

   function getProjectsMap() {
      const el = document.getElementById('projects-modal-data')
      if (!el) return {}

      try {
         const list = JSON.parse(el.textContent)
         return list.reduce((acc, project) => {
            acc[project.id] = project
            return acc
         }, {})
      } catch {
         return {}
      }
   }

   function fillList(container, items) {
      container.innerHTML = ''
      items.forEach((item) => {
         const li = document.createElement('li')
         li.textContent = item
         container.appendChild(li)
      })
   }

   function fillTags(container, tags) {
      container.innerHTML = ''
      tags.forEach((tag) => {
         const span = document.createElement('span')
         span.className = 'project-modal__tag'
         span.textContent = tag
         container.appendChild(span)
      })
   }

   function openModal(projectId) {
      const project = projectsMap[projectId]
      if (!project || !modal) return

      lastFocus = document.activeElement

      document.getElementById('project-modal-img').src = project.image
      document.getElementById('project-modal-img').alt = project.image_alt
      document.getElementById('project-modal-category').textContent = project.category
      document.getElementById('project-modal-title').textContent = project.plain_title

      fillList(document.getElementById('project-modal-features'), project.features)
      fillTags(document.getElementById('project-modal-tech'), project.tech_stack)
      fillList(document.getElementById('project-modal-challenges'), project.challenges)

      const footer = document.getElementById('project-modal-footer')
      const githubLink = document.getElementById('project-modal-github')
      if (project.github_url && footer && githubLink) {
         githubLink.href = project.github_url
         document.getElementById('project-modal-github-text').textContent = project.link_text || 'View on GitHub'
         footer.hidden = false
      } else if (footer) {
         footer.hidden = true
      }

      modal.hidden = false
      modal.setAttribute('aria-hidden', 'false')
      document.body.classList.add('project-modal-open')

      modal.querySelector('.project-modal__close')?.focus()
   }

   function closeModal() {
      if (!modal || modal.hidden) return

      modal.hidden = true
      modal.setAttribute('aria-hidden', 'true')
      document.body.classList.remove('project-modal-open')

      if (lastFocus && typeof lastFocus.focus === 'function') {
         lastFocus.focus()
      }
   }

   function init() {
      modal = document.getElementById('project-modal')
      projectsMap = getProjectsMap()

      if (!modal || !Object.keys(projectsMap).length) return

      document.querySelectorAll('.projects__slide--clickable').forEach((slide) => {
         slide.addEventListener('click', (event) => {
            if (touchMoved) {
               touchMoved = false
               return
            }
            if (event.target.closest('.projects__button')) return
            if (event.target.closest('.projects__github-link')) return

            const id = event.target.closest('[data-project-id]')?.dataset.projectId
               || slide.dataset.projectId
            if (id) openModal(id)
         })

         slide.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
               event.preventDefault()
               openModal(slide.dataset.projectId)
            }
         })
      })

      document.querySelectorAll('.projects__details-btn').forEach((btn) => {
         btn.addEventListener('click', (event) => {
            event.stopPropagation()
            openModal(btn.dataset.projectId)
         })
      })

      modal.querySelectorAll('[data-modal-close]').forEach((el) => {
         el.addEventListener('click', closeModal)
      })

      document.addEventListener('keydown', (event) => {
         if (event.key === 'Escape' && !modal.hidden) {
            closeModal()
         }
      })

      const carousel = document.getElementById('projects-carousel')
      carousel?.addEventListener('touchstart', () => {
         touchMoved = false
      }, { passive: true })

      carousel?.addEventListener('touchmove', () => {
         touchMoved = true
      }, { passive: true })
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init)
   } else {
      init()
   }
})()
