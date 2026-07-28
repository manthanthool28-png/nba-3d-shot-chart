const SEEN_KEY = 'shotchart.onboarding.seen';

export function initOnboarding() {
  const overlay = document.querySelector('#onboarding');
  const dismissBtn = document.querySelector('#onboarding-dismiss');

  if (!localStorage.getItem(SEEN_KEY)) {
    overlay.classList.remove('hidden');
  }

  function dismiss() {
    overlay.classList.add('hidden');
    localStorage.setItem(SEEN_KEY, '1');
  }
  dismissBtn.addEventListener('click', dismiss);

  return { dismiss, reset: () => localStorage.removeItem(SEEN_KEY) };
}

export function initHelpModal() {
  const modal = document.querySelector('#help-modal');
  const dismissBtn = document.querySelector('#help-dismiss');
  function toggle() {
    modal.classList.toggle('hidden');
  }
  function hide() {
    modal.classList.add('hidden');
  }
  dismissBtn.addEventListener('click', hide);
  return { toggle, hide, isOpen: () => !modal.classList.contains('hidden') };
}
