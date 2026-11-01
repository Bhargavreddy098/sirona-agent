import { type ComponentProps } from "solid-js"

export const Mark = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 16 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="8 2 10.06 6.17 14.67 6.85 11.33 10.09 12.12 14.68 8 12.51 3.88 14.68 4.67 10.09 1.33 6.85 5.94 6.17 8 2" fill="var(--icon-strong-base, currentColor)" />
    </svg>
  )
}

export const Splash = (props: Pick<ComponentProps<"svg">, "ref" | "class">) => {
  return (
    <svg
      ref={props.ref}
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="40 10 50.3 30.85 73.35 34.25 56.65 50.45 60.6 73.4 40 62.55 19.4 73.4 23.35 50.45 6.65 34.25 29.7 30.85 40 10" fill="var(--icon-strong-base, currentColor)" />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 234 42"
      fill="none"
      classList={{ [props.class ?? ""]: !!props.class }}
    >
      <text
        x="117"
        y="29"
        text-anchor="middle"
        fill="currentColor"
        class="opacity-[0.24]"
        style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif; font-size: 28px; font-weight: 800; letter-spacing: 0.32em;"
      >
        SIRONA
      </text>
    </svg>
  )
}
