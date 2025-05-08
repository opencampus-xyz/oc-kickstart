import { config } from "@/config";
import Providers from "@/providers";
import "./globals.css";

export const metadata = {
  title: config.appTitle,
  icons: {
    icon: config.logoUrl,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
