import { authRequest } from './auth-api.js';

const status = document.querySelector('#estado');
const visitor = document.querySelector('#visitante');
const session = document.querySelector('#sesion');
const retry = document.querySelector('#reintentar');
const logout = document.querySelector('#salir');

async function loadSession() {
  retry.hidden = true;
  status.textContent = 'Comprobando tu sesión…';
  try {
    const user = await authRequest('yo');
    document.querySelector('#bienvenida').textContent = `Hola, ${user.nombreUsuario}. Has iniciado sesión.`;
    session.hidden = false;
    visitor.hidden = true;
    status.textContent = '';
  } catch (error) {
    if (error.status === 401) {
      session.hidden = true;
      visitor.hidden = false;
      status.textContent = '';
    } else {
      status.textContent = error.message;
      retry.hidden = false;
    }
  }
}

retry.addEventListener('click', loadSession);
logout.addEventListener('click', async () => {
  logout.disabled = true;
  try {
    await authRequest('logout', { method: 'POST', body: {} });
    session.hidden = true;
    visitor.hidden = false;
    status.textContent = 'Has cerrado sesión.';
    visitor.querySelector('a').focus();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    logout.disabled = false;
  }
});

loadSession();
