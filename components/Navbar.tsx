import Link from "next/link"

const Navbar = () => {
  return (
    <div className="w-full h-[7vh] bg-gray-800 text-[#e2e1dc] flex items-center justify-between px-4 py-3 ">
      <Link href="/" className="text-[#e2e1dc] text-4xl font-bold">
        CadTube
      </Link>
      <div className="flex gap-5 mr-6">
        <Link href="/about" className="text-[#e2e1dc] text-lg hover:underline">
          About
        </Link>
        <Link href="https://github.com/harsh-upla/cadtube" className="text-[#e2e1dc] text-lg hover:underline">
          Github
        </Link>
      </div>
    </div>
  )
}

export default Navbar
