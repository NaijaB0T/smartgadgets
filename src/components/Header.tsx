import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/contact", label: "Contact" },
  { href: "/admin", label: "Admin" },
];

export function Header({ currentPath }: { currentPath: string }) {
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6 mx-6 h-16">
      <a href="/" className="text-sm leading-none text-foreground">
        SmartGadgets
      </a>
      {links.map((link) => (
        <a
          className={cn(
            "text-sm font-medium leading-none text-foreground",
            currentPath === link.href
              ? "text-foreground"
              : "text-muted-foreground",
          )}
          href={link.href}
          aria-current={currentPath === link.href ? "page" : undefined}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
