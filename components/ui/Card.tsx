import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

function Card({ hover = true, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-lg border border-mk-border shadow-[var(--shadow-sm)]
        p-5
        ${hover
          ? "transition-[transform,box-shadow] duration-base ease-emphasis hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
          : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

function CardHeader({ className = "", children, ...props }: CardHeaderProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

interface CardIconProps extends HTMLAttributes<HTMLDivElement> {
  gradient?: "blue-violet" | "mint-blue";
}

function CardIcon({ gradient = "blue-violet", className = "", ...props }: CardIconProps) {
  const gradients = {
    "blue-violet": `linear-gradient(135deg, var(--color-mk-blue-500), var(--color-mk-violet-500))`,
    "mint-blue":   `linear-gradient(135deg, var(--color-mk-mint-500), var(--color-mk-blue-500))`,
  };
  return (
    <div
      className={`w-9 h-9 rounded-pill shrink-0 ${className}`}
      style={{ background: gradients[gradient] }}
      {...props}
    />
  );
}

interface CardTitleProps extends HTMLAttributes<HTMLDivElement> {}

function CardTitle({ className = "", children, ...props }: CardTitleProps) {
  return (
    <div className={`mk-h4 leading-snug text-mk-fg-1 tracking-tight ${className}`} {...props}>
      {children}
    </div>
  );
}

interface CardMetaProps extends HTMLAttributes<HTMLDivElement> {}

function CardMeta({ className = "", children, ...props }: CardMetaProps) {
  return (
    <div className={`mk-caption text-mk-fg-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

function CardBody({ className = "", children, ...props }: CardBodyProps) {
  return (
    <div className={`mk-body-sm text-mk-fg-2 leading-relaxed ${className}`} {...props}>
      {children}
    </div>
  );
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

function CardFooter({ className = "", children, ...props }: CardFooterProps) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`} {...props}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardIcon, CardTitle, CardMeta, CardBody, CardFooter };
export type { CardProps };
