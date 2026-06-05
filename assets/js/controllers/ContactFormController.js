const contactForm = document.getElementById('contact-form')
const contactFormStatus = document.getElementById('contact-form-status')
const contactSubmit = document.getElementById('contact-submit')

if (contactForm) {
   const recipient = contactForm.dataset.recipient || ''
   const actionUrl = contactForm.getAttribute('action')?.trim() || ''

   function setStatus(message, isError = false) {
      if (!contactFormStatus) return
      contactFormStatus.textContent = message
      contactFormStatus.classList.toggle('is-error', isError)
   }

   function isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
   }

   contactForm.addEventListener('submit', async (event) => {
      event.preventDefault()

      const name = contactForm.elements.namedItem('name')?.value.trim() || ''
      const email = contactForm.elements.namedItem('email')?.value.trim() || ''
      const message = contactForm.elements.namedItem('message')?.value.trim() || ''

      if (!name || !email || !message) {
         setStatus('Please fill in all fields.', true)
         return
      }

      if (!isValidEmail(email)) {
         setStatus('Please enter a valid email address.', true)
         return
      }

      if (actionUrl) {
         contactSubmit.disabled = true
         setStatus('Sending...')

         try {
            const response = await fetch(actionUrl, {
               method: 'POST',
               headers: { Accept: 'application/json' },
               body: new FormData(contactForm),
            })

            if (!response.ok) {
               throw new Error('Request failed')
            }

            contactForm.reset()
            setStatus('Message sent successfully. Thank you!')
         } catch {
            setStatus('Could not send message. Please try again or email directly.', true)
         } finally {
            contactSubmit.disabled = false
         }

         return
      }

      if (!recipient) {
         setStatus('Recipient email is not configured.', true)
         return
      }

      const subject = encodeURIComponent(`Portfolio message from ${name}`)
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)
      window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`
      setStatus('Opening your email app to send the message...')
   })
}
