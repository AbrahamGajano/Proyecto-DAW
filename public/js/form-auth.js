import { authRequest } from './auth-api.js';

const form = document.querySelector('#form-auth');
const status = document.querySelector('#estado');
const button = form.querySelector('button[type="submit"]');
const register = form.dataset.modo === 'registro';

function showFieldError(input, message) {
  input.setAttribute('aria-invalid', 'true');
  document.getElementById(`error-${input.name}`).textContent = message;
}

form.addEventListener('input', event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  input.removeAttribute('aria-invalid');
  document.getElementById(`error-${input.name}`).textContent = '';
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled) return;
  status.textContent = '';
  const inputs = [...form.querySelectorAll('input')];
  for (const input of inputs) {
    input.removeAttribute('aria-invalid');
    document.getElementById(`error-${input.name}`).textContent = '';
    if (input.name !== 'contrasena') input.value = input.value.trim();
    if (!input.validity.valid) showFieldError(input, input.validationMessage);
    else if (register && input.name === 'contrasena' && input.value.length < 8) showFieldError(input, 'Usa al menos 8 caracteres.');
  }
  const invalid = form.querySelector('[aria-invalid="true"]');
  if (invalid) {
    status.textContent = 'Revisa los campos indicados.';
    invalid.focus();
    return;
  }
  const body = Object.fromEntries(new FormData(form));
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  status.textContent = register ? 'Creando tu cuenta…' : 'Iniciando sesión…';
  try {
    await authRequest(register ? 'registro' : 'login', { method: 'POST', body });
    form.reset();
    if (register) {
      status.textContent = 'Cuenta creada. Ya puedes iniciar sesión con el enlace de abajo.';
    } else {
      window.location.assign('/');
    }
  } catch (error) {
    status.textContent = error.message;
    for (const [name, message] of Object.entries(error.campos ?? {})) {
      const input = inputs.find(item => item.name === name);
      if (input) showFieldError(input, message);
    }
    form.querySelector('[aria-invalid="true"]')?.focus();
  } finally {
    button.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
