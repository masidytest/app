import { SettingsNav } from "@/components/settings-nav"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-8 py-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, billing, and API access.
        </p>
      </div>
      <SettingsNav />
      <div className="mt-6">{children}</div>
    </div>
  )
}
