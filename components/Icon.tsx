export type IconName =
  | "home"
  | "shirt"
  | "chart"
  | "trophy"
  | "users"
  | "star"
  | "info"
  | "user"
  | "share"
  | "logout";

function IconPath({ icon }: { icon: IconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (icon) {
    case "home":
      return <path d="M3 11 L12 3 L21 11 M5 10 V21 H19 V10 M10 21 V14 H14 V21" {...common} />;
    case "shirt":
      return (
        <path
          d="M8 3 L12 5 L16 3 L20 6 L18 9 L16 8 L16 20 L8 20 L8 8 L6 9 L4 6 Z"
          {...common}
        />
      );
    case "chart":
      return <path d="M4 18 L9 12 L13 15 L20 6 M14 6 h6 v6" {...common} />;
    case "trophy":
      return (
        <path
          d="M7 4 h10 v5 a5 5 0 0 1 -10 0 Z M7 5 H3 v2 a4 4 0 0 0 4 4 M17 5 h4 v2 a4 4 0 0 1 -4 4 M12 14 v4 M9 20 h6 M9 18 h6"
          {...common}
        />
      );
    case "users":
      return (
        <path
          d="M8 8 a3 3 0 1 0 0 -6 a3 3 0 0 0 0 6 Z M2 20 c0 -4 3 -6 6 -6 s6 2 6 6 M16 8 a2.5 2.5 0 1 0 0 -5 M17 9 c2.2 0.4 4 2.1 4 5"
          {...common}
        />
      );
    case "star":
      return (
        <path
          d="M12 3 l2.6 5.6 6.1 0.7 -4.5 4.2 1.2 6 -5.4 -3 -5.4 3 1.2 -6 -4.5 -4.2 6.1 -0.7 Z"
          {...common}
        />
      );
    case "info":
      return <path d="M12 8 h.01 M11 12 h1 v5 h1 M12 21 a9 9 0 1 0 0 -18 a9 9 0 0 0 0 18 Z" {...common} />;
    case "user":
      return (
        <path
          d="M12 12 a4 4 0 1 0 0 -8 a4 4 0 0 0 0 8 Z M4 20 c0 -4.4 3.6 -7 8 -7 s8 2.6 8 7"
          {...common}
        />
      );
    case "share":
      return (
        <path
          d="M18 8 a2.5 2.5 0 1 0 0 -5 a2.5 2.5 0 0 0 0 5 Z M6 15 a2.5 2.5 0 1 0 0 -5 a2.5 2.5 0 0 0 0 5 Z M18 21 a2.5 2.5 0 1 0 0 -5 a2.5 2.5 0 0 0 0 5 Z M8.2 13.4 L15.8 9.1 M8.2 14.6 L15.8 18.9"
          {...common}
        />
      );
    case "logout":
      return (
        <path
          d="M9 21 H5 a2 2 0 0 1 -2 -2 V5 a2 2 0 0 1 2 -2 h4 M16 17 l5 -5 -5 -5 M21 12 H9"
          {...common}
        />
      );
  }
}

export function Icon({
  name,
  size = 16,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <IconPath icon={name} />
    </svg>
  );
}
