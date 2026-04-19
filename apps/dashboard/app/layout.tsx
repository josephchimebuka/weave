import "./globals.css";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "Weave Dashboard",
  description: "Manage your Checkout instances",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900 flex">
        <Sidebar />
        <div className="flex-1 ml-64 p-8">
          {children}
        </div>
      </body>
    </html>
  );
}
