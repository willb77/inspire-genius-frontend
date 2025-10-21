import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'

export type PasswordFieldProps = React.ComponentProps<typeof Input> & {
  error?: string
}

export default function PasswordField({ error, ...inputProps }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          {...inputProps}
          className={(inputProps.className ? inputProps.className + ' ' : '') + 'pl-10 pr-10'}
        />
        <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Button
          variant="ghost"
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {error ? <p className="text-red-500 text-sm">{error}</p> : null}
    </div>
  )
}
