import React from "react";

export function UserAvatar({
  src,
  name,
  size = 36,
}: {
  src?: string | null | undefined;
  name?: string | null | undefined;
  size?: number;
}) {
  const initials = (name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return src ? (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      style={{ width: size, height: size }}
      className="rounded-full object-cover ring-2 ring-accent/60 shrink-0"
    />
  ) : (
    <span
      style={{ width: size, height: size }}
      className="grid place-items-center rounded-full bg-primary font-display text-primary-foreground ring-2 ring-accent/60 shrink-0 select-none text-xs font-semibold"
    >
      {initials}
    </span>
  );
}
