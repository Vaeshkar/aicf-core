import './globals.css'

export const metadata = {
  title: 'TaskMaster Pro',
  description: 'Modern todo app',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
