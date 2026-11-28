import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/library")({
  beforeLoad: () => {
    throw redirect({ to: "/homies", replace: true });
  },
  component: () => null,
});
