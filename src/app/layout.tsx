import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: { default: "FutGestor", template: "%s | FutGestor" }, description: "Seu baba organizado dentro e fora de campo.", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#07110d", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
