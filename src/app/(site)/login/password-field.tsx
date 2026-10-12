'use client';

import { useState } from 'react';

export function PasswordField({ id, name = 'password', autoComplete, minLength, describedBy, fieldClassName, toggleClassName }: { id?: string; name?: string; autoComplete: 'current-password' | 'new-password'; minLength?: number; describedBy?: string; fieldClassName: string; toggleClassName: string }) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? name;
  return <div className={fieldClassName}><input id={inputId} name={name} type={visible ? 'text' : 'password'} autoComplete={autoComplete} minLength={minLength} aria-describedby={describedBy} required /><button className={toggleClassName} type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? '隐藏密码' : '显示密码'} aria-pressed={visible}>{visible ? '隐藏' : '显示'}</button></div>;
}
