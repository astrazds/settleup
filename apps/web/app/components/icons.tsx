import type { ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children">;

function IconFrame({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      {children}
    </svg>
  );
}

const strokeProps = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
};

export function LogoIcon(props: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="32"
      viewBox="0 0 32 32"
      width="32"
      {...props}
    >
      <path
        d="M5 1H31V27L27 31H1V5Z"
        fill="var(--logo-field, #0e7c7b)"
      />
      <path
        d="M5 5H27V11H13L10 14H5ZM27 17V27H5V21H19L22 18H27Z"
        fill="var(--logo-paper, #f2e8d1)"
      />
      <path
        d="M22 12H27V16H22Z"
        fill="var(--logo-remainder, #e0b12e)"
      />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M12 5v14M5 12h14" {...strokeProps} />
    </IconFrame>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M12 16V4m0 0L8 8m4-4 4 4" {...strokeProps} />
      <path d="M6 11v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7" {...strokeProps} />
    </IconFrame>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Z" {...strokeProps} />
      <path d="M9 8h6M9 12h6" {...strokeProps} />
    </IconFrame>
  );
}

export function SettleIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M5 8h13m0 0-3-3m3 3-3 3M19 16H6m0 0 3 3m-3-3 3-3" {...strokeProps} />
    </IconFrame>
  );
}

export function PeopleIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 11a3 3 0 0 0 0-6M19 14a4 4 0 0 1 2 3.5V20" {...strokeProps} />
    </IconFrame>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" />
    </IconFrame>
  );
}

export function EditIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M13.5 6.5 17.5 10.5M4 20l4.6-1 10.3-10.3a2 2 0 0 0-2.8-2.8L5.8 16.2 4 20Z" {...strokeProps} />
    </IconFrame>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" {...strokeProps} />
    </IconFrame>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m6 6 12 12M18 6 6 18" {...strokeProps} />
    </IconFrame>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="m5 12 4.5 4.5L19 7" {...strokeProps} />
    </IconFrame>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" {...strokeProps} />
      <path d="M8 3v4M16 3v4M3 10h18" {...strokeProps} />
    </IconFrame>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <IconFrame {...props}>
      <path d="M12 9v4m0 4h.01M10.3 4.3 2.9 17.1A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-2.9L13.7 4.3a2 2 0 0 0-3.4 0Z" {...strokeProps} />
    </IconFrame>
  );
}
