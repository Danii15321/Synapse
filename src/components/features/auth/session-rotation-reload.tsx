"use client"

import { useEffect } from "react"

export default function SessionRotationReload() {
  useEffect(() => {
    window.location.replace(
      "/compte?section=confidentialite&passwordChanged=1",
    )
  }, [])

  return null
}
