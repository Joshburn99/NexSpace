import { ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

class ToastManager {
  private container: HTMLDivElement | null = null;

  private ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  show(options: ToastOptions) {
    const container = this.ensureContainer();
    const toast = document.createElement('div');
    
    const icons = {
      success: '<svg class="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
      error: '<svg class="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
      warning: '<svg class="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
      info: '<svg class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    };

    const variant = options.variant || 'info';
    
    toast.className = 'relative flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg animate-in slide-in-from-right min-w-[300px] max-w-[420px]';
    toast.innerHTML = `
      <div class="flex-shrink-0">
        ${icons[variant]}
      </div>
      <div class="flex-1">
        <div class="font-semibold text-sm">${options.title}</div>
        ${options.description ? `<div class="text-sm text-muted-foreground mt-1">${options.description}</div>` : ''}
      </div>
      <button class="text-muted-foreground hover:text-foreground transition-colors">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;

    const closeButton = toast.querySelector('button');
    closeButton?.addEventListener('click', () => {
      toast.classList.add('animate-out', 'slide-out-to-right');
      setTimeout(() => toast.remove(), 150);
    });

    container.appendChild(toast);

    // Auto dismiss
    const duration = options.duration || 5000;
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('animate-out', 'slide-out-to-right');
        setTimeout(() => toast.remove(), 150);
      }
    }, duration);
  }
}

const toastManager = new ToastManager();

export function showToast(options: ToastOptions) {
  toastManager.show(options);
}

// Helper functions for common cases
export const toast = {
  success: (title: string, description?: string) => 
    showToast({ title, description, variant: 'success' }),
  error: (title: string, description?: string) => 
    showToast({ title, description, variant: 'error' }),
  warning: (title: string, description?: string) => 
    showToast({ title, description, variant: 'warning' }),
  info: (title: string, description?: string) => 
    showToast({ title, description, variant: 'info' }),
};