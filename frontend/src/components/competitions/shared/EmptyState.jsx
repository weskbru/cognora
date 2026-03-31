import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionPath, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button className="bg-primary hover:bg-primary/90" onClick={onAction}>{actionLabel}</Button>
      )}
      {actionLabel && actionPath && !onAction && (
        <Link to={actionPath}>
          <Button className="bg-primary hover:bg-primary/90">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}