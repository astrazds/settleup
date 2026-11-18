import { useId } from "react";
import { Link, type LinkProps } from "react-router";

type RouteDialogLinkProps = Pick<
  LinkProps,
  "aria-label" | "children" | "className" | "title" | "to"
>;

export function RouteDialogLink(props: RouteDialogLinkProps) {
  const openerId = useId();

  return (
    <Link {...props} id={openerId} state={{ routeDialogOpenerId: openerId }} />
  );
}
