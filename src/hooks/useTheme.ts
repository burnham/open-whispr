import { useEffect, useState } from "react"

export type Theme = "dark" | "light" | "system"

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        // Check localStorage first
        if (typeof window !== "undefined") {
            const savedTheme = localStorage.getItem("ui-theme") as Theme
            if (savedTheme) return savedTheme
        }
        return "system"
    })

    useEffect(() => {
        const root = window.document.documentElement

        const applyTheme = (targetTheme: Theme) => {
            root.classList.remove("light", "dark")

            if (targetTheme === "system") {
                const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
                    .matches
                    ? "dark"
                    : "light"

                root.classList.add(systemTheme)
                return
            }

            root.classList.add(targetTheme)
        }

        applyTheme(theme)
        localStorage.setItem("ui-theme", theme)

        // Listener for system changes if in system mode
        if (theme === "system") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
            const handleChange = () => applyTheme("system")

            mediaQuery.addEventListener("change", handleChange)
            return () => mediaQuery.removeEventListener("change", handleChange)
        }
    }, [theme])

    return { theme, setTheme }
}
