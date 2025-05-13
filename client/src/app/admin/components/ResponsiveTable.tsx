import React, { ReactNode } from 'react';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * A responsive table wrapper component for admin pages
 * Ensures tables are scrollable horizontally on smaller screens
 */
export default function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className={`admin-table ${className}`}>
      {children}
    </div>
  );
} 