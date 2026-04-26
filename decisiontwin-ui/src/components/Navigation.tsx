'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Users, FlaskConical, FileText, Database, BarChart3 } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Activity },
  { href: '/personas', label: 'Persona Explorer', icon: Users },
  { href: '/policy-lab', label: 'Policy Lab', icon: FlaskConical },
  { href: '/compare', label: 'Model Compare', icon: BarChart3 },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/ingest', label: 'Data Ingest', icon: Database },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center gap-1 h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}