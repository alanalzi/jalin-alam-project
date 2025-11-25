"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { FcGoogle } from "react-icons/fc"
import Image from "next/image"
import Link from "next/link"
import styles from "./login.module.css" // ✅ import bener

export default function LoginPage() {

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.jpg"
            alt="Logo Jalin Alam"
            width={200}
            height={200}
            className="rounded-full shadow-md"
          />
        </div>

        {/* Judul */}
        <h1 className={styles.title}>Selamat Datang di Jalin Alam</h1>

        {/* Tombol Google */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className={styles.signin}
        >
          <FcGoogle className="w-6 h-6" />
          <span className="font-medium">Login dengan Google</span>
        </button>

      </div>
    </div>
  )
}
