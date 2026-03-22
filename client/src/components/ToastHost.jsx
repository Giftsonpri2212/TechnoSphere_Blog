import React from "react";

const ToastHost = ({ toasts = [], onDismiss }) => {
  return (
    <div className="toast-host" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type || "info"}`}>
          <p>{toast.message}</p>
          <button
            type="button"
            className="toast__close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastHost;
