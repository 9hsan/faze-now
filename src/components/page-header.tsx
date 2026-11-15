import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-2 text-5xl md:text-6xl">{title}</h1>
      {children ? <div className="mt-3 max-w-2xl text-muted">{children}</div> : null}
    </header>
  );
}
