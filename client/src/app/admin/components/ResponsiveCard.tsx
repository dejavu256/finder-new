import React, { ReactNode } from 'react';

interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

/**
 * A responsive card component for admin pages
 * Ensures content fits properly on different screen sizes
 */
export default function ResponsiveCard({ children, className = '', title }: ResponsiveCardProps) {
  return (
    <div className={`admin-card bg-white rounded-lg shadow-md p-4 sm:p-6 ${className}`}>
      {title && <h2 className="text-xl font-semibold mb-4 text-gray-800 admin-text">{title}</h2>}
      {children}
    </div>
  );
} 