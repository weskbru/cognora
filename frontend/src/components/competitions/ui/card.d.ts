import * as React from 'react';

type DivProps = React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>;

export const Card: React.ForwardRefExoticComponent<DivProps>;
export const CardHeader: React.ForwardRefExoticComponent<DivProps>;
export const CardFooter: React.ForwardRefExoticComponent<DivProps>;
export const CardTitle: React.ForwardRefExoticComponent<DivProps>;
export const CardDescription: React.ForwardRefExoticComponent<DivProps>;
export const CardContent: React.ForwardRefExoticComponent<DivProps>;
