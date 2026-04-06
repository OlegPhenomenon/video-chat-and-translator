interface AuthLayoutProps {
  children: React.ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md border border-gray-200 rounded-md bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
