import type { ReactNode } from "react";
import { StatusGuard } from "@/providers/StatusGuard";

export default function CompleteProfileLayout({ children }: { children: ReactNode }) {
  return <StatusGuard>{children}</StatusGuard>;
}
