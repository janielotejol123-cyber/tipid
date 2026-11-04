import type { InputHTMLAttributes } from 'react'
import { IconEye, IconEyeOff } from './icons'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { shown: boolean; onShownChange: (shown: boolean) => void }

/** Password box with an eye to show or hide what was typed. The parent owns `shown` so it can hide it again on submit. */
export default function PasswordField({ shown, onShownChange, className = '', ...input }: Props) {
  return (
    <div className="relative">
      <input {...input} className={`field !pr-12 ${className}`} type={shown ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button type="button" aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown} onClick={() => onShownChange(!shown)}
        className="absolute right-1 top-1/2 -translate-y-1/2 size-10 rounded-full flex items-center justify-center text-muted">
        {shown ? <IconEyeOff size={20} /> : <IconEye size={20} />}
      </button>
    </div>
  )
}
