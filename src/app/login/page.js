import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/lib/auth"
import LoginForm from "./LoginForm"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  
  // Jika sudah login, langsung tolak akses ke halaman login dan lempar ke dashboard dari sisi server.
  if (session) {
    redirect("/dashboard")
  }
  
  return <LoginForm />
}
