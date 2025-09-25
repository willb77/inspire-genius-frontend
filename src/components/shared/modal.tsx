import { type FC, type ReactNode, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

const Modal: FC<ModalProps> = ({ open, onClose, className = '', children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      aria-modal
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-10 w-[90%] max-w-md rounded-xl bg-white p-6 shadow-lg',
          'dark:bg-neutral-900',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default Modal;


