import { useTheme } from "../../hooks/useTheme";
import { Button } from "./button";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex bg-neutral-100 p-1 rounded-lg gap-1 dark:bg-[#3E362E]">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme("light")}
                className={`flex-1 gap-2 ${theme === "light"
                    ? "bg-white shadow-sm text-primary dark:bg-[#4E3F30] dark:text-primary-foreground"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-gray-400 dark:hover:text-gray-100"
                    }`}
            >
                <Sun size={16} />
                <span className="text-xs font-medium">Light</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme("dark")}
                className={`flex-1 gap-2 ${theme === "dark"
                    ? "bg-white shadow-sm text-primary dark:bg-[#4E3F30] dark:text-primary-foreground"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-gray-400 dark:hover:text-gray-100"
                    }`}
            >
                <Moon size={16} />
                <span className="text-xs font-medium">Dark</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme("system")}
                className={`flex-1 gap-2 ${theme === "system"
                    ? "bg-white shadow-sm text-primary dark:bg-[#4E3F30] dark:text-primary-foreground"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-gray-400 dark:hover:text-gray-100"
                    }`}
            >
                <Monitor size={16} />
                <span className="text-xs font-medium">System</span>
            </Button>
        </div>
    );
}
