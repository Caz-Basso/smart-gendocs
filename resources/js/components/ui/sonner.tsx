import type { CSSProperties } from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useAppearance } from "@/hooks/use-appearance"
import { useFlashToast } from "@/hooks/use-flash-toast"

export function Toaster(props: ToasterProps) {
  const { resolvedAppearance } = useAppearance()

  useFlashToast()

  return (
      <Sonner
          position="top-center"
          richColors
          expand
          visibleToasts={1}
          theme={resolvedAppearance}
          className="toaster group"
          toastOptions={{
              classNames: {
                  toast: `
                      rounded-xl
                      shadow-lg
                      border
                  `,
                  title: "font-semibold",
                  description: "text-muted-foreground",
              },
          }}
          icons={{
              success: (
                  <CircleCheckIcon className="size-5" />
              ),
              info: (
                  <InfoIcon className="size-5" />
              ),
              warning: (
                  <TriangleAlertIcon className="size-5" />
              ),
              error: (
                  <OctagonXIcon className="size-5" />
              ),
              loading: (
                  <Loader2Icon className="size-5 animate-spin" />
              ),
          }}
          style={
              {
                  "--normal-bg": "var(--popover)",
                  "--normal-text": "var(--popover-foreground)",
                  "--normal-border": "var(--border)",
                  "--border-radius": "calc(var(--radius) + 2px)",
              } as CSSProperties
          }
          {...props}
      />
  )
}
