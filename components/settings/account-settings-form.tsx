"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export function AccountSettingsForm({
  initialName,
  initialEmail,
}: {
  initialName: string
  initialEmail: string
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  async function saveProfile() {
    setSavingProfile(true)
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to save")
      toast.success("Profile updated")
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setSavingProfile(false)
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to update password")
      toast.success("Password updated")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile</CardTitle>
          <CardDescription>Update your name and email address.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security</CardTitle>
          <CardDescription>Change your account password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={changePassword} disabled={savingPassword || !currentPassword || !newPassword}>
              {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
