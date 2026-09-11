'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, pendingText = '正在保存…', className, type = 'submit' }: { children: React.ReactNode; pendingText?: string; className?: string; type?: 'submit' | 'button' }) {
  const { pending } = useFormStatus();
  return <button type={type} className={className} disabled={pending} aria-busy={pending}>{pending ? pendingText : children}</button>;
}
