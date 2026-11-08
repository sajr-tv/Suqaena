for (const toggle of document.querySelectorAll('[data-show-password]')) {
  const passwords = [...toggle.form.querySelectorAll('input[name="password"], input[name="confirm_password"]')];
  toggle.addEventListener('change', () => {
    for (const password of passwords) password.type = toggle.checked ? 'text' : 'password';
  });
}
