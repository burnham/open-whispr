import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export interface SidebarItem<T extends string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarModalProps<T extends string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  sidebarItems: SidebarItem<T>[];
  activeSection: T;
  onSectionChange: (section: T) => void;
  children: React.ReactNode;
  sidebarWidth?: string;
}

export default function SidebarModal<T extends string>({
  open,
  onOpenChange,
  title,
  sidebarItems,
  activeSection,
  onSectionChange,
  children,
  sidebarWidth = "w-72",
}: SidebarModalProps<T>) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 max-h-[90vh] w-[90vw] max-w-5xl translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white dark:bg-[#292420] p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] overflow-hidden border dark:border-border">
          <div className="relative h-full max-h-[90vh] overflow-hidden">
            {/* Close button removed per user request (redundant with window controls) */}

            <div className="flex h-[90vh]">
              {/* Sidebar */}
              <div
                className={`${sidebarWidth} bg-gray-50 dark:bg-[#3C2E24] border-r border-gray-200 dark:border-border p-4`}
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-[#FEFEEB] mb-4 px-2">
                  {title}
                </h2>
                <nav className="space-y-1">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSectionChange(item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm rounded-lg transition-all duration-200 ${activeSection === item.id
                          ? "bg-white dark:bg-[#292420] text-gray-900 dark:text-[#FEFEEB] shadow-sm border border-gray-200 dark:border-border"
                          : "text-gray-600 dark:text-[#FEFEEB]/70 hover:text-gray-900 dark:hover:text-[#FEFEEB] hover:bg-gray-100 dark:hover:bg-[#4E3F30]"
                          }`}
                      >
                        <Icon
                          className={`h-4 w-4 flex-shrink-0 ${activeSection === item.id ? "text-indigo-600 dark:text-[#0CA5B0]" : ""
                            }`}
                        />
                        <span className="font-medium flex-1">{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto bg-white dark:bg-[#292420]">
                <div className="p-8">
                  <div className="max-w-3xl">{children}</div>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
