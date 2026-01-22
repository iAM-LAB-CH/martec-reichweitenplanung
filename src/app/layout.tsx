import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";
import { ChangesProvider } from "@/lib/ChangesContext";

export const metadata: Metadata = {
  title: "Range Planning - Handlungsempfehlungen",
  description: "Sortiments- und Planungstool für Handlungsempfehlungen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
        />
      </head>
      <body style={{ margin: 0 }}>
        <ThemeProvider>
          <ChangesProvider>{children}</ChangesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
