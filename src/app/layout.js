import { Geist, Geist_Mono } from "next/font/google";
import './global.css';
// import "./tailwind.css";

/**
 * Import Google Fonts:
 * - Geist: primary sans-serif for headings/body
 * - Geist Mono: optional monospace for code or small UI elements
 * Using CSS variables to easily apply fonts globally.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Metadata for the app (title, description)
 */
export const metadata = {
  title: "Tomato Mozzarella Counter",
  description: "Track your Tomato & Mozzarella consumption in a fun way!",
};

/**
 * RootLayout: wraps the whole app
 * - Applies global fonts via CSS variables
 * - Sets `antialiased` for smoother text
 * - Keeps body background from globals.css
 */

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Tailwind Test</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

// export default function RootLayout({ children }) {
//   return (
//     <html lang="en">
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased text-gray-800 dark:text-gray-200`}
//       >
//         {/* Main content */}
//         {children}
//       </body>
//     </html>
//   );
// }
