import React from "react"

type WelcomeBannerProps = {
  title: string
  subtitle: string
  children?: React.ReactNode
}

export default function WelcomeBanner({ title, subtitle, children }: WelcomeBannerProps) {
  return (
    <div className="rounded-lg p-6 text-white bg-gradient-to-r from-[#3B5BFF] to-[#2DD4BF]">
      <h2 className="text-xl font-bold mb-1">{title}</h2>
      <p className="text-[13px] opacity-85 mb-4">{subtitle}</p>
      {children}
    </div>
  )
}
