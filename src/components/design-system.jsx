import React from "react";

export function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

export function DecorativeIcon({ icon: Icon, ...props }) {
  return <Icon aria-hidden="true" focusable="false" {...props} />;
}

export function Avatar({ participant, small = false }) {
  return (
    <span className={classNames("avatar", `avatar-${participant.color}`, small && "avatar-small")}>
      {participant.initials}
    </span>
  );
}

export function SectionHeader({ icon: Icon, title, action, muted }) {
  return (
    <div className="section-header">
      <div className="section-title">
        <DecorativeIcon icon={Icon} size={18} />
        <div>
          <h2>{title}</h2>
          {muted ? <p>{muted}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function ActionButton({
  children,
  className,
  compact = false,
  needsReview = false,
  variant = "secondary",
  ...props
}) {
  return (
    <button
      className={classNames(
        `${variant}-action`,
        compact && "compact",
        needsReview && "needs-review",
        className,
      )}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectShell({ children, className, wide = false }) {
  return <div className={classNames("select-shell", wide && "wide", className)}>{children}</div>;
}

export function FieldError({ children, className, id }) {
  if (!children) {
    return null;
  }

  return (
    <p className={classNames("field-error", className)} id={id}>
      {children}
    </p>
  );
}

export function InlineStatus({ children, icon: Icon, tone = "success" }) {
  const toneClass = tone === "warning" ? "save-warning" : tone === "neutral" ? "save-neutral" : "";

  return (
    <span className={classNames("save-state", toneClass)}>
      <DecorativeIcon icon={Icon} size={16} />
      {children}
    </span>
  );
}
