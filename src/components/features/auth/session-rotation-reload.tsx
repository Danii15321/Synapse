"use client"

import { useEffect } from "react"

export default function SessionRotationReload() {
  useEffect(() => {
    window.location.replace("/compte?passwordChanged=1")
  }, [])

  return null
}
