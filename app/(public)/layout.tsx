import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNavbar />
      <main>{children}</main>
      <PublicFooter />
    </>
  )
}
