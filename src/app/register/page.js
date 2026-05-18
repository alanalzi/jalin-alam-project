"use client"

import { useState } from "react"
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link"

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  })

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log("Data registrasi:", form)
    toast.success("Registrasi berhasil! Silakan login.")
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <h1 className="register-title">Buat Akun Baru </h1>

        <form onSubmit={handleSubmit} className="register-form">
          <label>
            Nama Lengkap
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <button type="submit" className="register-button">
            Daftar
          </button>
        </form>

        <p className="register-footer">
          Sudah punya akun?{" "}
          <Link href="/" className="login-link">Login di sini</Link>
        </p>
      </div>

    </div>
  )
}
