import { useState } from "react"
import AuthLayout from "@/components/auth/AuthLayout"
import AuthHeader from "@/components/auth/AuthHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link } from "react-router-dom"
import { useRequestMagicLink } from "@/hooks/magic-auth/useMagicAuth"
import { Mail } from "lucide-react"

export default function MagicLinkLogin() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const mutation = useRequestMagicLink()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    await mutation.mutateAsync({ email: email.trim().toLowerCase() })
    setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-teal-50 p-4 rounded-full">
              <Mail className="size-8 text-teal-600" />
            </div>
          </div>
          <AuthHeader title="Check your email" subtitle={`We sent a magic link to ${email}`} />
          <p className="text-sm text-muted-foreground">
            Click the link in your email to sign in. The link expires in 15 minutes.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setSent(false)}
          >
            Try a different email
          </Button>
          <p className="text-sm text-muted-foreground">
            <Link className="underline" to="/login">Back to login</Link>
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthHeader title="Magic Link" subtitle="Sign in with your email — no password needed" />

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="magic-email">Email</Label>
          <Input
            id="magic-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Sending..." : "Send Magic Link"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        <Link className="underline" to="/login">Back to login</Link>
      </p>
    </AuthLayout>
  )
}
