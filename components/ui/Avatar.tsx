interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

const SIZE = {
  sm: "w-7 h-7 mk-caption",
  md: "w-9 h-9 mk-body-sm",
  lg: "w-12 h-12 mk-h4",
};

export function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const h = hashName(name);
  const hue1 = h % 360;
  const hue2 = (hue1 + 50) % 360;
  return (
    <div
      className={`${SIZE[size]} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue1} 60% 55%), hsl(${hue2} 65% 45%))` }}
    >
      {initials}
    </div>
  );
}
