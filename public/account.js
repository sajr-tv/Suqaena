for (const toggle of document.querySelectorAll('[data-show-password]')) {
  const password = toggle.form.elements.namedItem('password');
  toggle.addEventListener('change', () => {
    password.type = toggle.checked ? 'text' : 'password';
  });
  toggle.closest('label').hidden = false;
}
