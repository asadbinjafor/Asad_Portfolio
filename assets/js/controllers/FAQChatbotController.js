/** Local, deterministic FAQ. No API calls, timers, storage or page scroll listeners. */
(function () {
   'use strict'

   const root = document.getElementById('faq-chat')
   const panel = document.getElementById('faq-panel')
   const launcher = document.getElementById('faq-launcher')
   const close = document.getElementById('faq-close')
   const log = document.getElementById('faq-messages')
   const form = document.getElementById('faq-form')
   const input = document.getElementById('faq-question')
   const topics = document.getElementById('faq-topics')
   if (!root || !panel || !launcher || !close || !log || !form || !input || !topics) return

   // Reuse the portfolio's existing facts and URLs so CV/contact changes stay in sync.
   const text = (selector) => document.querySelector(selector)?.textContent.trim() || ''
   const href = (selector) => document.querySelector(selector)?.getAttribute('href') || '#contact'
   const email = document.getElementById('contact-form')?.dataset.recipient || ''
   let projects = []
   try {
      const data = JSON.parse(document.getElementById('projects-modal-data')?.textContent || '[]')
      if (Array.isArray(data)) projects = data
   } catch (_) {
      // General project navigation remains available if project data is unavailable.
   }

   const faqs = [
      {
         id: 'skills', label: 'Skills', question: 'What are Asad\'s skills?',
         keywords: ['skill', 'skills', 'technology', 'technologies', 'tech stack', 'programming', 'language', 'languages', 'php', 'react', 'next.js', 'nestjs', 'javascript', 'typescript', 'java', 'c#', 'c++', 'দক্ষতা', 'স্কিল', 'প্রযুক্তি', 'ki paro'],
         answer: 'Asad works with TypeScript, JavaScript, PHP, Java, C# and C++. His portfolio includes React, Next.js, NestJS, MySQL, PostgreSQL and Oracle Database projects.',
         links: [['Explore technologies', '#technologies']],
      },
      {
         id: 'projects', label: 'Projects', question: 'What projects has Asad built?',
         keywords: ['project', 'projects', 'portfolio', 'work samples', 'প্রজেক্ট', 'প্রকল্প', 'kaj dekhao'],
         answer: () => (projects.length ? 'Featured work includes ' + projects.slice(0, 3).map((project) => project.plain_title).join('; ') + '. ' : '') + 'Browse the Projects section for details, technology stacks and GitHub links.',
         links: [['Browse projects', '#projects']],
      },
      {
         id: 'resume', label: 'CV / Resume', question: 'Where can I find Asad\'s CV?',
         keywords: ['cv', 'resume', 'résumé', 'সিভি', 'রেজুমে', 'জীবনবৃত্তান্ত'],
         answer: 'You can preview or download Asad\'s resume using the same links available in the About section.',
         links: [['Preview CV', href('.about__resume-btn')], ['Download CV', href('.about__resume-btn-alt')]],
      },
      {
         id: 'contact', label: 'Contact', question: 'How can I contact Asad?',
         keywords: ['contact', 'email', 'e mail', 'phone', 'call', 'message', 'address', 'location', 'যোগাযোগ', 'ইমেইল', 'ফোন', 'ঠিকানা', 'kotha bolbo'],
         answer: () => 'Email: ' + email + '\n' + Array.from(document.querySelectorAll('.contact__group')).slice(1, 3).map((group) => textFromGroup(group)).join('\n') + '\nUse the Contact section to send a message or find social links.',
         links: [['Go to contact form', '#contact'], ['Email Asad', 'mailto:' + email]],
      },
      {
         id: 'education', label: 'Education', question: 'Where does Asad study?',
         keywords: ['education', 'study', 'studies', 'student', 'university', 'aiub', 'degree', 'semester', 'credits', 'শিক্ষা', 'পড়াশোনা', 'বিশ্ববিদ্যালয়', 'porashona', 'kothay poro'],
         answer: () => text('.work__title') + '\n' + text('.work__subtitle') + '\n' + text('.work__year') + '\n' + text('.work__description'),
         links: [['Education', '#work'], ['Developer journey', '#journey']],
      },
      {
         id: 'achievements', label: 'Achievements', question: 'Where are Asad\'s achievements?',
         keywords: ['achievement', 'achievements', 'certificate', 'certificates', 'certification', 'award', 'awards', 'course', 'courses', 'volunteer', 'seminar', 'অর্জন', 'সার্টিফিকেট', 'পুরস্কার'],
         answer: 'The Achievements & Activities section includes certifications, courses, seminars, volunteer programs and awards. Select a category there to see its entries and available certificates.',
         links: [['View achievements', '#achievements']],
      },
      {
         id: 'availability', label: 'Availability', question: 'Is Asad available for work?',
         keywords: ['available', 'availability', 'hire', 'hiring', 'intern', 'internship', 'internships', 'job', 'collaboration', 'collaborate', 'freelance', 'চাকরি', 'ইন্টার্নশিপ', 'kaj korba'],
         answer: () => text('.contact__description') || 'Asad is open to internships, junior developer roles and project collaboration. Contact him to discuss availability and project requirements.',
         links: [['Discuss an opportunity', '#contact']],
      },
      {
         id: 'about', label: 'About Asad', question: 'Who is Asad?',
         keywords: ['about', 'who', 'asad', 'jafor', 'yourself', 'তুমি', 'পরিচয়', 'কে', 'tumi ke'],
         answer: () => 'Mohammad Asad Bin Jafor — ' + text('.about__description'),
         links: [['Read about Asad', '#about']],
      },
      {
         id: 'social', label: 'Social links', question: 'Where can I find Asad online?',
         keywords: ['github', 'linkedin', 'facebook', 'instagram', 'social', 'repository', 'repositories', 'source code'],
         answer: 'Asad\'s code and professional profile are available through these portfolio links.',
         links: [['GitHub', href('.contact__link[href*="github.com"]')], ['LinkedIn', href('.contact__link[href*="linkedin.com"]')]],
      },
   ]

   function textFromGroup(group) {
      return [group.querySelector('.contact__title')?.textContent.trim(), group.querySelector('.contact__address')?.textContent.trim()].filter(Boolean).join(': ')
   }

   function normalize(value) {
      return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}+#]+/gu, ' ').trim()
   }

   function contains(query, term) {
      return (' ' + query + ' ').includes(' ' + normalize(term) + ' ')
   }

   function answerFor(question) {
      const query = normalize(question)
      // Named projects use the existing modal data, rather than a separate copy.
      const project = projects.find((entry) => {
         const name = entry.plain_title.split(/[—–]/)[0].trim()
         return name.length > 5 && contains(query, name)
      })
      if (project) {
         return {
            answer: project.plain_title + '\n' + project.features.slice(0, 2).join('. ') + '.\nTechnologies: ' + project.tech_stack.join(', ') + '.',
            links: [['Project source', project.github_url], ['All project details', '#projects']],
         }
      }

      let best = null
      let bestScore = 0
      for (const faq of faqs) {
         // A person's name must not outweigh a specific topic such as "CV".
         // Use identity keywords only after the other topics have been considered.
         if (faq.id === 'about') continue
         const score = faq.keywords.reduce((total, keyword) => total + (contains(query, keyword) ? normalize(keyword).length : 0), 0)
         if (score > bestScore) {
            best = faq
            bestScore = score
         }
      }
      if (best) return best
      const about = faqs.find((faq) => faq.id === 'about')
      if (about.keywords.some((keyword) => contains(query, keyword))) return about
      if (['hi', 'hello', 'hey', 'হ্যালো', 'সালাম', 'help', 'সাহায্য', 'thanks', 'thank you'].some((word) => contains(query, word))) {
         return { answer: 'Hello! I can help you find Asad\'s skills, projects, education, achievements, CV and contact details. Choose a topic below or type a portfolio question.' }
      }
      return {
         answer: 'I only have preset answers about this portfolio. Try a topic below, or contact Asad directly for anything else.',
         links: [['Contact Asad', '#contact']],
      }
   }

   function appendMessage(content, isUser = false) {
      const message = document.createElement('div')
      message.className = 'faq-chat__message' + (isUser ? ' faq-chat__message--user' : '')
      message.setAttribute('aria-label', isUser ? 'You' : 'Portfolio FAQ')
      const body = document.createElement('p')
      body.textContent = typeof content.answer === 'function' ? content.answer() : content.answer
      message.appendChild(body)
      for (const [label, url] of content.links || []) {
         if (!url || !/^(https:\/\/|mailto:|#[a-z][\w-]*$)/i.test(url)) continue
         const link = document.createElement('a')
         link.textContent = label
         link.href = url
         if (url.startsWith('https://')) {
            link.target = '_blank'
            link.rel = 'noopener noreferrer'
         }
         message.appendChild(link)
         message.appendChild(document.createElement('br'))
      }
      log.appendChild(message)
      // Keep this session's DOM bounded. Closing/reopening does not duplicate listeners.
      while (log.childElementCount > 30) log.firstElementChild.remove()
      log.scrollTop = log.scrollHeight
   }

   function setOpen(open, restoreFocus = false) {
      panel.hidden = !open
      launcher.setAttribute('aria-expanded', String(open))
      launcher.setAttribute('aria-label', open ? 'Close portfolio FAQ' : 'Open portfolio FAQ')
      if (open) {
         log.scrollTop = log.scrollHeight
         close.focus({ preventScroll: true })
      } else if (restoreFocus) launcher.focus({ preventScroll: true })
   }

   function ask(question, faq) {
      const value = question.trim().slice(0, 300)
      if (!value) return
      appendMessage({ answer: value }, true)
      appendMessage(faq || answerFor(value))
   }

   for (const faq of faqs.slice(0, 8)) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'faq-chat__topic'
      button.textContent = faq.label
      button.setAttribute('aria-label', faq.question)
      button.addEventListener('click', () => ask(faq.question, faq))
      topics.appendChild(button)
   }

   appendMessage({ answer: 'Hi! Looking for something about Asad? Choose a topic below or type a question. I use preset portfolio answers, not AI.' })
   launcher.addEventListener('click', () => setOpen(panel.hidden, !panel.hidden))
   close.addEventListener('click', () => setOpen(false, true))
   form.addEventListener('submit', (event) => {
      event.preventDefault()
      ask(input.value)
      input.value = ''
   })
   root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !panel.hidden) {
         event.stopPropagation()
         setOpen(false, true)
      }
   })
   document.addEventListener('click', (event) => {
      if (!panel.hidden && !root.contains(event.target)) setOpen(false)
   })
   log.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]')
      if (!link) return
      const target = document.getElementById(link.hash.slice(1))
      if (!target) return
      event.preventDefault()
      setOpen(false)
      const offset = typeof window.getScrollOffset === 'function' ? window.getScrollOffset() : 72
      window.scrollTo({
         top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset),
         behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
      if (location.hash !== link.hash) history.pushState(null, '', link.hash)
      // Move keyboard users to the destination without changing existing markup permanently.
      if (!target.hasAttribute('tabindex')) {
         target.setAttribute('tabindex', '-1')
         target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
      }
      target.focus({ preventScroll: true })
   })
   root.hidden = false
})()
