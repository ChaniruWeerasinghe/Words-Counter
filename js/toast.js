/**
 * Toast Notification System
 * Replaces default browser alerts with clean, accessible UI notifications.
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  }

  show(options) {
    try {
      const {
        title = '',
        message = '',
        type = 'info', // 'success' | 'warning' | 'danger' | 'info'
        duration = 4000,
        action = null // { label: 'Undo', onClick: Function }
      } = typeof options === 'string' ? { message: options } : options;

      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.setAttribute('role', 'alert');

      const iconSvg = this.getIcon(type);

      toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-content">
          ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
          <div class="toast-message">${this.escapeHtml(message)}</div>
          ${action ? `<button type="button" class="toast-action-btn" id="toast-act-btn">${this.escapeHtml(action.label || 'Action')}</button>` : ''}
        </div>
        <button type="button" class="toast-close" aria-label="Close notification">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      if (action && typeof action.onClick === 'function') {
        toast.querySelector('#toast-act-btn')?.addEventListener('click', (e) => {
          e.stopPropagation();
          action.onClick();
          removeToast();
        });
      }

      const closeBtn = toast.querySelector('.toast-close');
      const removeToast = () => {
        if (toast.classList.contains('hiding')) return;
        toast.classList.add('hiding');
        setTimeout(() => {
          if (toast.parentElement) {
            toast.parentElement.removeChild(toast);
          }
        }, 260);
      };

      closeBtn.addEventListener('click', removeToast);

      if (duration > 0) {
        setTimeout(removeToast, duration);
      }

      this.container.appendChild(toast);
    } catch (error) {
      console.error('Error showing toast notification:', error);
    }
  }

  success(title, message, duration) {
    this.show({ title, message, type: 'success', duration });
  }

  warning(title, message, duration) {
    this.show({ title, message, type: 'warning', duration });
  }

  error(title, message, duration) {
    this.show({ title, message, type: 'danger', duration });
  }

  info(title, message, duration) {
    this.show({ title, message, type: 'info', duration });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  getIcon(type) {
    switch (type) {
      case 'success':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
      case 'warning':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
      case 'danger':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
  }
}

// Global instance
window.Toast = new ToastManager();
